-- Workflow action: send_push (push + in-app notification through the same
-- fail-closed recipient routing as every other notification). Widens the two
-- action_type checks only; no data changes.
alter table public.workflow_steps drop constraint if exists workflow_steps_action_type_check;
alter table public.workflow_steps add constraint workflow_steps_action_type_check check (action_type in (
  'send_sms', 'send_email', 'assign_user', 'change_pipeline_stage', 'create_task',
  'add_tag', 'remove_tag', 'wait', 'send_webhook', 'notify_team',
  'create_calendar_event', 'stop_workflow', 'send_push'
));
alter table public.workflow_step_runs drop constraint if exists workflow_step_runs_action_type_check;
alter table public.workflow_step_runs add constraint workflow_step_runs_action_type_check check (action_type in (
  'send_sms', 'send_email', 'assign_user', 'change_pipeline_stage', 'create_task',
  'add_tag', 'remove_tag', 'wait', 'send_webhook', 'notify_team',
  'create_calendar_event', 'stop_workflow', 'send_push'
));
