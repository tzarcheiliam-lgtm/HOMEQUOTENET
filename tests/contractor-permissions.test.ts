import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  belongsToCompany,
  canExportCompanyData,
  canManageCompanyTeam,
  canManageDistribution,
  canManageRecipients,
  canPermanentlyDeleteLeads,
  canViewInternalNotes,
} from '@/lib/permissions';
import type { Profile } from '@/lib/types';

const profile = (overrides: Partial<Profile>): Profile => ({
  id: 'user', role: 'contractor', contractor_id: 'company-a', contractor_role: 'staff',
  can_export_company_data: false, full_name: null, email: null, phone: null,
  is_active: true, account_status: 'active', last_login_at: null, deleted_at: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

describe('contractor permission matrix', () => {
  it('gives an active HQN administrator global controls', () => {
    const admin = profile({ role: 'admin', contractor_id: null, contractor_role: null });
    expect(canManageCompanyTeam(admin)).toBe(true);
    expect(canManageRecipients(admin)).toBe(true);
    expect(canManageDistribution(admin)).toBe(true);
    expect(canPermanentlyDeleteLeads(admin)).toBe(true);
    expect(canViewInternalNotes(admin)).toBe(true);
    expect(canExportCompanyData(admin)).toBe(true);
    expect(belongsToCompany(admin, 'any-company')).toBe(true);
  });

  it('limits an owner to their company while allowing company-user assignment', () => {
    const owner = profile({ contractor_role: 'owner' });
    expect(belongsToCompany(owner, 'company-a')).toBe(true);
    expect(belongsToCompany(owner, 'company-b')).toBe(false);
    expect(canManageCompanyTeam(owner)).toBe(true);
    expect(canManageRecipients(owner)).toBe(false);
    expect(canManageDistribution(owner)).toBe(false);
    expect(canPermanentlyDeleteLeads(owner)).toBe(false);
    expect(canViewInternalNotes(owner)).toBe(false);
  });

  it('keeps contractor staff out of management and export unless explicitly enabled', () => {
    const staff = profile({ contractor_role: 'staff' });
    expect(canManageCompanyTeam(staff)).toBe(false);
    expect(canManageRecipients(staff)).toBe(false);
    expect(canManageDistribution(staff)).toBe(false);
    expect(canExportCompanyData(staff)).toBe(false);
    expect(canExportCompanyData(profile({ contractor_role: 'staff', can_export_company_data: true }))).toBe(true);
  });
});

describe('security-sensitive workflow wiring', () => {
  it('requires explicit recipient selection and confirmation for manual send', () => {
    const action = readFileSync('lib/actions/lead-distribution.ts', 'utf8');
    const form = readFileSync('components/leads/send-lead-form.tsx', 'utf8');
    expect(action).toContain("formData.get('confirm_send') !== 'confirmed'");
    expect(action).toContain('recipientIds.length === 0');
    expect(form).toContain('name="confirm_send"');
    expect(form).toContain('selected recipient');
  });

  it('keeps recipients automatic-send disabled by default and administrator-managed', () => {
    const migration = readFileSync('supabase/migrations/0017_contractor_portal_permissions.sql', 'utf8');
    const recipientAction = readFileSync('lib/actions/lead-distribution.ts', 'utf8');
    expect(migration).toMatch(/automatic_distribution_enabled boolean not null default false/);
    expect(recipientAction.match(/requireRole\(\['admin'\]\)/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps internal notes classified separately and denies contractor deletes', () => {
    const migration = readFileSync('supabase/migrations/0017_contractor_portal_permissions.sql', 'utf8');
    expect(migration).toContain("visibility in ('internal', 'contractor')");
    expect(migration).toMatch(/visibility = 'contractor'.*lead_assigned_to_me/s);
    expect(migration).toMatch(/appointments_delete.*public\.is_admin/s);
    expect(migration).toMatch(/estimates_delete.*public\.is_admin/s);
    expect(migration).toMatch(/sales_delete.*public\.is_admin/s);
  });

  it('preserves Pool Masters funnel assignment and Liam/Nadav-only default alerts', () => {
    const distributionMigration = readFileSync('supabase/migrations/0016_lead_review_distribution.sql', 'utf8');
    const funnelTest = readFileSync('tests/lead-distribution-db.test.ts', 'utf8');
    const notify = readFileSync('lib/leads/notify.ts', 'utf8');
    expect(distributionMigration).toContain('values(l,f.contractor_id');
    expect(funnelTest).toContain("expect(await q('select contractor_id from public.lead_assignments where lead_id=$1'");
    expect(notify).toContain('tzarcheiliam@gmail.com');
    expect(notify).toContain('nsolachnek@gmail.com');
  });
});
