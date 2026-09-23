import { describe, it, expect } from 'vitest';
import { findCallerByName, type CallerOption } from '@/lib/calls/callers';

const c = (id: string, name: string, email: string | null = null): CallerOption => ({ id, name, email });

describe('findCallerByName', () => {
  it('prefers an exact full name over a prefix match, whatever the order', () => {
    const callers = [c('qa', 'Liam (QA)'), c('real', 'Liam'), c('other', 'Liam Smith')];
    expect(findCallerByName(callers, 'liam')?.id).toBe('real');
    expect(findCallerByName(callers.reverse(), 'liam')?.id).toBe('real');
  });

  it('prefers an exact first name over a prefix when there is no exact full name', () => {
    const callers = [c('a', 'Liamson Tester'), c('b', 'Liam Smith')];
    expect(findCallerByName(callers, 'liam')?.id).toBe('b');
  });

  it('falls back to the email local part, then to a prefix', () => {
    expect(findCallerByName([c('x', 'N. Cohen', 'nadav@example.test')], 'nadav')?.id).toBe('x');
    expect(findCallerByName([c('y', 'Nadavi')], 'nadav')?.id).toBe('y');
  });

  it('is case-insensitive and returns null for no match or blank input', () => {
    expect(findCallerByName([c('a', 'LIAM')], 'Liam')?.id).toBe('a');
    expect(findCallerByName([c('a', 'Liam')], 'nadav')).toBeNull();
    expect(findCallerByName([c('a', 'Liam')], '  ')).toBeNull();
  });
});
