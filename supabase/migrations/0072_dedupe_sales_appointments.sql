-- One live sales meeting per contractor prospect: clean up the duplicates made before 2026-10-29, when saving
-- "Appointment booked" again (to reschedule or fix details) added a second meeting instead of updating the first.
-- From now on the app updates the open meeting (logCallOutcome) and has an Edit button (updateSalesAppointment).
--
-- For each prospect with more than one OPEN meeting (scheduled / confirmed / rescheduled) this keeps the most
-- recently updated one and marks the others cancelled, with a note. Nothing is deleted, so history and setter pay
-- stay intact. Safe to re-run (a second run finds nothing to do).
--
-- Preview first (read-only) to see what it will touch:
--   select prospect_id, count(*) from public.prospect_sales_appointments
--    where status in ('scheduled', 'confirmed', 'rescheduled') group by prospect_id having count(*) > 1;

-- Quiet clean-up: no "meeting cancelled" pushes to the team, and no cancellation email/text to the contractor.
alter table public.prospect_sales_appointments disable trigger trg_prospect_appointments_notify;

with ranked as (
  select id, row_number() over (partition by prospect_id order by updated_at desc, created_at desc, id desc) as rn
    from public.prospect_sales_appointments
   where status in ('scheduled', 'confirmed', 'rescheduled')
)
update public.prospect_sales_appointments a
   set status = 'cancelled',
       cancelled_at = coalesce(a.cancelled_at, now()),
       cancel_notified_at = coalesce(a.cancel_notified_at, now()),
       cancel_reason = 'Duplicate of an updated meeting (cleaned up 2026-10-29)',
       notes = left(concat_ws(E'\n', nullif(a.notes, ''), 'Duplicate of an updated meeting (cleaned up 2026-10-29).'), 4000)
  from ranked r
 where r.id = a.id and r.rn > 1;

alter table public.prospect_sales_appointments enable trigger trg_prospect_appointments_notify;
