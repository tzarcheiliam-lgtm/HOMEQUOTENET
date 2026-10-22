import { NextResponse } from 'next/server';
import { isAnthropicConfigured, isAssistantEnabled } from '@/lib/assistant/config';
import { getAssistantSession } from '@/lib/assistant/session';

export const dynamic = 'force-dynamic';

/** Lets the panel show a clear setup state instead of failing on the first message. Never exposes the key. */
export async function GET() {
  const s = await getAssistantSession();
  if (!s.ok) return NextResponse.json({ available: false, code: s.code }, { status: s.status });
  return NextResponse.json({ available: true, enabled: isAssistantEnabled(), configured: isAnthropicConfigured() });
}
