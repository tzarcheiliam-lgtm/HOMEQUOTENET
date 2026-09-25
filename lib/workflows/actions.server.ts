import 'server-only';
import { createHmac } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { processLeadEmails, leadAlertRecipients } from '@/lib/leads/notify';
import { WORKFLOW_ACTIONS, WORKFLOW_ACTION_CONFIG_SCHEMAS, type WorkflowAction, type WorkflowActionResult, type WorkflowError } from './actions';
import type { WorkflowEvent } from './events';
import type { WorkflowEvaluationContext } from './planner';
import { renderWorkflowTemplate as renderTemplate } from './merge';

type WorkflowDb=ReturnType<typeof createAdminClient>;
interface RuntimeActionContext { action:WorkflowAction; run:{id:string;workflowId:string;contractorId:string|null;leadId:string|null}; stepRun:{id:string;stepKey:string;attempt:number;idempotencyKey:string}; event:WorkflowEvent; now:Date }
export interface ExecuteWorkflowActionInput { db:WorkflowDb; context:RuntimeActionContext; values:WorkflowEvaluationContext }
const wfError=(code:string,message:string,kind:'temporary'|'permanent'):WorkflowError=>({code,message,kind,retryable:kind==='temporary'});
const temporary=(code:string,message:string):WorkflowActionResult=>({outcome:'temporary_failure',error:wfError(code,message,'temporary')});
const permanent=(code:string,message:string):WorkflowActionResult=>({outcome:'permanent_failure',error:wfError(code,message,'permanent')});
const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const textHtml=(value:string)=>`<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${escapeHtml(value)}</div>`;
const renderWorkflowTemplate=(template:string,values:WorkflowEvaluationContext)=>renderTemplate(template,values,{phone:process.env.HOMEQUOTE_PHONE,siteUrl:process.env.NEXT_PUBLIC_SITE_URL});
async function recipientEmails(db:WorkflowDb,audience:{kind:'lead'}|{kind:'lead_alert_team'}|{kind:'recipients';recipientIds:string[]},values:WorkflowEvaluationContext){
  if(audience.kind==='lead'){const email=values.lead?.email;return typeof email==='string'&&email.trim()?[email.trim().toLowerCase()]:[]}
  if(audience.kind==='lead_alert_team') return leadAlertRecipients();
  const {data,error}=await db.from('lead_recipients').select('email').in('id',audience.recipientIds).eq('is_active',true);
  if(error) throw new Error('recipient lookup failed');
  return Array.from(new Set((data??[]).map((row:{email:string})=>row.email.trim().toLowerCase()).filter(Boolean)));
}
async function deliverWorkflowEmail(input:ExecuteWorkflowActionInput,audience:{kind:'lead'}|{kind:'lead_alert_team'}|{kind:'recipients';recipientIds:string[]},subjectTemplate:string,messageTemplate:string):Promise<WorkflowActionResult>{
  const leadId=input.context.run.leadId;if(!leadId)return permanent('missing_lead','Workflow email needs a lead');
  let recipients:string[];try{recipients=await recipientEmails(input.db,audience,input.values)}catch{return temporary('recipient_lookup_failed','Could not load workflow email recipients')}
  if(!recipients.length)return {outcome:'skipped',reason:'missing_contact'};
  const subject=renderWorkflowTemplate(subjectTemplate,input.values),message=renderWorkflowTemplate(messageTemplate,input.values);
  for(const recipient of recipients){const {error}=await input.db.from('lead_email_deliveries').insert({lead_id:leadId,kind:'workflow_email',workflow_step_run_id:input.context.stepRun.id,recipient_email:recipient,subject,message,html_message:textHtml(message)});if(error&&error.code!=='23505')return temporary('email_queue_failed','Could not queue workflow email')}
  const {data:deliveries,error:loadError}=await input.db.from('lead_email_deliveries').select('id,status,provider_message_id').eq('workflow_step_run_id',input.context.stepRun.id);
  if(loadError||!deliveries?.length)return temporary('email_queue_failed','Could not load queued workflow email');
  const ids=deliveries.filter((row:{status:string})=>row.status!=='sent').map((row:{id:string})=>row.id);if(ids.length)await processLeadEmails({ids,db:input.db});
  const {data:finalRows,error:finalError}=await input.db.from('lead_email_deliveries').select('status,provider_message_id').eq('workflow_step_run_id',input.context.stepRun.id);
  if(finalError||!finalRows?.length||finalRows.some((row:{status:string})=>row.status!=='sent'))return temporary('email_delivery_failed','Workflow email is queued for retry');
  return {outcome:'success',output:{recipientCount:finalRows.length},provider:{provider:'gmail',providerMessageId:finalRows[0].provider_message_id??undefined}};
}
function safeWebhookUrl(raw:string){const url=new URL(raw),host=url.hostname.toLowerCase();if(url.protocol!=='https:'||url.username||url.password||host==='localhost'||host.endsWith('.local')||/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host))return null;const m=host.match(/^172\.(\d{1,3})\./);return m&&Number(m[1])>=16&&Number(m[1])<=31?null:url}
export async function executeWorkflowAction(input:ExecuteWorkflowActionInput):Promise<WorkflowActionResult>{
  const {action}=input.context,definition=WORKFLOW_ACTIONS[action.type];
  if(definition.availability!=='ready')return {outcome:'skipped',reason:'unavailable_action'};
  if(definition.requiresConsent&&input.values.lead?.consent_granted!==true)return {outcome:'skipped',reason:'no_consent'};
  switch(action.type){
    case 'send_email':{const c=WORKFLOW_ACTION_CONFIG_SCHEMAS.send_email.parse(action.config);return deliverWorkflowEmail(input,c.to,c.subject,c.body)}
    case 'notify_team':{const c=WORKFLOW_ACTION_CONFIG_SCHEMAS.notify_team.parse(action.config);return deliverWorkflowEmail(input,c.audience,c.subject,c.message)}
    case 'change_pipeline_stage':{const c=WORKFLOW_ACTION_CONFIG_SCHEMAS.change_pipeline_stage.parse(action.config);const assignmentId=typeof input.values.assignment?.id==='string'?input.values.assignment.id:null;if(c.pipeline==='assignment'&&!assignmentId)return {outcome:'skipped',reason:'missing_assignment'};const {error}=await input.db.rpc('workflow_change_pipeline_stage',{p_pipeline:c.pipeline,p_lead:input.context.run.leadId,p_assignment:assignmentId,p_status:c.status,p_causation:input.context.event.id,p_correlation:input.context.event.correlationId??input.context.event.id});return error?permanent('pipeline_update_failed','Could not change pipeline stage'):{outcome:'success'}}
    case 'create_calendar_event':{const c=WORKFLOW_ACTION_CONFIG_SCHEMAS.create_calendar_event.parse(action.config);const assignmentId=typeof input.values.assignment?.id==='string'?input.values.assignment.id:null;if(!assignmentId||!input.context.run.leadId)return {outcome:'skipped',reason:'missing_assignment'};const {data,error}=await input.db.rpc('workflow_create_appointment',{p_lead:input.context.run.leadId,p_assignment:assignmentId,p_scheduled_at:new Date(input.context.now.getTime()+c.startsInMinutes*60000).toISOString(),p_location:c.location??null,p_notes:c.notes?renderWorkflowTemplate(c.notes,input.values):null,p_causation:input.context.event.id,p_correlation:input.context.event.correlationId??input.context.event.id});return error?permanent('appointment_create_failed','Could not create appointment'):{outcome:'success',output:{appointmentId:data}}}
    case 'send_webhook':{const c=WORKFLOW_ACTION_CONFIG_SCHEMAS.send_webhook.parse(action.config),url=safeWebhookUrl(c.url);if(!url)return permanent('invalid_webhook_url','Webhook URL is not allowed');let secret:string|null=null;if(c.signingIntegrationId){const {data}=await input.db.from('integrations').select('secret').eq('id',c.signingIntegrationId).eq('is_enabled',true).maybeSingle();secret=data?.secret??null;if(!secret)return permanent('missing_signing_secret','Webhook signing integration is unavailable')}
      const payload:Record<string,unknown>={eventId:input.context.event.id,eventType:input.context.event.type,runId:input.context.run.id,leadId:input.context.run.leadId,entityType:input.context.event.entityType,entityId:input.context.event.entityId};if(c.includeLeadContact&&input.values.lead)payload.contact={firstName:input.values.lead.first_name??null,lastName:input.values.lead.last_name??null,email:input.values.lead.email??null,phone:input.values.lead.phone??null};const body=JSON.stringify(payload),headers:Record<string,string>={'Content-Type':'application/json','X-HomeQuote-Event-Id':input.context.stepRun.idempotencyKey};if(secret)headers['X-HomeQuote-Signature']=createHmac('sha256',secret).update(body).digest('hex');try{const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers,body});if(response.ok)return {outcome:'success',provider:{provider:'webhook',statusCode:response.status}};const retry=response.status===429||response.status>=500;return {outcome:retry?'temporary_failure':'permanent_failure',error:wfError(retry?'webhook_unavailable':'webhook_rejected',`Webhook returned HTTP ${response.status}`,retry?'temporary':'permanent'),provider:{provider:'webhook',statusCode:response.status}}}catch{return temporary('webhook_unavailable','Webhook request failed')}}
    case 'wait':case 'stop_workflow':return permanent('control_action_dispatched','Control actions are handled by the workflow engine');
    case 'send_sms':case 'assign_user':case 'create_task':case 'add_tag':case 'remove_tag':return {outcome:'skipped',reason:'unavailable_action'};
  }
}
