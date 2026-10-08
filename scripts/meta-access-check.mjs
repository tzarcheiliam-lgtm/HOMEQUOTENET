/**
 * READ-ONLY Meta access check. Answers: can this token reach the ad account and datasets, where does the access actually
 * live (your personal profile, HQN's Business Portfolio, or both), and if something is missing, who must do what.
 *
 *   META_MARKETING_ACCESS_TOKEN=... node scripts/meta-access-check.mjs --account act_1234567890 \
 *       [--hqn-business-id 1234] [--dataset 933962709362966 --dataset <crm id>] \
 *       [--also-token-env META_PERSONAL_TOKEN]            # a second token (e.g. your own user token) to compare against
 *       [--conversions-token-env META_CONVERSIONS_API_TOKEN]   # read-only: can it SEE each dataset (sending is not tested)
 *
 * Tokens are read ONLY from environment variables (never as arguments, never printed - all output is scrubbed of them).
 * Needs Node >= 22.18 (runs the TypeScript sources directly). Every request is a GET. It sends no events and edits nothing.
 */
import { runAccessCheck, whereDoesAccessLive } from '../lib/meta/access-check.ts';
import { graphGet, graphGetAll } from '../lib/meta/marketing-api.ts';

const argv = process.argv.slice(2);
const opt = (name, many = false) => { const out = []; for (let i = 0; i < argv.length; i++) if (argv[i] === `--${name}` && argv[i + 1]) out.push(argv[++i]); return many ? out : out[0]; };
const tokenEnv = opt('token-env') ?? 'META_MARKETING_ACCESS_TOKEN';
const alsoEnv = opt('also-token-env');
const convEnv = opt('conversions-token-env') ?? 'META_CONVERSIONS_API_TOKEN';
const secrets = [tokenEnv, alsoEnv, convEnv, 'META_APP_SECRET'].filter(Boolean).map((n) => process.env[n]).filter(Boolean);
const scrub = (s) => secrets.reduce((t, x) => t.split(x).join('[redacted]'), String(s));
const say = (s = '') => console.log(scrub(s));

function readers(token) {
  const get = (path, params = {}, override) => {
    const p = { ...params };
    if (p.input_token === '__SELF__') { p.input_token = token; p.access_token = override; } // debug_token: app token inspects this token
    return graphGet(path, p, { token: override ?? token });
  };
  return { get, getAll: (path, params = {}) => graphGetAll(path, params, { token }) };
}

async function run(envName) {
  const token = process.env[envName];
  if (!token) { say(`\n[${envName}] not set - skipped`); return null; }
  const { get, getAll } = readers(token);
  const datasets = (opt('dataset', true) ?? []).map((id) => ({ id, role: 'given on the command line' }));
  const result = await runAccessCheck(get, getAll, {
    appId: process.env.META_APP_ID, appSecret: process.env.META_APP_SECRET, targetAccountId: opt('account'), hqnBusinessId: opt('hqn-business-id'),
    datasets, readDatasetWithToken: process.env[convEnv] ?? null,
  });
  say(`\n=== ${envName} ===`);
  for (const c of result.checks) {
    say(`${{ pass: 'PASS', fail: 'FAIL', warn: 'WARN', skip: 'SKIP' }[c.status]}  ${c.title}\n      ${c.detail}`);
    if (c.action) say(`      -> ${c.action.who}: ${c.action.what}`);
  }
  return result;
}

const a = await run(tokenEnv);
const b = alsoEnv ? await run(alsoEnv) : null;
if (a && b) { const w = whereDoesAccessLive(b, a); say(`\nWHERE THE ACCESS LIVES: ${w.verdict}\n${w.explanation}`); }
process.exitCode = [a, b].some((r) => r?.checks.some((c) => c.status === 'fail')) ? 1 : 0;
