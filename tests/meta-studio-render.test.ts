// RENDER SMOKE TEST (server-side render with fixtures). Proves the new components mount without runtime errors and show
// the safety copy; it is NOT a browser test and says nothing about layout. Server actions are stubbed.
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }), usePathname: () => '/app/meta-ads/rules' }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ storage: { from: () => ({}) } }) }));
vi.mock('@/lib/actions/meta-studio', () => ({ mapAsset: async () => undefined, runDiscovery: async () => undefined, saveAccountControls: async () => undefined, saveThresholds: async () => undefined, setAutomation: async () => undefined, setLiveWrites: async () => undefined, verifyTracking: async () => undefined, startCreativeUpload: async () => undefined, finalizeCreativeUpload: async () => undefined, updateCreative: async () => undefined, deleteCreative: async () => undefined, saveDraft: async () => undefined, confirmDraftAction: async () => undefined, createPausedAction: async () => undefined, refreshDraftStatusAction: async () => undefined, cancelDraft: async () => undefined, runAuditAction: async () => undefined, proposeFromFindingAction: async () => undefined, approveProposal: async () => undefined, rejectProposal: async () => undefined, applyProposalAction: async () => undefined, deleteRule: async () => undefined, evaluateRulesNow: async () => undefined, saveRule: async () => undefined, setRuleEnabled: async () => undefined }));

const html = async (path: string, name: string, props: Record<string, unknown>) => {
  const mod = await import(path);
  return renderToString(h(mod[name], props));
};

describe('Studio components render', () => {
  it('tabs mark the current section', async () => {
    const out = await html('@/components/meta/studio/ui', 'StudioTabs', { tabs: [{ href: '/app/meta-ads', label: 'Overview & Campaigns' }, { href: '/app/meta-ads/rules', label: 'Optimization Rules' }] });
    expect(out).toContain('aria-current="page"');
    expect(out).toContain('Optimization Rules');
  });

  it('the write/automation switches require a typed phrase and explain the stop', async () => {
    const off = await html('@/components/meta/studio/settings-forms', 'SwitchForm', { kind: 'writes', on: false });
    expect(off).toContain('ENABLE META WRITES');
    const on = await html('@/components/meta/studio/settings-forms', 'SwitchForm', { kind: 'automation', on: true });
    expect(on).toContain('Stop HQN automation');
  });

  it('the ad wizard renders every section with an empty account list (Setup-required state) and no fake data', async () => {
    const out = await html('@/components/meta/studio/ad-wizard', 'AdWizard', { initial: null, data: { contractors: [], accounts: [], assets: [], campaigns: [], adsets: [], creatives: [] } });
    for (const s of ['Who is this for?', 'Campaign and goal', 'Budget, schedule and audience', 'Creative', 'Ad content']) expect(out).toContain(s);
    expect(out).toContain('No account mapped to this contractor');
    expect(out).toContain('Saving a draft does not contact Meta.');
  });

  it('the draft actions explain exactly what is switched off and never offer to activate an ad', async () => {
    const out = await html('@/components/meta/studio/draft-actions', 'DraftActions', { draftId: 'd', status: 'ready', hasErrors: false, confirmed: true, gateReasons: ['Live writes are switched off for HQN (Meta Ads > Settings).'] });
    expect(out).toContain('Creating in Meta is switched off');
    expect(out).toContain('Nothing has been sent to Meta');
    expect(out.toLowerCase()).not.toContain('activate');
    expect(out).toContain('disabled');
  });

  it('a proposal card shows current vs proposed and the budget-increase warning', async () => {
    const p = { id: 'p', account_id: 'act_1', target_type: 'adset', target_id: '222', targetName: 'Spring set', change_type: 'budget', current_value: { daily_budget: '10000' }, proposed_value: { daily_budget: '12000' }, evidence: { window: 'x' }, rationale: 'Because', budget_impact: { currency: 'USD', delta_major: 20, current_major: 100, proposed_major: 120, note: 'Change in budget cap, not a prediction of spend or results.' }, learning_note: null, source_kind: 'audit', source_version: 'hqn-meta-audit/1.0.0', status: 'approved', approved_at: null, applied_at: null, expires_at: 'x', error_message: null, previous_state: null, provider_result: null, created_at: '2026-10-07T00:00:00Z', proposed_kind: 'user' };
    const out = await html('@/components/meta/studio/proposal-card', 'ProposalCard', { p, canApply: false, gateReasons: ['Writes are not enabled for this ad account (Meta Ads > Settings).'] });
    expect(out).toContain('Current (when proposed)');
    expect(out).toContain('never applied automatically');
    expect(out).toContain('Applying is switched off');
    expect(out).toContain('cannot be undone');
  });

  it('the rule form defaults to recommend-only and warns about spend ceilings', async () => {
    const out = await html('@/components/meta/studio/rule-forms', 'RuleForm', { accounts: [{ id: 'act_1', name: 'Acct' }], campaigns: [], adsets: [] });
    expect(out).toContain('Recommend only');
    expect(out).toContain('starts OFF');
    expect(out).toContain('cannot promise an exact spend ceiling');
  });

  it('a rejected creative shows its reason and cannot be mistaken for ready', async () => {
    const c = { id: 'c', name: 'bad.gif', kind: 'image', status: 'rejected', width: null, height: null, duration_seconds: null, bytes: 100, tags: [], campaign_label: null, contractorName: null, previewUrl: null, thumbUrl: null, validation: { errors: [{ code: 'image_type', message: 'Images must be JPG or PNG (this file is image/gif).' }], warnings: [] }, usedBy: 0, meta_account_id: null };
    const out = await html('@/components/meta/studio/creative-card', 'CreativeCard', { c });
    expect(out).toContain('Rejected');
    expect(out).toContain('must be JPG or PNG');
  });
});
