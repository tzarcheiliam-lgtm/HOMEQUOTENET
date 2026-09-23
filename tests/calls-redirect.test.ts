import { describe, it, expect } from 'vitest';
import { safeNextPath } from '@/lib/calls/redirect';
import { homePathFor } from '@/lib/nav';

describe('homePathFor', () => {
  it('sends callers to the calling workspace', () => {
    expect(homePathFor('caller')).toBe('/app/calls');
  });
  it('sends every other role to the dashboard', () => {
    expect(homePathFor('admin')).toBe('/app');
    expect(homePathFor('setter')).toBe('/app');
    expect(homePathFor('contractor')).toBe('/app');
  });
});

describe('safeNextPath', () => {
  const home = '/app';

  it('falls back when nothing was requested', () => {
    expect(safeNextPath(undefined, home)).toBe(home);
    expect(safeNextPath(null, home)).toBe(home);
    expect(safeNextPath('', home)).toBe(home);
    expect(safeNextPath('   ', home)).toBe(home);
  });

  it('honours an app path, with its query string', () => {
    expect(safeNextPath('/app/calls', home)).toBe('/app/calls');
    expect(safeNextPath('/app/calls?view=callbacks&page=2', home)).toBe(
      '/app/calls?view=callbacks&page=2'
    );
    expect(safeNextPath('/app', home)).toBe('/app');
  });

  it('decodes a URL-encoded path', () => {
    expect(safeNextPath('%2Fapp%2Fcalls%3Fview%3Dmine', home)).toBe('/app/calls?view=mine');
  });

  it('refuses anything that could leave the site', () => {
    expect(safeNextPath('https://evil.example/app', home)).toBe(home);
    expect(safeNextPath('//evil.example/app', home)).toBe(home);
    expect(safeNextPath('/\\evil.example', home)).toBe(home);
    expect(safeNextPath('javascript:alert(1)', home)).toBe(home);
    expect(safeNextPath('/app/calls\r\nSet-Cookie: x', home)).toBe(home);
    expect(safeNextPath('/app://x', home)).toBe(home);
  });

  it('refuses paths outside the authenticated app', () => {
    expect(safeNextPath('/apply', home)).toBe(home);
    expect(safeNextPath('/application', home)).toBe(home);
    expect(safeNextPath('/sign-in', home)).toBe(home);
    expect(safeNextPath('app/calls', home)).toBe(home);
  });

  it('survives malformed encoding', () => {
    expect(safeNextPath('%E0%A4%A', home)).toBe(home);
  });
});
