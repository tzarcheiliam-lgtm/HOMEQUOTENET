import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { canSetUpMeta, connectionOwner, logSetup, saveConnection } from '@/lib/meta/setup/connections';
import { metaAppConfig, metaConnectReady } from '@/lib/meta/setup/config';
import { STATE_COOKIE, describeOAuthError, exchangeCode, inspectToken, verifyState } from '@/lib/meta/setup/oauth';
import { graphGet } from '@/lib/meta/marketing-api';

export const dynamic = 'force-dynamic';

const REQUIRED = ['ads_read'];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const profile = await getProfile().catch(() => null);
  const cfg = metaAppConfig();
  const cookieNonce = request.headers.get('cookie')?.split(/;\s*/).find(c => c.startsWith(`${STATE_COOKIE}=`))?.slice(STATE_COOKIE.length + 1) ?? null;
  const done = (returnPath: string, status: string) => {
    const res = NextResponse.redirect(new URL(`${returnPath}${returnPath.includes('?') ? '&' : '?'}meta=${status}`, request.url));
    res.cookies.set(STATE_COOKIE, '', { path: '/api/integrations/meta/connect', maxAge: 0 });
    return res;
  };
  if (!profile || !canSetUpMeta(profile) || !cfg || !metaConnectReady()) return done('/app', 'forbidden');

  const state = verifyState(cfg.appSecret, url.searchParams.get('state'), cookieNonce, profile.id);
  if (!state) return done('/app', 'invalid_state');
  // The company the connection will belong to is fixed by the signed state AND must still match this user.
  if (state.c !== connectionOwner(profile)) return done(state.r, 'invalid_state');
  if (url.searchParams.get('error')) return done(state.r, 'denied');
  const code = url.searchParams.get('code');
  if (!code) return done(state.r, 'denied');

  try {
    const { token, expiresInSec } = await exchangeCode(cfg, code);
    const info = await inspectToken(cfg, token);
    // Reject a token that is invalid, was issued to a different app, or lacks the minimum permission.
    if (!info.isValid || info.appId !== cfg.appId || !info.userId || !REQUIRED.every(s => info.scopes.includes(s))) return done(state.r, 'insufficient_permission');
    const me = await graphGet<{ id: string; name?: string }>('me', { fields: 'id,name' }, { token, maxRetries: 1 }).catch(() => null);
    const connectionId = await saveConnection(createAdminClient(), {
      contractorId: connectionOwner(profile), connectedBy: profile.id, metaUserId: info.userId, metaUserName: me?.name ?? null, scopes: info.scopes,
      expiresAt: info.expiresAt ?? (expiresInSec ? new Date(Date.now() + expiresInSec * 1000) : null), token,
    });
    await logSetup(createAdminClient(), { actor: profile.id, contractorId: connectionOwner(profile), connectionId, action: 'meta_connected', metadata: { scopes: info.scopes, level: state.lvl } });
    return done(state.r, 'connected');
  } catch (e) {
    console.error('[meta-connect] failed:', describeOAuthError(e));
    return done(state.r, 'failed');
  }
}
