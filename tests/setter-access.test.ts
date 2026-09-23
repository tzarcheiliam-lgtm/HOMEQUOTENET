import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { navItemsForRole, homePathFor } from '@/lib/nav';
import type { UserRole } from '@/lib/types';

const hrefsFor = (role: UserRole) => navItemsForRole(role).map((i) => i.href);

/**
 * The Appointment Setter role owns five sections. These tests pin both halves
 * of that: what a setter gains, and what must stay out of reach. Navigation is
 * only the visible half — the route guards and the RLS predicate are asserted
 * below so widening the sidebar alone can never be mistaken for access.
 */
describe('Appointment Setter navigation', () => {
  it('shows exactly the five permitted sections', () => {
    expect(hrefsFor('setter').sort()).toEqual(
      [
        '/app',
        '/app/appointments',
        '/app/calls',
        '/app/contractors',
        '/app/leads',
      ].sort()
    );
  });

  it('keeps admin-only areas out of the setter sidebar', () => {
    const hrefs = hrefsFor('setter');
    for (const href of [
      '/app/team',
      '/app/billing',
      '/app/integrations',
      '/app/sales',
      '/app/analytics',
      '/app/audit',
      '/app/lead-intake',
    ]) {
      expect(hrefs).not.toContain(href);
    }
  });

  it('leaves the other roles untouched', () => {
    // Admin still sees every item in the nav.
    expect(hrefsFor('admin')).toHaveLength(
      navItemsForRole('admin').length
    );
    for (const href of ['/app/team', '/app/billing', '/app/integrations', '/app/audit']) {
      expect(hrefsFor('admin')).toContain(href);
    }

    // A caller's workspace is unchanged: the calls section and nothing else.
    expect(hrefsFor('caller')).toEqual(['/app/calls']);

    // A contractor never sees contractors or calls.
    expect(hrefsFor('contractor')).not.toContain('/app/contractors');
    expect(hrefsFor('contractor')).not.toContain('/app/calls');
  });

  it('keeps each role landing where it did before', () => {
    expect(homePathFor('caller')).toBe('/app/calls');
    expect(homePathFor('setter')).toBe('/app');
    expect(homePathFor('admin')).toBe('/app');
    expect(homePathFor('contractor')).toBe('/app');
  });
});

const read = (p: string) => readFileSync(p, 'utf8');

describe('Appointment Setter server-side route guards', () => {
  it('opens every calling-workspace page to the shared call-workspace guard', () => {
    for (const page of [
      'app/app/calls/page.tsx',
      'app/app/calls/[id]/page.tsx',
      'app/app/calls/logs/page.tsx',
      'app/app/calls/appointments/page.tsx',
      'app/app/calls/emails/page.tsx',
    ]) {
      expect(read(page)).toContain('requireCallWorkspace()');
    }
  });

  it('admits admin, caller and setter to the calling workspace and nobody else', () => {
    const auth = read('lib/auth.ts');
    expect(auth).toMatch(
      /requireCallWorkspace[\s\S]*?requireRole\(\['admin', 'caller', 'setter'\]\)/
    );
    // The contractor role must never reach the workspace.
    expect(auth).not.toMatch(/requireCallWorkspace[\s\S]*?'contractor'/);
  });

  it('opens contractors to setters for reading only', () => {
    for (const page of ['app/app/contractors/page.tsx', 'app/app/contractors/[id]/page.tsx']) {
      expect(read(page)).toContain("requireRole(['admin', 'setter'])");
    }
    // Creating a contractor stays admin-only.
    expect(read('app/app/contractors/new/page.tsx')).toContain("requireRole(['admin'])");
    // Every contractor mutation stays admin-only.
    const actions = read('lib/actions/contractors.ts');
    expect(actions).toContain("requireRole(['admin'])");
    expect(actions).not.toContain("'setter'");
  });

  it('keeps admin-only calling controls admin-only', () => {
    // Manual prospect creation, assignment and lifting a do-not-call.
    const prospects = read('lib/actions/prospects.ts');
    expect(prospects.match(/requireRole\(\['admin'\]\)/g)?.length).toBeGreaterThanOrEqual(3);
    // Refresh Prospects — admin-only prospect sourcing.
    expect(read('app/api/calls/refresh/route.ts')).toContain("me.role !== 'admin'");
    expect(read('app/app/calls/new/page.tsx')).toContain("requireRole(['admin'])");
    // Connecting the shared Gmail account stays admin-only.
    expect(read('app/app/calls/emails/page.tsx')).toContain("me.role === 'admin'");
  });

  it('keeps the admin-only sections guarded', () => {
    for (const page of [
      'app/app/team/page.tsx',
      'app/app/billing/page.tsx',
      'app/app/integrations/page.tsx',
      'app/app/sales/page.tsx',
      'app/app/analytics/page.tsx',
      'app/app/audit/page.tsx',
      'app/app/lead-intake/page.tsx',
    ]) {
      expect(read(page)).toContain("requireRole(['admin'])");
    }
  });
});

describe('Appointment Setter row-level security', () => {
  const migration = read('supabase/migrations/0011_setter_call_access.sql');

  it('defines the call-agent predicate as caller or setter only', () => {
    expect(migration).toMatch(
      /function public\.is_call_agent\(\)[\s\S]*?role::text in \('caller', 'setter'\)/
    );
    // It must still require an active account.
    expect(migration).toMatch(/is_call_agent\(\)[\s\S]*?and is_active/);
  });

  it('still scopes every call-agent policy to rows they own', () => {
    for (const clause of [
      "public.is_call_agent() and assigned_to = auth.uid()",
      "public.is_call_agent() and public.prospect_assigned_to_me(prospect_id)",
      "public.is_call_agent() and partner_id = auth.uid()",
    ]) {
      expect(migration).toContain(clause);
    }
    // A bare is_call_agent() must never be the whole predicate.
    expect(migration).not.toMatch(/using \(public\.is_call_agent\(\)\)/);
  });

  it('leaves admin-only writes and the staff predicate alone', () => {
    // Nothing here may redefine who is an admin or who is staff.
    expect(migration).not.toMatch(/create or replace function public\.is_admin/);
    expect(migration).not.toMatch(/create or replace function public\.is_staff/);
    // Inserting and deleting prospects, and the refresh runs, stay untouched.
    expect(migration).not.toMatch(/create policy prospects_insert/);
    expect(migration).not.toMatch(/create policy prospects_delete/);
    expect(migration).not.toMatch(/refresh_runs/);
  });

  it('never lets a non-admin lift a do-not-call', () => {
    // The guard trigger is role-agnostic (anyone who is not an admin), so it
    // already covers setters — assert it stayed that way.
    const guard = read('supabase/migrations/0007_contractor_prospecting.sql');
    expect(guard).toContain(
      'Only an admin can remove a prospect from the do-not-call list'
    );
    expect(guard).toMatch(/if auth\.uid\(\) is null or public\.is_admin\(\) then/);
    // 0011 may reference the guard in a comment, but must not redefine it.
    expect(migration).not.toMatch(
      /create or replace function public\.guard_prospect_caller_update/
    );
    expect(migration).not.toMatch(/create trigger trg_prospects_guard/);
  });
});
