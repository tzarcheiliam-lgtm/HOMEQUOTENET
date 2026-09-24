import 'server-only';

/**
 * Optional server-side confirmation of a Calendly booking reported by the
 * inline embed. With CALENDLY_API_TOKEN (a Calendly personal access token) the
 * invitee and event are fetched from Calendly to confirm they exist and to get
 * the real start time. Without it the booking is recorded as unverified; the
 * lead itself was already saved when the contact form was submitted.
 */
export async function verifyCalendlyBooking(eventUri: string, inviteeUri: string, fetcher: typeof fetch = fetch):
  Promise<{ verified: boolean; startTime: string | null }> {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token || !inviteeUri.startsWith(`${eventUri}/invitees/`)) return { verified: false, startTime: null };
  const get = async (uri: string) => {
    const res = await fetcher(uri, { headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Calendly returned HTTP ${res.status}`);
    return (await res.json()).resource;
  };
  try {
    const [invitee, event] = await Promise.all([get(inviteeUri), get(eventUri)]);
    const ok = invitee?.event === eventUri && invitee?.status === 'active' && event?.status === 'active';
    return { verified: ok, startTime: ok && typeof event.start_time === 'string' ? event.start_time : null };
  } catch (error) {
    console.error('[funnel-calendly] Verification unavailable', error instanceof Error ? error.message : 'unknown');
    return { verified: false, startTime: null };
  }
}
