# Contractor portal permissions

## Access model

| Capability | HQN administrator | Contractor owner | Contractor staff |
| --- | --- | --- | --- |
| View companies and leads | All | Own company and its assigned leads | Own company and its assigned leads |
| View customer contact and qualification answers | Yes | Own-company leads | Own-company leads |
| Update call result, assignment status, appointments, estimates and sales | Yes | Own-company assignments | Own-company assignments |
| Add notes | Internal or contractor-visible | Contractor-visible only | Contractor-visible only |
| View HQN internal notes | Yes | No | No |
| Assign/reassign a lead to a contractor company | Yes | No | No |
| Assign a company lead to an approved company user | Yes | Yes | No |
| Manage recipients or manual distribution | Yes | No | No |
| Enable automatic distribution for a recipient | Yes | No | No |
| View delivery failures and retry deliveries | Yes | No | No |
| Edit funnels, integrations and company configuration | Yes | No | No |
| Global reporting, audit logs and system logs | Yes | No | No |
| Company reporting | All companies | Own company | Own company |
| Export company data | Yes | Only when explicitly enabled | Only when explicitly enabled |
| Permanently delete leads or outcome records | Yes | No | No |

The existing `contractor` login role remains the database role. The additive
`profiles.contractor_role` field distinguishes `owner` from `staff`, so the
application does not introduce a parallel authorization system. Company scope
continues to come from `profiles.contractor_id`, `lead_assignments`, server-side
membership checks and Supabase Row Level Security.

Contractor staff currently see every lead assigned to their company. The schema
also records `lead_assignments.assigned_user_id` for workflow ownership, but it
does not narrow staff visibility to only directly assigned leads. This preserves
the product's existing company-wide lead model.

## Security boundaries

- Browser-supplied `company_id`, role, related lead IDs and assignment ownership
  are not authorization inputs. Server actions load the authenticated profile and
  derive the lead/company relationship from the database.
- Assignment ownership fields are immutable to non-admin users at the database
  layer. Contractor owners may change only `assigned_user_id`, and only to an
  active contractor user in the same company.
- Contractor users cannot create/delete company assignments or permanently
  delete leads, appointments, estimates or sales. RLS is the final enforcement
  layer even if UI controls are bypassed.
- `lead_activities.visibility` separates `internal` and `contractor` entries.
  Contractor-authored and contractor-scoped events are classified automatically;
  contractor reads require both an assigned lead and contractor visibility.
- Legacy `leads.notes` content is migrated into internal activity entries and the
  legacy column is constrained to remain empty, preventing a raw lead query from
  exposing internal notes.
- Recipients, delivery history, failures, retry controls, funnel configuration,
  integrations, audit logs and system logs remain unavailable to contractors.
- `SUPABASE_SERVICE_ROLE_KEY`, delivery credentials, cron secrets and Liam/Nadav
  alert addresses remain server-only. No new `NEXT_PUBLIC_*` secret is used.
- Manual sending requires at least one explicit recipient and a separate
  confirmation checkbox. The action requires an HQN administrator, and the
  database function independently verifies the administrator actor.
- `automatic_distribution_enabled` is false for every recipient during migration
  and defaults to false. Only HQN administrators can change recipient records.
- The existing funnel rule is preserved: a client-funnel lead is assigned to the
  contractor referenced by that funnel. The Pool Masters funnel must continue to
  reference the Pool Masters Inc. contractor row. Funnel submission does not
  automatically email Ethan, Gio or another contractor recipient.
- New-lead alerts continue to use the server-only Liam and Nadav default list.

## Recommended contractor workflow statuses

The contractor assignment selector presents the requested business labels while
keeping the existing assignment pipeline compatible with reporting: New,
Contacted, No Answer, Qualified, Appointment Booked, Estimate Given, Won, Lost,
and Not Qualified. Legacy Accepted, Appointment Held and Returned states remain
available for existing records and workflows.

## Migration and deployment

Do not edit or rerun an already-applied production migration. Deploy
`supabase/migrations/0017_contractor_portal_permissions.sql` as a new migration.

1. In staging, inspect contractor profiles that have no company:

   ```sql
   select id, email from public.profiles
   where role = 'contractor' and contractor_id is null;
   ```

2. Apply migration `0017` in staging. It backfills existing company-linked
   contractor accounts as owners, adds owner/staff and export capabilities,
   classifies notes, hardens RLS, and disables automatic distribution for all
   recipients.
3. Run the database-backed permission tests with `SUPABASE_DB_URL` pointing to a
   disposable/staging database. The tests run inside a transaction and roll back.
4. Verify the Pool Masters funnel row points to Pool Masters Inc.:

   ```sql
   select f.slug, c.id, c.name
   from public.funnels f
   join public.contractors c on c.id = f.contractor_id
   where f.slug = 'pool-masters';
   ```

5. Review existing contractor users and change `contractor_role` to `staff` where
   appropriate. Explicitly enable `can_export_company_data` only for approved
   users. Leave automatic distribution off unless an HQN administrator approves
   a specific recipient.
6. After remediating any legacy contractor profile without a company, validate
   the staged constraint:

   ```sql
   alter table public.profiles
     validate constraint profiles_contractor_role_check;
   ```

7. Deploy the application and migration together, smoke-test all three roles,
   then repeat the reviewed migration steps in production during an authorized
   change window.

No production migration or production-data update was performed as part of this
work.

## Test coverage

- `tests/contractor-permissions.test.ts` covers the application permission matrix,
  manual-send confirmation, distribution defaults, note separation, deletion
  boundaries, Pool Masters assignment wiring, and Liam/Nadav alert defaults.
- `tests/contractor-permissions-db.test.ts` exercises administrator, owner and
  staff RLS; cross-company direct-ID access; assignment tampering; unauthorized
  deletion/recipient/distribution access; note separation; and database-level
  manual-send authorization.
- Existing `tests/lead-distribution-db.test.ts` covers selected-recipient sends,
  delivery retries and client-funnel assignment, including the Pool Masters flow.

## Deliberate decisions

- Contractor owners can assign leads to existing approved users in their company,
  but cannot create, suspend or change permissions for user accounts. The current
  team-management implementation uses the Supabase service role and is retained
  as an HQN-admin function.
- Contractor staff visibility stays company-wide because that is the current
  product model. `assigned_user_id` is operational ownership, not a second row
  visibility boundary.
