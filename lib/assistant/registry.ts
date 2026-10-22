import 'server-only';
import type { Profile } from '@/lib/types';
import { hasDataAccess } from './access';
import { DOC_TOOLS } from './doc-tools';
import { META_TOOLS } from './meta-tools';
import { TOOLS, type ToolContext, type ToolDef } from './tools';
import { canIssueDocuments } from '@/lib/documents/service';
import { canSetUpMeta } from '@/lib/meta/setup/connections';

/** Tools each user actually gets. A role that cannot do something never even sees the tool. */
export function toolsFor(profile: Profile): ToolDef[] {
  const out: ToolDef[] = [];
  if (hasDataAccess(profile)) out.push(...TOOLS);
  if (canIssueDocuments(profile)) out.push(...DOC_TOOLS);
  if (canSetUpMeta(profile)) out.push(...META_TOOLS);
  return out;
}

/**
 * An accurate statement of what the assistant can and cannot do for THIS user, derived from the same checks that gate the
 * tools. The model is told to describe its abilities from this text only, so it never promises something that is not wired up.
 */
export function describeCapabilities(profile: Profile): { can: string[]; cannot: string[] } {
  const can: string[] = [];
  const cannot: string[] = [
    'Send texts or emails (it can draft them; you send them yourself).',
    'Create reminders or tasks that notify you. A follow-up is saved as a dated note on the lead and shown under "what needs attention"; nothing is pushed to you.',
    'Reschedule, cancel or create appointments (it can describe the change and link to the lead).',
    'Invent prices, scope, payment terms, legal wording or signatures.',
  ];
  if (hasDataAccess(profile)) {
    can.push(
      'Answer questions about your leads and appointments, and what needs attention (only records you can see).',
      'Brief you on an appointment from the lead record and its notes/activity timeline (there is no stored text or email thread with the homeowner).',
      'Draft follow-up texts and emails for you to copy, edit and send.',
      'Prepare a note, follow-up date or status change, shown to you for Confirm before anything is saved.',
    );
  }
  if (canIssueDocuments(profile)) {
    can.push(
      'Create work orders, proposals and contracts from templates an admin has approved, filled with the lead’s details and the scope, price and terms YOU provide. You see an editable preview first; the template wording itself cannot be changed.',
      'Edit a draft document’s values (each change is a new saved version).',
      'Send a saved document to the customer for e-signature, only after a separate explicit approval from you.',
    );
    cannot.push('Use a template that is not approved, write contract language, or offer a contract for a state no approved template covers.');
  } else cannot.push('Create or send work orders, proposals or contracts (not available for your role).');
  if (canSetUpMeta(profile)) {
    can.push(
      'Guide Meta tracking setup: connect your Meta login, pick an ad account and an existing pixel/dataset from cards, attach it to a funnel, check what Meta reports, and give the ad-set settings to use.',
      'Create a Meta dataset only if the account has none and Meta granted that permission.',
    );
    cannot.push('Publish ads, start spend, change budgets or edit active Meta campaigns; confirm that an ad is optimizing for the pixel (you apply ad-set settings in Ads Manager).');
  } else cannot.push('Set up Meta tracking (available to HomeQuote admins and company owners).');
  return { can, cannot };
}

/** Runs one tool call requested by the model. The model only chooses a name and arguments; never identity. */
export async function runTool(ctx: ToolContext, name: string, input: unknown): Promise<{ result: unknown; isError: boolean }> {
  const tool = toolsFor(ctx.profile).find(t => t.name === name);
  if (!tool) return { result: { error: 'unknown_tool' }, isError: true };
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { result: { error: 'invalid_input' }, isError: true };
  try {
    const result = await tool.run(ctx, input as Record<string, unknown>);
    const isError = !!result && typeof result === 'object' && 'error' in (result as object);
    return { result, isError };
  } catch {
    return { result: { error: 'tool_failed' }, isError: true };
  }
}
