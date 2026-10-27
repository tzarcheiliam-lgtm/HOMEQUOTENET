import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { fullSchema } from './helpers/full-migrations';
import { fakeSupabase } from './helpers/pglite-supabase';
import type { Profile } from '@/lib/types';

/**
 * The shared prospect-email send path against every real migration (PGlite),
 * with Gmail mocked: guardrails refuse before anything is sent, and a send is
 * logged pending → sent with the sender's own signature and the opt-out line.
 */
const h = vi.hoisted(() => ({ client: null as unknown, sent: [] as Record<string, unknown>[], fail: false }));
vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => h.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => h.client }));
vi.mock('@/lib/emails/gmail', () => ({
  resolveGmailSender: async () => ({ email: 'sam@homequotenet.com' }),
  sendGmailMessage: async (input: Record<string, unknown>) => {
    if (h.fail) throw new Error('Invalid recipient');
    h.sent.push(input);
    return { id: `gmail-${h.sent.length}`, fromEmail: 'sam@homequotenet.com' };
  },
}));

const id = {
  sam: '00000000-0000-4000-8000-00000063aa01',
  other: '00000000-0000-4000-8000-00000063aa02',
  p: '00000000-0000-4000-8000-00000063bb01',
  dnc: '00000000-0000-4000-8000-00000063bb02',
  optout: '00000000-0000-4000-8000-00000063bb03',
  theirs: '00000000-0000-4000-8000-00000063bb04',
};
const sam = { id: id.sam, role: 'setter', full_name: 'Sam Setter', email: 'sam@x.test', phone: '(555) 222-3333' } as Profile;

let db: PGlite;
let core: typeof import('@/lib/emails/prospect-send.server');

const send = (over: Partial<Parameters<typeof core.sendProspectEmailCore>[1]> = {}) =>
  core.sendProspectEmailCore(sam, {
    prospectId: id.p,
    recipientName: 'Dana Ruiz',
    recipientEmail: 'Dana@Blue.com',
    templateKey: 'call_voicemail_follow_up',
    subject: 'Sorry I missed you',
    message: 'Hi Dana,\n\nJust left you a voicemail.',
    serviceInterests: ['pool remodeling'],
    ...over,
  });

beforeAll(async () => {
  db = await fullSchema();
  h.client = fakeSupabase(db);
  core = await import('@/lib/emails/prospect-send.server');
  for (const uid of [id.sam, id.other]) {
    await db.query('insert into auth.users (id, email) values ($1, $2)', [uid, `${uid}@send.test`]);
    await db.query(`update public.profiles set role = 'setter', is_active = true, account_status = 'active' where id = $1`, [uid]);
  }
  await db.query(
    `insert into public.contractor_prospects (id, company_name, assigned_to, disposition, email) values
       ($1, 'Blue Lagoon Pools', $5, 'left_voicemail', 'info@blue.com'),
       ($2, 'No Call Co', $5, 'do_not_call', null),
       ($3, 'Stop Emails Inc', $5, 'interested', null),
       ($4, 'Not Yours LLC', $6, 'interested', null)`,
    [id.p, id.dnc, id.optout, id.theirs, id.sam, id.other]
  );
  await db.query('update public.contractor_prospects set email_opt_out_at = now() where id = $1', [id.optout]);
}, 120000);

beforeEach(() => {
  h.sent = [];
  h.fail = false;
});

describe('sendProspectEmailCore', () => {
  it('sends with the sender’s signature and opt-out line, logs it sent, saves the contact', async () => {
    expect(await send()).toEqual({ ok: true, message: 'Email sent to Dana@Blue.com' });
    expect(h.sent).toHaveLength(1);
    const msg = h.sent[0] as { toEmail: string; fromName: string; html: string; text: string };
    expect(msg.toEmail).toBe('dana@blue.com');
    expect(msg.fromName).toBe('Sam Setter · HomeQuote Network');
    expect(msg.html).toContain('>Sam Setter</div>');
    expect(msg.text).toContain('Reply "stop"');
    const { rows: logs } = await db.query<{ status: string; provider_message_id: string; template_key: string }>(
      'select status, provider_message_id, template_key from public.prospect_email_logs where prospect_id = $1',
      [id.p]
    );
    expect(logs).toEqual([{ status: 'sent', provider_message_id: 'gmail-1', template_key: 'call_voicemail_follow_up' }]);
    const { rows: [p] } = await db.query<{ decision_maker_email: string; decision_maker_name: string }>(
      'select decision_maker_email, decision_maker_name from public.contractor_prospects where id = $1',
      [id.p]
    );
    expect(p).toEqual({ decision_maker_email: 'dana@blue.com', decision_maker_name: 'Dana Ruiz' });
  });

  it('asks before sending the same template to the same company within a week', async () => {
    const again = await send();
    expect(again).toMatchObject({ ok: false, repeat: true });
    expect(again && !again.ok && again.error).toMatch(/already got this email earlier today \(from Sam Setter\)/);
    expect(h.sent).toHaveLength(0);
    expect(await send({ allowRepeat: true })).toMatchObject({ ok: true });
    // A different template is not a repeat.
    expect(await send({ templateKey: 'more_info_after_call' })).toMatchObject({ ok: true });
  });

  it('refuses do-not-call, opted-out, and other people’s prospects without sending', async () => {
    expect(await send({ prospectId: id.dnc })).toMatchObject({ ok: false, error: expect.stringMatching(/do not call/) });
    expect(await send({ prospectId: id.optout })).toMatchObject({ ok: false, error: expect.stringMatching(/asked not to be emailed/) });
    expect(await send({ prospectId: id.theirs })).toMatchObject({ ok: false, error: expect.stringMatching(/not assigned to you/) });
    expect(h.sent).toHaveLength(0);
  });

  it('logs a Gmail failure as failed, never sent', async () => {
    h.fail = true;
    const r = await send({ templateKey: 'call_if_anything_changes' });
    expect(r).toMatchObject({ ok: false, contactSaved: true, error: expect.stringMatching(/Invalid recipient/) });
    const { rows } = await db.query<{ status: string; error_message: string }>(
      `select status, error_message from public.prospect_email_logs where template_key = 'call_if_anything_changes'`
    );
    expect(rows).toEqual([{ status: 'failed', error_message: 'Invalid recipient' }]);
  });

  it('stops at the daily cap', async () => {
    await db.query(
      `insert into public.prospect_email_logs (prospect_id, company_name, sender_user_id, sender_email, recipient_email, template_key, subject, message, status, sent_at, provider_message_id)
       select $1, 'Blue Lagoon Pools', $2, 'sam@homequotenet.com', 'x@y.z', 'bulk_' || g, 's', 'm', 'sent', now(), 'bulk-' || g
       from generate_series(1, $3::int) g`,
      [id.p, id.sam, core.DAILY_SEND_CAP]
    );
    expect(await send({ templateKey: 'call_gatekeeper_intro' })).toMatchObject({ ok: false, error: expect.stringMatching(/daily limit/) });
    expect(h.sent).toHaveLength(0);
  });
});

describe('0063 email opt-out guard', () => {
  async function as<T>(userId: string, fn: () => Promise<T>): Promise<T> {
    await db.exec('begin');
    try {
      await db.query(`select set_config('app.uid', $1, true)`, [userId]);
      const out = await fn();
      await db.exec('commit');
      return out;
    } catch (e) {
      await db.exec('rollback');
      throw e;
    }
  }

  it('a setter can record an opt-out but not lift one', async () => {
    await as(id.sam, () => db.query('update public.contractor_prospects set email_opt_out_at = now() where id = $1', [id.p]));
    await expect(as(id.sam, () => db.query('update public.contractor_prospects set email_opt_out_at = null where id = $1', [id.p]))).rejects.toThrow(/administrator/);
  });
});
