import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { HOMEQUOTE_BATHROOM_FUNNEL } from '@/content/estimators/homequote-bathroom-funnel';
import { HOMEQUOTE_KITCHEN_FUNNEL } from '@/content/estimators/homequote-kitchen-funnel';
import { POOL_MASTERS_FUNNEL } from '@/content/estimators/pool-masters-funnel';
import { StepPhoto } from '@/components/estimator/funnel/step-photo';
import type { ShownPhoto } from '@/components/estimator/funnel/state';
import { DEFAULT_CONTAIN_ZOOM, stepPhotoFrame } from '@/lib/estimator/funnel/engine';
import type { FunnelSpec, FunnelStep } from '@/lib/estimator/funnel/types';

/**
 * How a step photo sits in its card (FunnelStep.photoFit / photoZoom /
 * photoBackdrop, FunnelSpec.photoFrame): the pool keeps its look exactly
 * (plans and follow-ups contained at 1.3 on white, configurator views cover),
 * while the bathroom and kitchen show every photo whole.
 */

const shown = (src: string, extra: Partial<ShownPhoto> = {}): ShownPhoto => ({ src, srcSm: src.replace('.webp', '-sm.webp'), alt: `Alt ${src}`, isFallback: false, ...extra });
const step = (over: Partial<FunnelStep>): FunnelStep => ({ id: 's', label: 'S', options: [{ id: 'a', title: 'A', subtitle: '' }], photo: { kind: 'option', photos: {} }, ...over });
const spec = (over: Partial<FunnelSpec> = {}) => ({ ...POOL_MASTERS_FUNNEL, ...over }) as FunnelSpec;

describe('stepPhotoFrame', () => {
  it('defaults to the pool look: option rules contain at 1.3 on white, view and matrix rules cover', () => {
    expect(DEFAULT_CONTAIN_ZOOM).toBe(1.3);
    expect(stepPhotoFrame(spec(), step({}))).toEqual({ fit: 'contain', zoom: 1.3, backdrop: 'white' });
    expect(stepPhotoFrame(spec(), step({ photo: { kind: 'view', view: 'aerial' } }))).toEqual({ fit: 'cover', zoom: 1, backdrop: 'white' });
    expect(stepPhotoFrame(spec(), step({ photo: { kind: 'matrix', stepId: 'x', photos: {} } }))).toEqual({ fit: 'cover', zoom: 1, backdrop: 'white' });
  });

  it('the pool spec sets nothing, so every pool step frames exactly as before', () => {
    expect(POOL_MASTERS_FUNNEL.photoFrame).toBeUndefined();
    expect(POOL_MASTERS_FUNNEL.steps.map((s) => stepPhotoFrame(POOL_MASTERS_FUNNEL, s))).toEqual(
      POOL_MASTERS_FUNNEL.steps.map((s) => (s.photo.kind === 'option' ? { fit: 'contain', zoom: 1.3, backdrop: 'white' } : { fit: 'cover', zoom: 1, backdrop: 'white' })),
    );
  });

  it('a spec default applies to every step; a step setting wins; cover ignores the zoom; a bad zoom is 1', () => {
    const s = spec({ photoFrame: { fit: 'contain', zoom: 1, backdrop: 'blur' } });
    expect(stepPhotoFrame(s, step({ photo: { kind: 'view', view: 'aerial' } }))).toEqual({ fit: 'contain', zoom: 1, backdrop: 'blur' });
    expect(stepPhotoFrame(s, step({ photoBackdrop: 'white', photoZoom: 1.1 }))).toEqual({ fit: 'contain', zoom: 1.1, backdrop: 'white' });
    expect(stepPhotoFrame(s, step({ photoFit: 'cover', photoZoom: 2 }))).toEqual({ fit: 'cover', zoom: 1, backdrop: 'blur' });
    expect(stepPhotoFrame(spec(), step({ photoZoom: 0 })).zoom).toBe(1);
    expect(stepPhotoFrame(spec(), step({ photoZoom: Number.NaN })).zoom).toBe(1);
  });

  it('the bathroom and kitchen show every photo whole (zoom 1): plans on white, room photos on a blurred copy', () => {
    for (const f of [HOMEQUOTE_BATHROOM_FUNNEL, HOMEQUOTE_KITCHEN_FUNNEL]) {
      for (const s of f.steps) {
        const frame = stepPhotoFrame(f, s);
        expect(frame.fit, s.id).toBe('contain');
        expect(frame.zoom, s.id).toBe(1);
        expect(frame.backdrop, s.id).toBe(s.id === 'size' ? 'white' : 'blur');
      }
    }
  });
});

describe('StepPhoto', () => {
  const photos: [string, ShownPhoto][] = [
    ['a', shown('/p/a.webp')],
    ['b', shown('/p/b.webp')],
  ];

  it('the pool frame renders the same markup as before (contain, scaled 1.3, no backdrop)', () => {
    const html = renderToStaticMarkup(<StepPhoto photos={photos} selected="a" frame={{ fit: 'contain', zoom: 1.3, backdrop: 'white' }} />);
    expect(html.match(/<img /g)).toHaveLength(2);
    expect(html).toContain('object-contain');
    expect(html).toContain('scale:1.3');
    expect(html).not.toContain('fn-backdrop');
    const cover = renderToStaticMarkup(<StepPhoto photos={photos} selected="a" frame={{ fit: 'cover', zoom: 1, backdrop: 'white' }} />);
    expect(cover).toContain('object-cover');
    expect(cover).not.toContain('scale:');
    expect(cover).not.toContain('object-contain');
  });

  it('blur: each layer gets a decorative blurred copy of the same file behind the whole photo, unscaled', () => {
    const html = renderToStaticMarkup(<StepPhoto photos={photos} selected="b" frame={{ fit: 'contain', zoom: 1, backdrop: 'blur' }} />);
    expect(html.match(/<img /g)).toHaveLength(4);
    expect(html.match(/fn-backdrop/g)).toHaveLength(2);
    expect(html).not.toContain('scale:');
    // Same srcset as the photo (no extra download), empty alt, hidden from screen readers.
    const backdrop = html.match(/<img[^>]*fn-backdrop[^>]*>/g)!;
    for (const b of backdrop) {
      expect(b).toContain('alt=""');
      expect(b).toContain('aria-hidden="true"');
      expect(b).toMatch(/srcSet="\/p\/[ab]-sm\.webp 1200w, \/p\/[ab]\.webp 1800w"/);
    }
    // Only the picked photo is visible and announced.
    expect(html).toMatch(/alt="Alt \/p\/b\.webp"[^>]*opacity-100/);
    expect(html).not.toContain('alt="Alt /p/a.webp"');
  });

  it('a fallback covers on white (a room photo standing in for a plan) but is shown whole on a blurred backdrop', () => {
    const fb: [string, ShownPhoto][] = [['a', shown('/f/room.webp', { isFallback: true })]];
    const white = renderToStaticMarkup(<StepPhoto photos={fb} selected="a" frame={{ fit: 'contain', zoom: 1.3, backdrop: 'white' }} />);
    expect(white).toContain('object-cover');
    expect(white).not.toContain('scale:');
    const blur = renderToStaticMarkup(<StepPhoto photos={fb} selected="a" frame={{ fit: 'contain', zoom: 1, backdrop: 'blur' }} />);
    expect(blur).toContain('fn-backdrop');
    expect(blur).toMatch(/<img[^>]*alt="Alt \/f\/room\.webp"[^>]*object-contain/);
  });
});
