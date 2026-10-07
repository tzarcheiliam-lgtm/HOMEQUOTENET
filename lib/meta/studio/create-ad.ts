import { buildPlan, draftTag, type DraftConfig, type PlanInput, type PlanStep, type StepName } from './draft';
import type { MetaWriter } from './write-api';
import { redactSecrets, type GraphFailure } from '@/lib/meta/marketing-api';

/**
 * Paused ad creation as a resumable pipeline: media -> campaign -> ad set -> creative -> ad.
 *
 * Guarantees (each covered by tests/meta-studio-create.test.ts against a fake writer):
 *  - Everything is created PAUSED.
 *  - Each created id is persisted the moment Meta returns it, so a crash or retry resumes after that step.
 *  - Before posting a step, and again after any ambiguous failure (timeout / 5xx), the executor looks for an
 *    object whose name carries this draft's tag. If it exists it is adopted, never re-created.
 *  - A hard failure stops the pipeline and reports exactly which steps exist in Meta ('partial'); nothing is
 *    deleted automatically - the human decides whether to clean up or retry.
 *  - Concurrent submissions are prevented upstream by the atomic claim_meta_draft() status transition.
 */

export type CreatedObjects = Partial<Record<'image_hash' | 'video_id' | 'campaign_id' | 'adset_id' | 'creative_id' | 'ad_id', string>>;

export interface DraftStore {
  saveObjects(patch: CreatedObjects): Promise<void>;
}

export type MediaSource =
  | { kind: 'image'; bytesBase64: () => Promise<string> }
  | { kind: 'video'; signedUrl: () => Promise<string> };

export type ExecuteInput = {
  accountId: string; // act_...
  name: string;
  idempotencyKey: string;
  config: DraftConfig;
  currency: string;
  destination: PlanInput['destination'];
  /** Media already uploaded to THIS account (from the creative library), if any. */
  existing: CreatedObjects;
  media: MediaSource;
  thumbnailUrl?: string | null;
  writer: MetaWriter;
  store: DraftStore;
};

export type ExecuteResult =
  | { status: 'created_paused'; objects: CreatedObjects; adStatus: { status?: string; effective_status?: string; review_feedback?: unknown } | null }
  | { status: 'partial' | 'failed'; objects: CreatedObjects; failedStep: StepName; failure: GraphFailure; message: string };

const ID_KEY: Record<StepName, keyof CreatedObjects> = {
  media: 'image_hash', campaign: 'campaign_id', adset: 'adset_id', creative: 'creative_id', ad: 'ad_id',
};

export async function executeDraft(input: ExecuteInput): Promise<ExecuteResult> {
  const tag = draftTag(input.idempotencyKey);
  const have: CreatedObjects = { ...input.existing };
  const acct = input.accountId;
  const isVideo = input.media.kind === 'video';

  const fail = (step: StepName, failure: GraphFailure): ExecuteResult => ({
    status: Object.keys(have).some((k) => have[k as keyof CreatedObjects]) ? 'partial' : 'failed',
    objects: have, failedStep: step, failure, message: redactSecrets(failure.message),
  });

  const buildSteps = async (): Promise<PlanStep[]> => buildPlan({
    name: input.name, tag, config: input.config, currency: input.currency, have, creativeKind: isVideo ? 'video' : 'image',
    mediaUrl: input.media.kind === 'video' ? await input.media.signedUrl() : undefined, thumbnailUrl: input.thumbnailUrl ?? null, destination: input.destination,
  });

  // Look up an object this draft already created (adopt instead of duplicate).
  const findExisting = async (step: PlanStep): Promise<string | null> => {
    if (!step.findByName) return null;
    const r = await input.writer.get<{ data?: { id: string; name?: string }[] }>(`${acct}/${step.object}`, {
      fields: 'id,name', limit: '25', filtering: JSON.stringify([{ field: 'name', operator: 'CONTAIN', value: tag }]),
    });
    if (!r.ok) return null;
    return (r.data.data ?? []).find((o) => o.name === step.findByName)?.id ?? null;
  };

  const order: StepName[] = ['media', 'campaign', 'adset', 'creative', 'ad'];
  for (const name of order) {
    const planned = (await buildSteps()).find((s) => s.step === name);
    if (!planned) continue; // e.g. campaign/adset when reusing existing objects
    if (name === 'media' ? (isVideo ? have.video_id : have.image_hash) : have[ID_KEY[name]]) continue;

    if (name === 'media') {
      if (input.media.kind === 'image') {
        // Image upload is content-addressed by Meta (same bytes -> same hash), so repeating it is harmless.
        const r = await input.writer.post<{ images?: Record<string, { hash?: string }> }>(`${acct}/adimages`, { bytes: await input.media.bytesBase64() });
        if (!r.ok) return fail(name, r.failure);
        const hash = Object.values(r.data.images ?? {})[0]?.hash;
        if (!hash) return fail(name, { kind: 'unknown', retryable: false, httpStatus: null, code: null, subcode: null, message: 'Meta returned no image hash', fbtraceId: null });
        have.image_hash = hash;
        await input.store.saveObjects({ image_hash: hash });
      } else {
        const listed = await input.writer.get<{ data?: { id: string; title?: string }[] }>(`${acct}/advideos`, { fields: 'id,title', limit: '50' });
        const found = listed.ok ? (listed.data.data ?? []).find((v) => v.title === input.name || (v.title ?? '').includes(tag))?.id : undefined;
        if (found) have.video_id = found;
        else {
          const r = await input.writer.post<{ id?: string }>(`${acct}/advideos`, { ...planned.body, title: `${input.name} [${tag}]` });
          if (!r.ok) {
            if (r.ambiguous) {
              const again = await input.writer.get<{ data?: { id: string; title?: string }[] }>(`${acct}/advideos`, { fields: 'id,title', limit: '50' });
              const f2 = again.ok ? (again.data.data ?? []).find((v) => (v.title ?? '').includes(tag))?.id : undefined;
              if (!f2) return fail(name, r.failure);
              have.video_id = f2;
            } else return fail(name, r.failure);
          } else if (r.data.id) have.video_id = r.data.id;
          else return fail(name, { kind: 'unknown', retryable: false, httpStatus: null, code: null, subcode: null, message: 'Meta returned no video id', fbtraceId: null });
        }
        await input.store.saveObjects({ video_id: have.video_id });
      }
      continue;
    }

    // Adopt an object left behind by an earlier attempt before creating anything.
    let id = await findExisting(planned);
    if (!id) {
      const r = await input.writer.post<{ id?: string }>(`${acct}/${planned.object}`, planned.body);
      if (r.ok) id = r.data.id ?? null;
      else if (r.ambiguous) {
        id = await findExisting(planned); // it may have been created despite the error
        if (!id) return fail(name, r.failure);
      } else return fail(name, r.failure);
      if (!id) return fail(name, { kind: 'unknown', retryable: false, httpStatus: null, code: null, subcode: null, message: `Meta returned no ${name} id`, fbtraceId: null });
    }
    have[ID_KEY[name]] = id;
    await input.store.saveObjects({ [ID_KEY[name]]: id });
  }

  // Ask Meta what it says now. Created-paused is not "approved" and not "delivering".
  let adStatus: { status?: string; effective_status?: string; review_feedback?: unknown } | null = null;
  if (have.ad_id) {
    const r = await input.writer.get<{ status?: string; effective_status?: string; ad_review_feedback?: unknown }>(have.ad_id, { fields: 'status,effective_status,ad_review_feedback' });
    if (r.ok) adStatus = { status: r.data.status, effective_status: r.data.effective_status, review_feedback: r.data.ad_review_feedback };
  }
  return { status: 'created_paused', objects: have, adStatus };
}
