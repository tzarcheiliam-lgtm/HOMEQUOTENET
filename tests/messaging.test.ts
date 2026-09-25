import { describe, expect, it } from 'vitest';
import { normalizePhone } from '@/lib/leads/normalize';
import { WORKFLOW_ACTION_CONFIG_SCHEMAS, WORKFLOW_ACTIONS, WORKFLOW_SKIP_REASONS } from '@/lib/workflows/actions';
import {
  MESSAGE_STATUSES,
  MockMessagingProvider,
  classifyInboundKeyword,
  countSmsSegments,
  isFreshTimestamp,
  mapProviderStatus,
  modeAllowsRecipient,
  nextMessageStatus,
  optStateAfterInbound,
  parseUsPhone,
  resolveMessagingMode,
  toWorkflowActionResult,
  type ProviderSendRequest,
} from '@/lib/messaging';

// Pure Phase 3 preparation tests: no database, no network, no Phase 2 runtime.

describe('parseUsPhone', () => {
  it.each([
    ['(310) 555-1212', '+13105551212'],
    ['310-555-1212', '+13105551212'],
    ['+1 310 555 1212', '+13105551212'],
    ['13105551212', '+13105551212'],
    ['310.555.1212', '+13105551212'],
    [' +1 (818) 555-2142 ', '+18185552142'],
  ])('%s -> %s', (input, e164) => {
    expect(parseUsPhone(input)).toEqual({ ok: true, e164 });
    // Must match the stored leads.phone_e164 form exactly.
    expect(normalizePhone(input)).toBe(e164);
  });

  it.each([
    ['', 'empty'],
    [null, 'empty'],
    ['abc', 'empty'],
    ['+44 20 7946 0958', 'not_us'],
    ['555-1212', 'invalid_length'],
    ['310-555-1212 ext 5', 'invalid_length'],
    ['(011) 555-1212', 'invalid_area_code'],
    ['(911) 555-1212', 'invalid_area_code'],
    ['(310) 055-1212', 'invalid_exchange'],
    ['(310) 555-0142', 'fictional'],
  ] as const)('rejects %j (%s)', (input, reason) => {
    expect(parseUsPhone(input)).toEqual({ ok: false, reason });
  });
});

describe('message statuses', () => {
  it('only moves forward and keeps the first final status', () => {
    expect(nextMessageStatus('queued', 'sent')).toBe('sent');
    expect(nextMessageStatus('sent', 'queued')).toBe('sent'); // late 'queued' callback
    expect(nextMessageStatus('sent', 'delivered')).toBe('delivered');
    expect(nextMessageStatus('queued', 'delivered')).toBe('delivered'); // 'sent' never arrived
    expect(nextMessageStatus('delivered', 'failed')).toBe('delivered');
    expect(nextMessageStatus('undelivered', 'delivered')).toBe('undelivered');
    expect(nextMessageStatus('suppressed', 'sent')).toBe('suppressed');
  });

  it('maps provider vocabularies and refuses to guess unknown ones', () => {
    expect(mapProviderStatus('telnyx', 'delivery_failed')).toBe('undelivered');
    expect(mapProviderStatus('telnyx', 'sending_failed')).toBe('failed');
    expect(mapProviderStatus('twilio', 'Accepted')).toBe('queued');
    expect(mapProviderStatus('twilio', 'undelivered')).toBe('undelivered');
    expect(mapProviderStatus('telnyx', 'teleported')).toBeNull();
    expect(mapProviderStatus('unknown-provider', 'sent')).toBeNull();
    for (const provider of ['telnyx', 'twilio', 'mock']) {
      for (const s of ['sent', 'delivered']) expect(MESSAGE_STATUSES).toContain(mapProviderStatus(provider, s));
    }
  });
});

describe('opt-out keywords', () => {
  it.each(['STOP', 'stop', ' Stop. ', 'UNSUBSCRIBE', 'cancel', 'END', 'quit', 'STOP ALL', 'opt-out', 'Revoke'])('%j opts out', (body) => {
    expect(classifyInboundKeyword(body)).toBe('opt_out');
  });

  it.each(['stop texting me', 'Please remove me from this list', "don't text me again", 'no more messages', 'take me off'])('%j opts out (reasonable means)', (body) => {
    expect(classifyInboundKeyword(body)).toBe('opt_out');
  });

  it('recognizes opt-in and help, and ignores ordinary replies', () => {
    expect(classifyInboundKeyword('START')).toBe('opt_in');
    expect(classifyInboundKeyword('unstop')).toBe('opt_in');
    expect(classifyInboundKeyword('Yes')).toBe('opt_in');
    expect(classifyInboundKeyword('HELP')).toBe('help');
    expect(classifyInboundKeyword('Yes, Tuesday at 3 works')).toBe('none');
    expect(classifyInboundKeyword('Can we reschedule? The crew should not stop by until noon')).toBe('none');
    expect(classifyInboundKeyword('')).toBe('none');
  });

  it('re-opts-in only someone who opted out; YES never creates consent', () => {
    expect(optStateAfterInbound('subscribed', 'opt_out')).toBe('opted_out');
    expect(optStateAfterInbound('unknown', 'opt_out')).toBe('opted_out');
    expect(optStateAfterInbound('opted_out', 'opt_out')).toBeNull();
    expect(optStateAfterInbound('opted_out', 'opt_in')).toBe('subscribed');
    expect(optStateAfterInbound('unknown', 'opt_in')).toBeNull();
    expect(optStateAfterInbound('opted_out', 'help')).toBeNull();
  });
});

describe('segments', () => {
  it('counts GSM-7 and UCS-2 segments', () => {
    expect(countSmsSegments('')).toEqual({ encoding: 'GSM-7', units: 0, segments: 0 });
    expect(countSmsSegments('a'.repeat(160))).toMatchObject({ encoding: 'GSM-7', segments: 1 });
    expect(countSmsSegments('a'.repeat(161))).toMatchObject({ encoding: 'GSM-7', segments: 2 });
    expect(countSmsSegments('a'.repeat(306))).toMatchObject({ segments: 2 });
    expect(countSmsSegments('a'.repeat(307))).toMatchObject({ segments: 3 });
    expect(countSmsSegments('€'.repeat(80))).toMatchObject({ encoding: 'GSM-7', units: 160, segments: 1 });
    expect(countSmsSegments('Thanks! 👍')).toMatchObject({ encoding: 'UCS-2', segments: 1 });
    expect(countSmsSegments('Let’s find a new time'.repeat(4))).toMatchObject({ encoding: 'UCS-2', segments: 2 }); // curly quote
  });
});

describe('safe send mode', () => {
  it('is disabled unless explicitly configured', () => {
    expect(resolveMessagingMode({}).mode).toBe('disabled');
    expect(resolveMessagingMode({ MESSAGING_MODE: 'loud' })).toMatchObject({ mode: 'disabled' });
    expect(resolveMessagingMode({ MESSAGING_MODE: 'mock' }).mode).toBe('mock');
  });

  it('never goes live outside Vercel production', () => {
    expect(resolveMessagingMode({ MESSAGING_MODE: 'live', MESSAGING_TEST_ALLOWLIST: '3105551212' }).mode).toBe('allowlist');
    expect(resolveMessagingMode({ MESSAGING_MODE: 'live', VERCEL_ENV: 'preview' }).mode).toBe('disabled');
    expect(resolveMessagingMode({ MESSAGING_MODE: 'live', VERCEL_ENV: 'production' }).mode).toBe('live');
  });

  it('allowlist mode only reaches listed numbers', () => {
    const config = resolveMessagingMode({ MESSAGING_MODE: 'allowlist', MESSAGING_TEST_ALLOWLIST: '(310) 555-1212, junk' });
    expect([...config.allowlist]).toEqual(['+13105551212']);
    expect(modeAllowsRecipient(config, '+13105551212')).toBe('allowed');
    expect(modeAllowsRecipient(config, '+18185559999')).toBe('not_allowlisted');
    expect(modeAllowsRecipient(resolveMessagingMode({}), '+13105551212')).toBe('messaging_disabled');
  });
});

describe('workflow action result mapping (Phase 1 contract)', () => {
  const now = new Date('2026-09-24T18:00:00Z');

  it('uses only Phase 1 outcomes and skip reasons', () => {
    const accepted = toWorkflowActionResult(
      { outcome: 'accepted', messageId: 'm1', status: 'queued', provider: { provider: 'mock', providerMessageId: 'mock_1' }, sentAt: null, replayed: false },
      now
    );
    expect(accepted).toMatchObject({ outcome: 'success', provider: { providerMessageId: 'mock_1' } });
    for (const reason of ['opted_out', 'no_consent', 'invalid_phone', 'no_sender', 'not_allowlisted', 'messaging_disabled'] as const) {
      const r = toWorkflowActionResult({ outcome: 'suppressed', messageId: null, reason }, now);
      expect(r.outcome).toBe('skipped');
      if (r.outcome === 'skipped') expect(WORKFLOW_SKIP_REASONS).toContain(r.reason);
    }
    expect(toWorkflowActionResult({ outcome: 'suppressed', messageId: null, reason: 'opted_out' }, now)).toEqual({ outcome: 'skipped', reason: 'no_consent' });
  });

  it('maps provider failures to temporary/permanent and quiet hours to a retry-after', () => {
    expect(toWorkflowActionResult({ outcome: 'failed', messageId: 'm', error: { code: 'rate_limited', message: 'Slow down', kind: 'temporary', retryAfterSeconds: 30 } }, now))
      .toMatchObject({ outcome: 'temporary_failure', retryAfterSeconds: 30, error: { retryable: true } });
    expect(toWorkflowActionResult({ outcome: 'failed', messageId: 'm', error: { code: 'invalid_recipient', message: 'Landline', kind: 'permanent' } }, now))
      .toMatchObject({ outcome: 'permanent_failure', error: { retryable: false } });
    expect(toWorkflowActionResult({ outcome: 'deferred', messageId: null, notBefore: '2026-09-24T19:00:00Z' }, now))
      .toMatchObject({ outcome: 'temporary_failure', retryAfterSeconds: 3600, error: { code: 'quiet_hours' } });
  });

  it('builds on the single Phase 1 send_sms contract', () => {
    expect(WORKFLOW_ACTIONS.send_sms.availability).toBe('contract_only');
    expect(WORKFLOW_ACTION_CONFIG_SCHEMAS.send_sms.safeParse({ body: 'Hi {{lead.first_name}}' }).success).toBe(true);
  });
});

describe('mock provider', () => {
  const sender = { id: 's1', contractorId: null, provider: 'mock', channel: 'sms' as const, address: '+13105550000', providerProfileId: null };
  const request = (key: string): ProviderSendRequest => ({
    from: sender, to: '+13105551212', body: 'Hi there', channel: 'sms', messageId: `msg-${key}`, idempotencyKey: key, statusCallbackUrl: null,
  });

  it('sends in memory and dedupes by idempotency key', async () => {
    const p = new MockMessagingProvider();
    const a = await p.send(request('run-1:welcome_sms:0'));
    const b = await p.send(request('run-1:welcome_sms:0'));
    expect(a).toMatchObject({ ok: true, providerMessageId: 'mock_1', status: 'queued', cost: { segments: 1 } });
    expect(b).toMatchObject({ ok: true, providerMessageId: 'mock_1' });
    expect(p.sent).toHaveLength(1);
  });

  it('returns scripted failures in normalized form', async () => {
    const p = new MockMessagingProvider({ failures: [{ code: 'provider_timeout', message: 'Timed out', kind: 'temporary' }] });
    expect(await p.send(request('k1'))).toMatchObject({ ok: false, error: { kind: 'temporary' } });
    expect(await p.send(request('k1'))).toMatchObject({ ok: true });
  });

  it('verifies webhook signatures and rejects replays', () => {
    const p = new MockMessagingProvider({ webhookSecret: 'test-secret' });
    const now = new Date('2026-09-24T18:00:00Z');
    const hook = p.signedWebhook({ type: 'message.status', message_id: 'mock_1', status: 'delivered', occurred_at: now.toISOString() }, now);
    expect(p.verifyWebhook(hook)).toEqual({ ok: true });
    expect(p.verifyWebhook({ ...hook, rawBody: hook.rawBody.replace('delivered', 'failed') })).toEqual({ ok: false, reason: 'bad_signature' });
    expect(p.verifyWebhook({ ...hook, receivedAt: new Date(now.getTime() + 10 * 60_000) })).toEqual({ ok: false, reason: 'stale' });
    expect(p.verifyWebhook({ ...hook, headers: {} })).toEqual({ ok: false, reason: 'missing_signature' });
    expect(new MockMessagingProvider().verifyWebhook(hook)).toEqual({ ok: false, reason: 'misconfigured' });
    expect(isFreshTimestamp('not-a-number', now)).toBe(false);
  });

  it('normalizes inbound messages and delivery receipts', () => {
    const p = new MockMessagingProvider({ webhookSecret: 's' });
    const at = '2026-09-24T18:00:00.000Z';
    expect(p.normalizeWebhook(p.signedWebhook({ type: 'message.received', message_id: 'in_1', from: '+13105551212', to: '+13105550000', text: 'STOP', occurred_at: at })))
      .toEqual({ kind: 'inbound', message: { provider: 'mock', providerMessageId: 'in_1', channel: 'sms', from: '+13105551212', to: '+13105550000', body: 'STOP', mediaCount: 0, receivedAt: at, segments: 1 } });
    expect(p.normalizeWebhook(p.signedWebhook({ type: 'message.status', id: 'evt_9', message_id: 'mock_1', status: 'undelivered', occurred_at: at, error: { code: '30003', message: 'Unreachable' } })))
      .toMatchObject({ kind: 'delivery', update: { providerEventId: 'evt_9', status: 'undelivered', providerStatus: 'undelivered' } });
    expect(p.normalizeWebhook(p.signedWebhook({ type: 'message.status', message_id: 'mock_1', status: 'weird', occurred_at: at })))
      .toEqual({ kind: 'ignored', reason: 'unknown_status:weird' });
    expect(p.normalizeWebhook({ headers: {}, rawBody: '{nope', receivedAt: new Date() })).toEqual({ kind: 'ignored', reason: 'invalid_json' });
  });
});
