/**
 * Every automation HomeQuote runs: anything that happens without a person clicking at that moment. Pure, so the
 * Automations map (/app/automations), the Claude connector and tests share one list. Live state (on/off, last run,
 * counts) is added by lib/automations/status.server.ts.
 *
 * Adding an automation? Add an entry here. tests/automations-map.test.tsx checks that every scheduled job and every
 * job inside the 5-minute tick is listed.
 */
export type AutomationArea = 'scheduler' | 'texting' | 'leads' | 'workflows' | 'meta' | 'calls' | 'calendar_docs' | 'payments' | 'claude';
export type AutomationTrigger = 'schedule' | 'event' | 'db_trigger' | 'webhook' | 'always_on';

export const AREA_LABELS: Record<AutomationArea, string> = {
  scheduler: 'Schedulers',
  texting: 'Texting',
  leads: 'Leads & alerts',
  workflows: 'Workflow engine',
  meta: 'Meta (Facebook / Instagram)',
  calls: 'Calls',
  calendar_docs: 'Calendar, documents & quizzes',
  payments: 'Payments',
  claude: 'Claude connector',
};
export const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  schedule: 'On a schedule', event: 'When something happens', db_trigger: 'Database rule', webhook: 'Incoming webhook', always_on: 'Always running',
};

/** Where "last ran" and "how many in 7 days" come from. */
export interface AutomationRecord {
  table: string;
  /** Timestamp column. */
  at: string;
  /** Extra filters, e.g. only outbound texts. */
  where?: { col: string; op: 'eq' | 'in' | 'not_null'; value?: string | boolean | string[] }[];
  /** Rows in these states (last 7 days) mean something needs a look. */
  failed?: { col: string; values: string[] };
  /** What one row is, for "12 texts in 7 days". */
  unit: string;
}

export interface Automation {
  id: string;
  area: AutomationArea;
  name: string;
  trigger: AutomationTrigger;
  /** When it runs, in plain words. */
  when: string;
  /** What it does, in plain words. */
  what: string;
  settingsHref?: string;
  /** Environment variables that must all be set (only presence is ever checked or shown). */
  requiresEnv?: string[];
  record?: AutomationRecord;
  /** A known limitation shown on the card. */
  gap?: string;
  /** Technical pointer for whoever maintains it. */
  file: string;
}

const out = (unit: string): AutomationRecord => ({ table: 'sms_messages', at: 'created_at', where: [{ col: 'direction', op: 'eq', value: 'out' }], failed: { col: 'status', values: ['failed'] }, unit });

export const AUTOMATIONS: Automation[] = [
  // ---------------------------------------------------------------- schedulers
  { id: 'workflow_tick', area: 'scheduler', name: 'Main scheduler (every 5 minutes)', trigger: 'schedule', when: 'Every 5 minutes (GitHub Actions: Workflow tick)',
    what: 'Runs workflows that are due, sends waiting notifications, reminder and follow-up texts, the texting health check, calendar and signing upkeep, and quiz-lead retries.',
    requiresEnv: ['WORKFLOW_CRON_SECRET'], record: { table: 'automation_runs', at: 'started_at', where: [{ col: 'job', op: 'eq', value: 'workflow_tick' }], failed: { col: 'ok', values: ['false'] }, unit: 'run' },
    file: '.github/workflows/workflow-tick.yml → app/api/workflows/tick/route.ts' },
  { id: 'meta_tick', area: 'scheduler', name: 'Meta scheduler (every 5 minutes)', trigger: 'schedule', when: 'Every 5 minutes (GitHub Actions: Meta tick)',
    what: 'Sends queued conversion events to Meta and refreshes ad reporting every 6 hours.',
    requiresEnv: ['META_TICK_SECRET'], record: { table: 'automation_runs', at: 'started_at', where: [{ col: 'job', op: 'eq', value: 'meta_tick' }], failed: { col: 'ok', values: ['false'] }, unit: 'run' },
    file: '.github/workflows/meta-tick.yml → app/api/meta/tick/route.ts' },
  { id: 'meta_studio_tick', area: 'scheduler', name: 'Meta Ads Studio scheduler (hourly)', trigger: 'schedule', when: 'Every hour at :17 (GitHub Actions: Meta Studio tick)',
    what: 'Reads live campaign state from Meta and checks your ad rules. With live changes off it only records suggestions.',
    requiresEnv: ['META_TICK_SECRET'], record: { table: 'automation_runs', at: 'started_at', where: [{ col: 'job', op: 'eq', value: 'meta_studio_tick' }], failed: { col: 'ok', values: ['false'] }, unit: 'run' },
    settingsHref: '/app/meta-ads/rules', file: '.github/workflows/meta-studio-tick.yml → app/api/meta/studio-tick/route.ts' },
  { id: 'ai_calling_tick', area: 'scheduler', name: 'AI calling scheduler (every 5 minutes)', trigger: 'schedule', when: 'Every 5 minutes (GitHub Actions: AI calling tick)',
    what: 'Dials AI calls that are due, only when AI calling is switched on.',
    requiresEnv: ['AI_CALLING_CRON_SECRET'], record: { table: 'automation_runs', at: 'started_at', where: [{ col: 'job', op: 'eq', value: 'ai_calling_tick' }], failed: { col: 'ok', values: ['false'] }, unit: 'run' },
    settingsHref: '/app/ai-calls', file: '.github/workflows/ai-calling-tick.yml → app/api/ai-calling/tick/route.ts' },

  // ---------------------------------------------------------------- texting
  { id: 'sms_bridge', area: 'texting', name: 'Mac texting bridge', trigger: 'always_on', when: 'Always, on your Mac (checks in every few seconds)',
    what: 'Sends queued texts through Messages on your Mac and passes replies back to HomeQuote.',
    requiresEnv: ['SMS_BRIDGE_TOKEN'], record: { ...out('text sent'), where: [{ col: 'direction', op: 'eq', value: 'out' }, { col: 'status', op: 'eq', value: 'sent' }], failed: undefined }, settingsHref: '/app/texting',
    file: 'scripts/mac-sms-bridge/bridge.mjs, app/api/sms/bridge/*' },
  { id: 'sms_first_text', area: 'texting', name: 'First text to new leads', trigger: 'event', when: 'A homeowner submits a funnel or the estimator (inside texting hours)',
    what: 'Texts the new lead right away asking whether they want a call or to keep texting.',
    requiresEnv: ['SMS_BRIDGE_TOKEN'], record: { table: 'sms_conversations', at: 'created_at', where: [{ col: 'lead_id', op: 'not_null' }], unit: 'conversation started' }, settingsHref: '/app/texting',
    file: 'lib/sms/service.ts startSmsForLead' },
  { id: 'sms_meta_first_text', area: 'texting', name: 'First text to Meta Instant Form leads', trigger: 'event', when: 'A lead arrives from a Facebook / Instagram Instant Form',
    what: 'Same first text for Meta form leads.', requiresEnv: ['SMS_BRIDGE_TOKEN', 'SMS_META_LEADS'], settingsHref: '/app/texting',
    file: 'lib/integrations/intake.ts → startSmsForMetaLead' },
  { id: 'sms_consented_first_text', area: 'texting', name: 'First text to leads from other sources', trigger: 'event', when: 'A lead arrives from any other connected source (webhook, other ad platforms) with text consent',
    what: 'Same first text, assistant and follow-ups; never sent without consent.', requiresEnv: ['SMS_BRIDGE_TOKEN'], settingsHref: '/app/texting',
    file: 'lib/integrations/intake.ts → startSmsForConsentedLead' },
  { id: 'sms_ai_replies', area: 'texting', name: 'AI text replies', trigger: 'event', when: 'A lead texts back',
    what: 'Answers in a natural way, qualifies them, books a call or visit, honors STOP, and hands off to you when unsure.',
    requiresEnv: ['SMS_BRIDGE_TOKEN', 'ANTHROPIC_API_KEY'], record: { ...out('AI reply'), where: [{ col: 'direction', op: 'eq', value: 'out' }, { col: 'ai', op: 'eq', value: true }] }, settingsHref: '/app/texting',
    file: 'lib/sms/service.ts handleInbound, lib/sms/agent.ts' },
  { id: 'sms_reminders_contractor', area: 'texting', name: 'Sales meeting reminder texts', trigger: 'schedule', when: 'Booked, 4 days before, day before (YES / R), 8 AM the day of, 2 hours before, after a no-show',
    what: 'Texts contractors about meetings you booked with them. YES confirms the meeting, R alerts you to reschedule.',
    record: { table: 'sms_reminders', at: 'created_at', where: [{ col: 'kind', op: 'eq', value: 'sales_meeting' }, { col: 'status', op: 'eq', value: 'queued' }], unit: 'reminder' }, settingsHref: '/app/texting',
    file: 'lib/sms/reminders.ts, lib/sms/reminder-replies.ts' },
  { id: 'sms_unconfirmed_alert', area: 'texting', name: '“Not confirmed” meeting alert', trigger: 'schedule', when: '8 AM on the meeting day, if they never replied YES',
    what: 'Pushes you (and whoever booked it) to call the contractor before the meeting.',
    record: { table: 'sms_reminders', at: 'created_at', where: [{ col: 'step', op: 'eq', value: 'unconfirmed_alert' }], unit: 'alert' }, settingsHref: '/app/texting', file: 'lib/sms/reminders.ts' },
  { id: 'sms_reminders_homeowner', area: 'texting', name: 'Homeowner appointment reminder texts', trigger: 'schedule', when: 'Same schedule as sales meetings, for estimate visits and calls booked on a HomeQuote calendar',
    what: 'Reminds homeowners about their visit or booked call, sent as the contractor (a call also says who calls and from which number). YES is noted, R hands the conversation to a person. The only reminder texts for calendar bookings.',
    record: { table: 'sms_reminders', at: 'created_at', where: [{ col: 'kind', op: 'eq', value: 'home_appointment' }, { col: 'status', op: 'eq', value: 'queued' }], unit: 'reminder' }, settingsHref: '/app/texting', file: 'lib/sms/reminders.ts' },
  { id: 'sms_followups', area: 'texting', name: 'Follow-ups when a homeowner doesn’t reply', trigger: 'schedule', when: 'Day 1, 3 and 7 after the first text (editable), or a nudge if they go quiet; then every 3 days (editable) until they reply or text STOP',
    what: 'Keeps trying until they reply, book or text STOP: a different line each time, often with real open times, ending “Text STOP to stop these.” With keep-going off, closes the request after the last follow-up.',
    record: { table: 'sms_reminders', at: 'created_at', where: [{ col: 'kind', op: 'eq', value: 'no_reply' }, { col: 'status', op: 'eq', value: 'queued' }], unit: 'follow-up' }, settingsHref: '/app/texting', file: 'lib/sms/reminders.ts' },
  { id: 'sms_rebook', area: 'texting', name: 'Re-offer times when a booking stalls', trigger: 'schedule', when: 'A day and three days after a lead was handed to you to book a time, if still not booked',
    what: 'Texts three real open times and lets the assistant book their pick. Skipped once someone texts or logs a call with them.',
    record: { table: 'sms_reminders', at: 'created_at', where: [{ col: 'step', op: 'in', value: ['rebook_1', 'rebook_2'] }, { col: 'status', op: 'eq', value: 'queued' }], unit: 're-offer' }, settingsHref: '/app/texting', file: 'lib/sms/reminders.ts' },
  { id: 'sms_bridge_alert', area: 'texting', name: 'Texting-down alert', trigger: 'schedule', when: 'Every 5 minutes; alerts when texts wait 5+ minutes (at most hourly)',
    what: 'Pushes and emails you when the Mac bridge stops sending, and again when it’s back.', settingsHref: '/app/texting', file: 'lib/sms/health.ts' },

  // ---------------------------------------------------------------- leads & alerts
  { id: 'lead_alert_email', area: 'leads', name: 'New-lead alert email', trigger: 'db_trigger', when: 'Every new (or duplicate) lead that comes in',
    what: 'Emails the lead alert list with the lead’s details.', requiresEnv: ['LEAD_ALERT_EMAILS'],
    record: { table: 'lead_email_deliveries', at: 'created_at', where: [{ col: 'kind', op: 'eq', value: 'new_lead_alert' }], failed: { col: 'status', values: ['failed'] }, unit: 'email' }, settingsHref: '/app/lead-recipients',
    file: 'migration 0016 queue_new_lead_alert, lib/leads/notify.ts' },
  { id: 'qualified_lead_email', area: 'leads', name: 'Qualified-lead emails', trigger: 'event', when: 'A lead is qualified',
    what: 'Emails the qualified lead to the right recipients.',
    record: { table: 'lead_email_deliveries', at: 'created_at', where: [{ col: 'kind', op: 'eq', value: 'qualified_lead' }], failed: { col: 'status', values: ['failed'] }, unit: 'email' }, settingsHref: '/app/lead-recipients', file: 'lib/leads/notify.ts' },
  { id: 'push_notifications', area: 'leads', name: 'Push & in-app notifications', trigger: 'event', when: 'New lead, assignment, booking, cancellation, payment, callback due…',
    what: 'Notifies the right people on their phone and in the app, by their preferences and your routing rules.', requiresEnv: ['VAPID_PRIVATE_KEY'],
    record: { table: 'notification_events', at: 'created_at', unit: 'event' }, settingsHref: '/app/settings/notification-routing', file: 'lib/notifications/outbox.ts' },
  { id: 'callbacks_due', area: 'leads', name: 'Callback-due reminders', trigger: 'schedule', when: 'Every 5 minutes, for callbacks that just came due',
    what: 'Reminds the caller that a callback is due now.', record: { table: 'notification_events', at: 'created_at', where: [{ col: 'type', op: 'eq', value: 'callback_due' }], unit: 'reminder' },
    settingsHref: '/app/settings/notifications', file: 'lib/notifications/outbox.ts (enqueue_due_callbacks)' },
  { id: 'crm_delivery', area: 'leads', name: 'Send leads to CRMs (GoHighLevel / webhooks)', trigger: 'event', when: 'A funnel or estimator lead with a connected integration',
    what: 'Delivers the lead to the contractor’s CRM.', record: { table: 'funnel_deliveries', at: 'available_at', failed: { col: 'status', values: ['failed'] }, unit: 'delivery' },
    gap: 'Failed deliveries are only retried right after a new lead or by hand: nothing calls /api/funnels/deliver on a schedule.', settingsHref: '/app/integrations', file: 'lib/funnels/delivery.ts' },
  { id: 'service_request_email', area: 'leads', name: 'Growth Tools request alert', trigger: 'event', when: 'A contractor submits a Growth Tools request',
    what: 'Emails you about the new request.', record: { table: 'service_requests', at: 'created_at', unit: 'request' }, settingsHref: '/app/service-requests', file: 'lib/growth/notify.ts' },
  { id: 'lead_intake', area: 'leads', name: 'Lead intake (webhooks)', trigger: 'webhook', when: 'Another system posts a lead to HomeQuote',
    what: 'Imports the lead, dedupes it, and starts the alerts and first text.', record: { table: 'lead_intake_events', at: 'received_at', failed: { col: 'status', values: ['error'] }, unit: 'lead received' },
    settingsHref: '/app/lead-intake', file: 'app/api/integrations/[provider]/intake' },

  // ---------------------------------------------------------------- workflow engine
  { id: 'workflows', area: 'workflows', name: 'Your workflows', trigger: 'event', when: 'Whatever each workflow starts on (new lead, booking, reply…)',
    what: 'Runs the workflows you built or published from templates. Listed one by one below.',
    record: { table: 'workflow_runs', at: 'created_at', failed: { col: 'status', values: ['failed'] }, unit: 'run' }, settingsHref: '/app/workflows', file: 'lib/workflows/runtime.server.ts, lib/workflows/graph/*' },
  { id: 'workflow_events', area: 'workflows', name: 'Workflow event triggers', trigger: 'db_trigger', when: 'Leads, assignments, appointments, estimates, sales, bookings, contracts change',
    what: 'Records each change as an event so workflows and notifications can react to it.', record: { table: 'workflow_events', at: 'recorded_at', unit: 'event' },
    file: 'migrations 0024 / 0041 / 0042 (trg_*_workflow_events)' },
  { id: 'workflow_pruning', area: 'workflows', name: 'History clean-up', trigger: 'schedule', when: 'Every 5 minutes, with the main scheduler',
    what: 'Deletes workflow logs after 90 days and events after 180 days.', file: 'lib/workflows/runtime.server.ts pruneWorkflowHistory' },

  // ---------------------------------------------------------------- meta
  { id: 'meta_lead_webhook', area: 'meta', name: 'Meta Instant Form leads', trigger: 'webhook', when: 'Someone submits your Facebook / Instagram lead form',
    what: 'Imports the lead into HomeQuote within seconds.', requiresEnv: ['META_APP_SECRET', 'META_WEBHOOK_VERIFY_TOKEN'],
    record: { table: 'lead_intake_events', at: 'received_at', where: [{ col: 'provider', op: 'eq', value: 'meta' }], unit: 'lead received' }, settingsHref: '/app/integrations/meta', file: 'app/api/integrations/meta/webhook' },
  { id: 'meta_conversions', area: 'meta', name: 'Conversion events to Meta', trigger: 'schedule', when: 'Every 5 minutes',
    what: 'Tells Meta which leads qualified, booked and bought, so ads find more people like them.', requiresEnv: ['META_CONVERSIONS_API_TOKEN'],
    record: { table: 'meta_conversion_events', at: 'created_at', failed: { col: 'status', values: ['failed'] }, unit: 'event' }, settingsHref: '/app/meta-ads/settings', file: 'lib/meta/queue.server.ts' },
  { id: 'meta_browser_events', area: 'meta', name: 'Pixel & Lead events from funnels', trigger: 'event', when: 'A funnel, estimator or quiz is submitted or booked',
    what: 'Sends the Lead / Schedule event to Meta when the visitor allowed measurement.', file: 'lib/meta/capi.ts' },
  { id: 'meta_sync', area: 'meta', name: 'Ad reporting sync', trigger: 'schedule', when: 'Every 6 hours (from the Meta scheduler)',
    what: 'Pulls spend, leads and results from your ad accounts.', requiresEnv: ['META_MARKETING_ACCESS_TOKEN'],
    record: { table: 'meta_sync_runs', at: 'started_at', failed: { col: 'status', values: ['failed'] }, unit: 'sync' }, settingsHref: '/app/meta-ads/settings', file: 'lib/meta/sync.ts' },
  { id: 'meta_rules', area: 'meta', name: 'Ad rules', trigger: 'schedule', when: 'Hourly (from the Meta Ads Studio scheduler)',
    what: 'Checks your rules (e.g. pause an ad that spends without leads) and records or proposes changes.', requiresEnv: ['META_MARKETING_ACCESS_TOKEN'],
    record: { table: 'meta_rule_evaluations', at: 'evaluated_at', unit: 'check' }, settingsHref: '/app/meta-ads/rules', file: 'lib/meta/studio/rules.server.ts' },

  // ---------------------------------------------------------------- calls
  { id: 'ai_calls', area: 'calls', name: 'AI calls to new leads', trigger: 'db_trigger', when: 'A lead is assigned to a contractor set to automatic AI calling',
    what: 'Queues and places an AI phone call, redials, and writes the result on the lead.', requiresEnv: ['AI_CALLING_GLOBAL_ENABLED', 'FISH_WEBHOOK_SECRET'],
    record: { table: 'ai_call_jobs', at: 'created_at', failed: { col: 'status', values: ['failed'] }, unit: 'call' }, settingsHref: '/app/ai-calls', file: 'migration 0038 trg_enqueue_ai_call, lib/ai-calling/run.server.ts' },
  { id: 'call_attempt_rules', area: 'calls', name: 'Call outcome updates', trigger: 'db_trigger', when: 'A caller logs a call',
    what: 'Updates the contractor prospect’s status, callback time and do-not-call automatically.', record: { table: 'prospect_call_attempts', at: 'created_at', unit: 'call logged' },
    settingsHref: '/app/calls', file: 'migration 0007 trg_call_attempts_apply' },

  // ---------------------------------------------------------------- calendar, documents, quizzes
  { id: 'calendar_sync', area: 'calendar_docs', name: 'Google Calendar sync', trigger: 'event', when: 'An appointment is booked or changed (retried every 5 minutes)',
    what: 'Adds the appointment to the contractor’s Google Calendar.', requiresEnv: ['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET'],
    record: { table: 'calendar_sync_jobs', at: 'created_at', unit: 'sync' }, settingsHref: '/app/availability', file: 'lib/calendar/sync.server.ts' },
  { id: 'booking_notices', area: 'calendar_docs', name: 'Booking confirmations & reminder emails', trigger: 'event', when: 'A call is booked, moved or cancelled on a HomeQuote calendar (backstop every 5 minutes); reminder emails 24 h and 1 h before',
    what: 'Emails the homeowner or contractor (with the reschedule / cancel link and a calendar invite) and the hosts, and texts the homeowner the booking, new time or cancellation. Reminder texts come from the reminder texts above, never from here.',
    record: { table: 'appointments', at: 'confirmed_at', where: [{ col: 'confirmed_at', op: 'not_null' }], unit: 'booking confirmed' },
    settingsHref: '/app/calendar/settings', file: 'lib/booking/notify.server.ts, lib/booking/reminders.server.ts runBookingNotifications' },
  { id: 'signing_upkeep', area: 'calendar_docs', name: 'Signing reminders & expiry', trigger: 'schedule', when: 'Every 5 minutes',
    what: 'Sends automatic reminders to signers, expires overdue requests, and finishes signed PDFs.',
    record: { table: 'signing_events', at: 'created_at', where: [{ col: 'event_type', op: 'eq', value: 'auto_reminded' }], unit: 'reminder' }, settingsHref: '/app/documents', file: 'lib/signing/service.ts signingMaintenance' },
  { id: 'adu_quiz_retry', area: 'calendar_docs', name: 'ADU quiz lead hand-off', trigger: 'schedule', when: 'Every 5 minutes, for quiz leads not yet delivered',
    what: 'Retries sending ADU quiz leads to their webhook.', requiresEnv: ['ADU_QUIZ_LEAD_WEBHOOK_URL'],
    record: { table: 'adu_quiz_leads', at: 'created_at', unit: 'quiz lead' }, file: 'lib/adu-quiz/leads.server.ts' },

  // ---------------------------------------------------------------- payments
  { id: 'stripe_webhook', area: 'payments', name: 'Stripe payments', trigger: 'webhook', when: 'Stripe reports a payment',
    what: 'Marks service and payment requests paid and notifies you.', requiresEnv: ['STRIPE_WEBHOOK_SECRET'],
    record: { table: 'stripe_events', at: 'received_at', unit: 'event' }, settingsHref: '/app/billing', file: 'app/api/stripe/webhook, lib/billing/webhook.ts' },

  // ---------------------------------------------------------------- claude
  { id: 'claude_connector', area: 'claude', name: 'Claude connector', trigger: 'webhook', when: 'Claude uses a HomeQuote key',
    what: 'Lets Claude look things up, add notes, draft workflows, send texts and propose assignments you approve.',
    record: { table: 'mcp_tool_calls', at: 'created_at', unit: 'tool call' }, settingsHref: '/app/claude-connector', file: 'app/api/mcp/route.ts, lib/mcp/tools.ts' },
  { id: 'claude_approvals', area: 'claude', name: 'Approvals from Claude', trigger: 'event', when: 'Claude proposes assigning a lead',
    what: 'Waits for your Approve on the Claude connector page; expires after 24 hours.',
    record: { table: 'mcp_pending_actions', at: 'created_at', unit: 'proposal' }, settingsHref: '/app/claude-connector', file: 'lib/actions/claude-connector.ts' },
];
