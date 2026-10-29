import { icsForManageToken } from '@/lib/booking/notify.server';
import { limited } from '@/app/api/booking/_lib/http';

/**
 * GET /booking/manage/<token>/calendar.ics — "Add to Apple / Outlook calendar"
 * from the confirmation screen, the manage page and the emails (the same
 * invite the emails attach: same UID, so adding it again after a reschedule
 * updates the event; a cancelled call downloads as cancelled). Served inline
 * so iOS Safari opens its "Add to Calendar" sheet instead of a download. A plain link,
 * so no Origin check: the 256-bit token is the only gate.
 */
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ token: string }> };

const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex' };

export async function GET(request: Request, context: Context) {
  if (limited(request, 'manageRead')) return new Response('Too many requests', { status: 429, headers });
  const { token } = await context.params;
  try {
    const body = await icsForManageToken(token);
    if (!body) return new Response('Not found', { status: 404, headers });
    return new Response(body, {
      headers: { ...headers, 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'inline; filename="call.ics"' },
    });
  } catch {
    return new Response('Unavailable', { status: 503, headers });
  }
}
