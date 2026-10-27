-- Workflows can text through the Mac bridge. A step's text is queued once (unique per workflow step run),
-- and a conversation started by a workflow can be marked workflow-owned so the texting assistant does not
-- answer replies the workflow is handling itself. Additive and idempotent.

alter table public.sms_messages add column if not exists workflow_step_run_id uuid;
create unique index if not exists uq_sms_messages_workflow_step
  on public.sms_messages (workflow_step_run_id) where workflow_step_run_id is not null;

alter table public.sms_conversations add column if not exists workflow_owned boolean not null default false;
