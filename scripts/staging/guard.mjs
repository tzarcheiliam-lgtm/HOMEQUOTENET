/**
 * Refuses to run staging verification against anything that could be production, or with
 * external actions enabled. Pure function (tested); the CLI scripts call it first.
 *
 * Required environment:
 *   STAGING_PROJECT_REF   the staging Supabase project ref; must appear in SUPABASE_DB_URL
 *   STAGING_CONFIRM       the literal text below (a deliberate, typed acknowledgement)
 *   SUPABASE_DB_URL       direct connection string of the STAGING database
 * Refused when:
 *   - any URL/ref in the environment mentions the production project or homequotenet.com
 *   - AI_CALLING_GLOBAL_ENABLED=true (a staging check must not be able to dial anyone)
 *   - FISH_API_KEY is set (provider credentials must not be present while checking)
 */
export const PRODUCTION_MARKERS = ['fzglejpmxriohuyalcjt', 'homequotenet.com'];
export const CONFIRM_TEXT = 'I-understand-this-is-not-production';

export function assertStagingSafe(env) {
  const problems = [];
  const joined = Object.entries(env)
    .filter(([k]) => /URL|REF|HOST|DOMAIN|SITE/i.test(k))
    .map(([, v]) => String(v ?? ''))
    .join('\n')
    .toLowerCase();
  for (const marker of PRODUCTION_MARKERS) {
    if (joined.includes(marker)) problems.push(`environment mentions production (${marker})`);
  }
  if (!env.SUPABASE_DB_URL) problems.push('SUPABASE_DB_URL is not set');
  if (!env.STAGING_PROJECT_REF) problems.push('STAGING_PROJECT_REF is not set');
  else if (env.SUPABASE_DB_URL && !String(env.SUPABASE_DB_URL).includes(env.STAGING_PROJECT_REF)) problems.push('SUPABASE_DB_URL does not belong to STAGING_PROJECT_REF');
  if (env.STAGING_CONFIRM !== CONFIRM_TEXT) problems.push(`STAGING_CONFIRM must be exactly "${CONFIRM_TEXT}"`);
  if (String(env.AI_CALLING_GLOBAL_ENABLED ?? '').toLowerCase() === 'true') problems.push('AI_CALLING_GLOBAL_ENABLED=true: external calling must stay disabled');
  if (env.FISH_API_KEY) problems.push('FISH_API_KEY is set: provider credentials must not be present during staging checks');
  return { ok: problems.length === 0, problems };
}
