import 'server-only';
import { NextResponse } from 'next/server';
import { equalSecret } from '@/lib/funnels/server';
import { smsBridgeToken } from './config';

/** The Mac bridge authenticates with a long shared token. Returns a response to send back when it does not. */
export function bridgeUnauthorized(request: Request): NextResponse | null {
  const token = smsBridgeToken();
  if (token.length < 24 || !equalSecret(request.headers.get('authorization') ?? '', `Bearer ${token}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
