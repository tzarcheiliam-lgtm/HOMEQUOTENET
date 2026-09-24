import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyMetaSignature } from '@/lib/integrations/meta';

const secret = 'test_app_secret';
const body = JSON.stringify({ object: 'page', entry: [{ id: '1' }] });
const validSig =
  'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');

describe('verifyMetaSignature', () => {
  it('accepts a correct signature', () => {
    expect(verifyMetaSignature(body, validSig, secret)).toBe(true);
  });
  it('rejects a tampered body', () => {
    expect(verifyMetaSignature(body + 'x', validSig, secret)).toBe(false);
  });
  it('rejects a wrong secret', () => {
    expect(verifyMetaSignature(body, validSig, 'wrong')).toBe(false);
  });
  it('rejects missing signature or secret', () => {
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature(body, validSig, null)).toBe(false);
  });
});
