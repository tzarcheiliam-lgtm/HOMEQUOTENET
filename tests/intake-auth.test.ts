import { describe, it, expect } from 'vitest';
import { checkIntakeAuth } from '@/lib/integrations/auth';

describe('checkIntakeAuth', () => {
  it('rejects with 403 when no secret is configured', () => {
    const r = checkIntakeAuth(null, 'Bearer anything');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });
  it('rejects with 401 on a wrong key', () => {
    const r = checkIntakeAuth('s3cret', 'Bearer nope');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });
  it('rejects with 401 when header is missing', () => {
    const r = checkIntakeAuth('s3cret', null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });
  it('accepts a matching Bearer key', () => {
    expect(checkIntakeAuth('s3cret', 'Bearer s3cret').ok).toBe(true);
  });
});
