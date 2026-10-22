import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { Profile } from '@/lib/types';
import { changeLeadStatus, updateAssignmentStatus } from '@/lib/actions/leads';
import { canUseAssistant, hasDataAccess, isStaff, loadAccessibleLead, tenantOf } from './access';
import { allowedStatusesFor, composeNoteBody, type ActionKind, type ActionPreview } from './tools';
import { createDocument, editDocument, requestSignature, type DraftPayload } from '@/lib/documents/service';
import { configureFunnelTracking, createDataset } from '@/lib/meta/setup/funnel';
import { isUuid } from './context';

export interface ActionRow {
  id: string;
  conversation_id: string;
  user_id: string;
  kind: ActionKind;
  lead_id: string | null;
  document_id: string | null;
  payload: Record<string, unknown>;
  preview: ActionPreview;
  status: 'proposed' | 'executing' | 'executed' | 'failed' | 'cancelled';
  result: { href: string; label: string; message: string } | null;
  error: string | null;
  decided_at: string | null;
}

export type Decision =
  | { ok: true; action: Pick<ActionRow, 'id' | 'status' | 'preview' | 'result' | 'error'>; duplicate?: boolean }
  | { ok: false; code: 'not_found' | 'forbidden' | 'in_progress' | 'not_pending'; message: string };

const COLUMNS = 'id, conversation_id, user_id, kind, lead_id, document_id, payload, preview, status, result, error, decided_at';
const STALE_EXECUTING_MS = 2 * 60_000;

const notePayload = z.object({
  note: z.string().trim().min(3).max(1500),
  next_step: z.string().trim().max(300).optional(),
  follow_up_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});
const statusPayload = z.object({ status: z.string() });

const summarize = (a: ActionRow) => ({ id: a.id, status: a.status, preview: a.preview, result: a.result, error: a.error });

export interface DecideDeps {
  fetchImpl?: typeof fetch;
  db: SupabaseClient;
  admin: SupabaseClient;
  profile: Profile;
  tz: string;
}

/**
 * Confirm or cancel a proposed change. Every check is repeated here, server-side, at execution time:
 * the proposal row only records what was asked, it is never trusted as proof of permission.
 */
export async function decideAction(deps: DecideDeps, actionId: string, decision: 'confirm' | 'cancel', edits?: { values?: Record<string, unknown> }): Promise<Decision> {
  const { admin, profile } = deps;
  if (!isUuid(actionId)) return { ok: false, code: 'not_found', message: 'Action not found.' };
  if (!canUseAssistant(profile)) return { ok: false, code: 'forbidden', message: 'Your account cannot use the assistant.' };

  // Scoped to the signed-in user: someone else's action id is indistinguishable from a missing one.
  const { data } = await admin.from('assistant_actions').select(COLUMNS).eq('id', actionId).eq('user_id', profile.id).maybeSingle();
  let action = data as ActionRow | null;
  if (!action) return { ok: false, code: 'not_found', message: 'Action not found.' };

  if (decision === 'cancel') {
    if (action.status === 'cancelled') return { ok: true, action: summarize(action), duplicate: true };
    if (action.status !== 'proposed') return { ok: false, code: 'not_pending', message: 'This change was already applied or can no longer be cancelled.' };
    const { data: cancelled } = await admin.from('assistant_actions')
      .update({ status: 'cancelled', decided_at: new Date().toISOString() })
      .eq('id', action.id).eq('user_id', profile.id).eq('status', 'proposed').select(COLUMNS).maybeSingle();
    if (!cancelled) return { ok: false, code: 'not_pending', message: 'This change is no longer pending.' };
    return { ok: true, action: summarize(cancelled as ActionRow) };
  }

  // confirm
  if (action.status === 'executed') return { ok: true, action: summarize(action), duplicate: true };
  if (action.status === 'cancelled' || action.status === 'failed') {
    return { ok: false, code: 'not_pending', message: action.status === 'cancelled' ? 'This change was cancelled.' : 'This change failed earlier. Ask the assistant to propose it again.' };
  }

  const nowIso = new Date().toISOString();
  // Atomic claim: exactly one request moves proposed -> executing. A double-click or retry loses the race.
  let claimed = (await admin.from('assistant_actions').update({ status: 'executing', decided_at: nowIso })
    .eq('id', action.id).eq('user_id', profile.id).eq('status', 'proposed').select(COLUMNS).maybeSingle()).data as ActionRow | null;
  if (!claimed && action.status === 'executing' && action.decided_at && Date.now() - new Date(action.decided_at).getTime() > STALE_EXECUTING_MS) {
    // A previous attempt died mid-write. Take it over; the executor checks whether the write already landed.
    claimed = (await admin.from('assistant_actions').update({ decided_at: nowIso })
      .eq('id', action.id).eq('user_id', profile.id).eq('status', 'executing').eq('decided_at', action.decided_at).select(COLUMNS).maybeSingle()).data as ActionRow | null;
  }
  if (!claimed) {
    const { data: latest } = await admin.from('assistant_actions').select(COLUMNS).eq('id', action.id).eq('user_id', profile.id).maybeSingle();
    action = latest as ActionRow;
    if (action?.status === 'executed') return { ok: true, action: summarize(action), duplicate: true };
    return { ok: false, code: 'in_progress', message: 'This change is already being applied.' };
  }

  // The user may have corrected merge-field values in the preview. Only document actions accept edits, and only plain
  // string values for fields the approved template defines; the wording and every other field are untouched.
  if (edits?.values && (claimed.kind === 'create_document' || claimed.kind === 'update_document')) {
    const base = (claimed.payload.values ?? {}) as Record<string, string>;
    const typed: Record<string, string> = {};
    for (const [k, v] of Object.entries(edits.values)) if (typeof v === 'string') typed[k] = v;
    claimed.payload = { ...claimed.payload, values: { ...base, ...typed } };
    await admin.from('assistant_actions').update({ payload: claimed.payload }).eq('id', claimed.id).eq('user_id', profile.id);
  }
  const outcome = await execute(deps, claimed);
  const final = outcome.ok
    ? { status: 'executed', result: outcome.result, error: null }
    : { status: 'failed', result: null, error: outcome.error.slice(0, 500) };
  const { data: saved } = await admin.from('assistant_actions').update(final).eq('id', claimed.id).eq('user_id', profile.id).select(COLUMNS).maybeSingle();
  return { ok: true, action: summarize((saved as ActionRow) ?? { ...claimed, ...final } as ActionRow) };
}

type Executed = { ok: true; result: NonNullable<ActionRow['result']> } | { ok: false; error: string };

async function execute(deps: DecideDeps, action: ActionRow): Promise<Executed> {
  const { db, profile } = deps;
  const actor = { profile, db, admin: deps.admin };
  const meta = { admin: deps.admin, profile, fetchImpl: deps.fetchImpl };
  try {
    if (action.kind === 'create_document') {
      const p = action.payload as unknown as DraftPayload;
      if (!isUuid(p.lead_id)) return { ok: false, error: 'The document request is invalid.' };
      const r = await createDocument(actor, { ...p, values: sanitizeAll(p.values) }, action.id);
      if (!r.ok) return { ok: false, error: r.error };
      await deps.admin.from('assistant_actions').update({ document_id: r.documentId }).eq('id', action.id).eq('user_id', profile.id);
      return { ok: true, result: { href: `/app/leads/${p.lead_id}#documents`, label: r.title, message: `Draft saved (version ${r.versionNo}). Nothing was sent to the customer.` } };
    }
    if (action.kind === 'update_document') {
      const p = action.payload as { document_id?: string; values?: Record<string, string>; expected_version_no?: number };
      if (!isUuid(p.document_id) || typeof p.expected_version_no !== 'number') return { ok: false, error: 'The edit request is invalid.' };
      const r = await editDocument(actor, p.document_id, p.values ?? {}, p.expected_version_no, action.id);
      return r.ok ? { ok: true, result: { href: action.preview.target.href, label: r.title, message: `Saved as version ${r.versionNo}. Earlier versions are kept.` } } : { ok: false, error: r.error };
    }
    if (action.kind === 'request_signature') {
      const p = action.payload as { document_id?: string; version_no?: number; content_sha256?: string };
      if (!isUuid(p.document_id) || typeof p.version_no !== 'number' || typeof p.content_sha256 !== 'string') return { ok: false, error: 'The send request is invalid.' };
      const r = await requestSignature(actor, p.document_id, { versionNo: p.version_no, contentSha256: p.content_sha256 }, action.id);
      return r.ok ? { ok: true, result: { href: action.preview.target.href, label: action.preview.target.label, message: `Signature request sent to ${r.recipients.join(' and ')}.` } } : { ok: false, error: r.error };
    }
    if (action.kind === 'configure_meta_tracking') {
      const p = action.payload as { funnel_id?: string; ad_account_id?: string; dataset_id?: string };
      if (!isUuid(p.funnel_id) || typeof p.ad_account_id !== 'string' || typeof p.dataset_id !== 'string') return { ok: false, error: 'The tracking request is invalid.' };
      const r = await configureFunnelTracking(meta, { funnelId: p.funnel_id, adAccountId: p.ad_account_id, datasetId: p.dataset_id }, action.id);
      return r.ok
        ? { ok: true, result: { href: `/app/funnels/${p.funnel_id}/builder`, label: r.datasetName, message: r.unchanged ? 'This dataset was already connected. No change was needed. Tracking is not verified yet: ask me to check tracking.' : `Dataset connected to the funnel. This only installs tracking; it is not verified yet. Ask me to check tracking after a visit.` } }
        : { ok: false, error: r.error };
    }
    if (action.kind === 'create_meta_dataset') {
      const p = action.payload as { ad_account_id?: string; name?: string };
      if (typeof p.ad_account_id !== 'string') return { ok: false, error: 'The request is invalid.' };
      const r = await createDataset(meta, { adAccountId: p.ad_account_id, name: String(p.name ?? 'HomeQuote Pixel') }, action.id);
      return r.ok ? { ok: true, result: { href: '/app', label: r.datasetId, message: r.created ? `Dataset ${r.datasetId} created.` : `The account already had dataset ${r.datasetId}, so it was reused and nothing new was created.` } } : { ok: false, error: r.error };
    }
  } catch {
    return { ok: false, error: 'The change could not be applied.' };
  }
  if (!action.lead_id || !hasDataAccess(profile)) return { ok: false, error: 'You no longer have access to this record.' };
  // Re-authorize against the CURRENT permissions of the signed-in user.
  const lead = await loadAccessibleLead(db, profile, action.lead_id);
  if (!lead) return { ok: false, error: 'You no longer have access to this lead.' };
  const href = `/app/leads/${action.lead_id}`;
  const label = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Lead';

  try {
    if (action.kind === 'add_note') {
      const p = notePayload.safeParse(action.payload);
      if (!p.success) return { ok: false, error: 'The proposed note is invalid.' };

      // Idempotent against a crash after the write: if this action's note already exists, report success.
      const { data: existing } = await db.from('lead_activities').select('id').eq('lead_id', action.lead_id).eq('metadata->>assistant_action_id', action.id).maybeSingle();
      if (!existing) {
        const { data, error } = await db.from('lead_activities').insert({
          lead_id: action.lead_id,
          actor_id: profile.id,
          type: 'note',
          body: composeNoteBody(p.data, deps.tz),
          // Same visibility rules as the app’s own “add note”: contractors’ notes are contractor-visible.
          visibility: profile.role === 'contractor' ? 'contractor' : 'internal',
          metadata: {
            assistant: true,
            assistant_action_id: action.id,
            ...(p.data.follow_up_on ? { follow_up_on: p.data.follow_up_on } : {}),
            ...(profile.role === 'contractor' ? { contractor_id: profile.contractor_id } : {}),
          },
        }).select('id').single();
        if (error || !data) return { ok: false, error: 'The note could not be saved.' };
      }
      return { ok: true, result: { href, label, message: p.data.follow_up_on ? 'Note and follow-up date saved on the lead.' : 'Note saved on the lead.' } };
    }

    if (action.kind === 'update_status') {
      const p = statusPayload.safeParse(action.payload);
      if (!p.success || !allowedStatusesFor(profile).includes(p.data.status)) return { ok: false, error: 'That status change is not allowed for your role.' };
      const status = p.data.status;
      const fd = new FormData();
      if (isStaff(profile)) {
        fd.set('lead_id', action.lead_id); fd.set('status', status);
        await changeLeadStatus(fd);
        const { data } = await db.from('leads').select('status').eq('id', action.lead_id).maybeSingle();
        if ((data as { status?: string } | null)?.status !== status) return { ok: false, error: 'The status could not be updated.' };
      } else {
        const tenant = tenantOf(profile);
        const { data: asg } = await db.from('lead_assignments').select('id').eq('lead_id', action.lead_id).eq('contractor_id', tenant!).maybeSingle();
        if (!asg) return { ok: false, error: 'You no longer have access to this lead.' };
        fd.set('assignment_id', (asg as { id: string }).id); fd.set('status', status);
        await updateAssignmentStatus(fd);
        const { data } = await db.from('lead_assignments').select('status').eq('id', (asg as { id: string }).id).maybeSingle();
        if ((data as { status?: string } | null)?.status !== status) return { ok: false, error: 'The status could not be updated.' };
      }
      return { ok: true, result: { href, label, message: `Status updated to ${status.replace(/_/g, ' ')}.` } };
    }
    return { ok: false, error: 'Unsupported action.' };
  } catch {
    // The existing app actions redirect/throw when permission is missing; report that without leaking details.
    return { ok: false, error: 'The change could not be applied. You may not have permission.' };
  }
}

/** Defensive: payload values must be plain strings (they came from the model and may have been edited by the user). */
function sanitizeAll(values: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (values && typeof values === 'object' && !Array.isArray(values)) for (const [k, v] of Object.entries(values as Record<string, unknown>)) if (typeof v === 'string') out[k] = v.slice(0, 6000);
  return out;
}
