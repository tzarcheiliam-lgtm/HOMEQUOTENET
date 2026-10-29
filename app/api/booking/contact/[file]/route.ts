/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from the untyped Supabase client, as elsewhere in lib/data */
import { createAdminClient } from '@/lib/supabase/admin';
import { getCalendar } from '@/lib/booking/calendars.server';
import { hostVCardFilename, resolveHostContact } from '@/lib/booking/host-contact';
import { hostPhotoBase64 } from '@/lib/booking/host-photo.server';
import { buildHostVCard } from '@/lib/booking/vcard';
import { site } from '@/content/site';
import { limited } from '../../_lib/http';

/**
 * GET /api/booking/contact/<calendarId>.vcf — "Save Liam's number": a vCard
 * 3.0 of the calendar's host contact (name, company, number, optional email,
 * site, a note, and the logo as a square JPEG), served inline so iOS and
 * Android open their own "Add contact" sheet. Public, like the business card
 * it is: it exposes only the host's business details stored on the calendar
 * (never a homeowner or a booking), for an active calendar with a number.
 * Lightly rate limited; cached for an hour (the owner may change the card).
 */
export const dynamic = 'force-dynamic';

const FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.vcf$/i;

const notFound = () => new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } });

/** RFC 6266: an ASCII fallback plus the UTF-8 name. */
function disposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '').replace(/["\\]/g, '');
  return `inline; filename="${ascii || 'contact.vcf'}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = FILE.exec(file);
  if (!m) return notFound();
  if (limited(request, 'contact')) {
    return new Response('Too many requests', { status: 429, headers: { 'Retry-After': '60', 'Cache-Control': 'no-store' } });
  }
  try {
    const db = createAdminClient();
    const cal = await getCalendar(m[1].toLowerCase(), db);
    if (!cal || !cal.active) return notFound();
    const host = resolveHostContact(cal);
    if (!host?.phone) return notFound();
    let url: string = site.url;
    if (cal.kind === 'contractor' && cal.contractorId) {
      const { data } = await db.from('contractors').select('website').eq('id', cal.contractorId).maybeSingle();
      const website = String((data as any)?.website ?? '').trim();
      if (/^https:\/\/[^\s]+$/i.test(website)) url = website;
    }
    const origin = new URL(request.url).origin;
    const photo = await hostPhotoBase64(host.photoPath, origin);
    const card = buildHostVCard({ host, minutes: cal.durationMinutes, url, photo: photo ? { type: 'JPEG', base64: photo } : null });
    if (!card) return notFound();
    return new Response(card, {
      status: 200,
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': disposition(hostVCardFilename(host)),
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer',
        'X-Robots-Tag': 'noindex',
      },
    });
  } catch (error) {
    console.error('[booking-contact] failed', error instanceof Error ? error.name : 'unknown');
    return new Response('Temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } });
  }
}
