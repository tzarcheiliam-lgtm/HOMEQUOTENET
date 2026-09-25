import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The server actions take company and user identity from the signed-in
 * profile only, and never purchase or bill anything. The database is faked;
 * RLS itself is covered by tests/service-requests-db.test.ts.
 */
const state = vi.hoisted(() => ({
  profile: null as null | Record<string, unknown>,
  inserts: [] as Record<string, unknown>[],
  updates: [] as { values: Record<string, unknown>; id: unknown }[],
  insertError: null as null | { code: string; message: string },
  tables: [] as string[],
  alerts: [] as string[],
}));

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/growth/notify', () => ({ sendServiceRequestAlertSoon: (id: string) => state.alerts.push(id) }));
vi.mock('@/lib/auth', () => ({
  requireRole: vi.fn(async (roles: string[]) => {
    const p = state.profile;
    if (!p || !roles.includes(p.role as string)) throw new Error('NEXT_REDIRECT /app');
    return p;
  }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      state.tables.push(table);
      return {
        insert: (row: Record<string, unknown>) => {
          state.inserts.push(row);
          return {
            select: () => ({
              single: async () =>
                state.insertError ? { data: null, error: state.insertError } : { data: { id: 'new-request-id' }, error: null },
            }),
          };
        },
        update: (values: Record<string, unknown>) => ({
          eq: async (_col: string, id: unknown) => {
            state.updates.push({ values, id });
            return { error: null };
          },
        }),
      };
    },
  }),
}));

import { requestServiceInfo, updateServiceRequestStatus } from '@/lib/actions/service-requests';

const MY_COMPANY = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_COMPANY = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const contractor = {
  id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  role: 'contractor',
  contractor_id: MY_COMPANY,
  email: 'owner@example.test',
  full_name: 'Owner',
};
const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

beforeEach(() => {
  state.profile = contractor;
  state.inserts = [];
  state.updates = [];
  state.insertError = null;
  state.tables = [];
  state.alerts = [];
});

describe('requestServiceInfo', () => {
  it('files the request for the signed-in company and user, even if the form is tampered with', async () => {
    const result = await requestServiceInfo(
      undefined,
      form({
        service: 'website',
        notes: 'Need a new site',
        contractor_id: OTHER_COMPANY,
        requested_by: 'someone-else',
        status: 'accepted',
      })
    );
    expect(result).toEqual({ ok: true, serviceName: 'Website creation or redesign', contactEmail: 'owner@example.test' });
    expect(state.inserts).toEqual([
      { contractor_id: MY_COMPANY, requested_by: contractor.id, service: 'website', notes: 'Need a new site' },
    ]);
    // The HQN team is alerted about the saved request.
    expect(state.alerts).toEqual(['new-request-id']);
  });

  it('only writes the request row: no billing, sales or enrollment', async () => {
    await requestServiceInfo(undefined, form({ service: 'crm_setup' }));
    expect(state.tables).toEqual(['service_requests']);
  });

  it('refuses a login with no linked company', async () => {
    state.profile = { ...contractor, contractor_id: null };
    const result = await requestServiceInfo(undefined, form({ service: 'website' }));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/linked to a company/) });
    expect(state.inserts).toEqual([]);
  });

  it('rejects an unknown service without touching the database', async () => {
    const result = await requestServiceInfo(undefined, form({ service: 'gift_card' }));
    expect(result).toMatchObject({ ok: false });
    expect(state.inserts).toEqual([]);
  });

  it('explains a duplicate open request instead of failing silently', async () => {
    state.insertError = { code: '23505', message: 'duplicate key value violates unique constraint' };
    const result = await requestServiceInfo(undefined, form({ service: 'website' }));
    expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/already has an open request/) });
    expect(state.alerts).toEqual([]);
  });

  it('hides raw database errors', async () => {
    state.insertError = { code: '42501', message: 'new row violates row-level security policy' };
    const result = await requestServiceInfo(undefined, form({ service: 'website' }));
    expect(result).toEqual({ ok: false, error: 'Your request couldn’t be sent. Please try again.' });
  });

  it('is not available to staff roles', async () => {
    state.profile = { ...contractor, role: 'admin' };
    await expect(requestServiceInfo(undefined, form({ service: 'website' }))).rejects.toThrow(/REDIRECT/);
  });
});

describe('updateServiceRequestStatus', () => {
  const id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

  it('lets an admin move a request to a known status', async () => {
    state.profile = { ...contractor, role: 'admin', contractor_id: null };
    await updateServiceRequestStatus(form({ id, status: 'proposal_sent' }));
    expect(state.updates).toEqual([{ values: { status: 'proposal_sent' }, id }]);
  });

  it('ignores unknown statuses', async () => {
    state.profile = { ...contractor, role: 'admin', contractor_id: null };
    await updateServiceRequestStatus(form({ id, status: 'paid' }));
    expect(state.updates).toEqual([]);
  });

  it('blocks contractors from changing status', async () => {
    await expect(updateServiceRequestStatus(form({ id, status: 'accepted' }))).rejects.toThrow(/REDIRECT/);
    expect(state.updates).toEqual([]);
  });
});
