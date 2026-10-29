import { describe, expect, it } from 'vitest';
import {
  bathLayout,
  BATH_CEILING_FT,
  ceilingDepthAt,
  fitCamera,
  floorDepthAt,
  frameEdgeDepths,
  layoutNumbers,
  project,
  wallDepthAt,
} from '@/lib/estimator/scene/bath/geometry';
import { bathRasterSize, rasterizeBathScene } from '@/lib/estimator/scene/bath/rasterize';
import { buildBathScene, EXAMPLE_BATH_SCENE } from '@/lib/estimator/scene/bath/scene';
import type { BathSceneSpec } from '@/lib/estimator/scene/bath/types';
import { BATHROOM_TEMPLATE } from '@/lib/estimator/templates/bathroom';
import { materialTexture } from '@/components/estimator/scene/bath/paint';
import { bathCanvasScale } from '@/components/estimator/scene/bath/bath-scene';

const ROOMS: [BathSceneSpec['room'], number, number][] = [
  ['small', 8, 5],
  ['medium', 10, 8],
  ['large', 14, 12],
];
const BATHING: BathSceneSpec['bathing'][] = ['walk_in', 'tub_shower', 'tub_and_shower', 'existing'];
const VANITIES: BathSceneSpec['vanity'][] = [null, 'single', 'double', 'floating'];

/** A medium walk-in bathroom to vary (the example is a large spa bath). */
const BASE: BathSceneSpec = {
  ...EXAMPLE_BATH_SCENE,
  room: 'medium',
  lengthFt: 10,
  widthFt: 8,
  bathing: 'walk_in',
  showerTile: 'zellige',
  floor: 'hex_mosaic',
  paint: 'sage',
  vanityFinish: 'wood',
  counter: 'quartz_white',
  extras: { niche: true, bench: false, ledMirror: true, heatedFloor: false, rainHead: true },
};

function spec(over: Partial<BathSceneSpec>): BathSceneSpec {
  return { ...BASE, ...over, extras: { ...BASE.extras, ...(over.extras ?? {}) } };
}

/** Every combination the picture can be asked for, plus hostile dimensions. */
function* allSpecs(): Generator<BathSceneSpec> {
  for (const [room, l, w] of ROOMS) {
    for (const bathing of BATHING) {
      for (const vanity of VANITIES) {
        for (const on of [false, true]) {
          const extras = { niche: on, bench: on, ledMirror: on, heatedFloor: on, rainHead: on };
          yield spec({ room, lengthFt: l, widthFt: w, bathing, glass: bathing === 'walk_in' || bathing === 'tub_and_shower', vanity, extras });
        }
      }
    }
  }
  for (const [l, w] of [[4, 4], [30, 30], [30, 4], [0, 0], [NaN, 7], [-3, Infinity], [5, 12]]) {
    for (const bathing of BATHING) yield spec({ room: 'small', lengthFt: l, widthFt: w, bathing, vanity: 'double' });
  }
}

describe('bath camera', () => {
  it('fills the frame with the room for every size (the room front is behind every frame edge)', () => {
    for (const s of allSpecs()) {
      const cam = bathLayout(s).camera;
      const e = frameEdgeDepths(cam);
      for (const z of [e.floor, e.ceiling, e.left, e.right]) expect(z).toBeGreaterThanOrEqual(cam.zFront - 1e-6);
      expect(cam.zBack).toBeGreaterThan(cam.zFront);
      expect(cam.f).toBeGreaterThanOrEqual(320);
      expect(cam.f).toBeLessThanOrEqual(700);
    }
  });

  it('has planes that meet: projection and the per-row / per-column depth inverses agree', () => {
    const cam = fitCamera(10, 8);
    for (const z of [cam.zBack, cam.zBack - 2, 7.5]) {
      const floor = project(cam, 3, 0, z);
      const ceil = project(cam, 3, BATH_CEILING_FT, z);
      const left = project(cam, 0, 2, z);
      const right = project(cam, cam.roomW, 2, z);
      expect(floorDepthAt(cam, floor.y)).toBeCloseTo(z, 6);
      expect(ceilingDepthAt(cam, ceil.y)).toBeCloseTo(z, 6);
      expect(wallDepthAt(cam, 'left', left.x)).toBeCloseTo(z, 6);
      expect(wallDepthAt(cam, 'right', right.x)).toBeCloseTo(z, 6);
    }
    // The back wall's corners are where the floor, ceiling and side walls end.
    const bl = project(cam, 0, 0, cam.zBack);
    expect(floorDepthAt(cam, bl.y)).toBeCloseTo(cam.zBack, 6);
    expect(wallDepthAt(cam, 'left', bl.x)).toBeCloseTo(cam.zBack, 6);
    // One-point perspective: the horizon is at eye level, straight ahead.
    expect(project(cam, cam.camX, cam.eye, 100).x).toBeCloseTo(cam.vpX, 6);
    expect(project(cam, 0, cam.eye, 1000).y).toBeCloseTo(cam.vpY, 6);
  });

  it('frames small rooms tighter and large rooms wider', () => {
    const backWidth = (room: BathSceneSpec['room'], l: number, w: number) => {
      const { camera: c } = bathLayout(spec({ room, lengthFt: l, widthFt: w, bathing: 'walk_in', vanity: 'single' }));
      return c.roomW * c.s;
    };
    expect(backWidth('small', 8, 5)).toBeLessThan(backWidth('medium', 10, 8));
    expect(backWidth('medium', 10, 8)).toBeLessThan(backWidth('large', 14, 12));
    // The small room's wider lens (stronger perspective).
    expect(bathLayout(spec({ room: 'small', lengthFt: 8, widthFt: 5 })).camera.f).toBeLessThan(bathLayout(spec({ room: 'large', lengthFt: 14, widthFt: 12 })).camera.f);
  });
});

describe('bathLayout', () => {
  it('never produces NaN and keeps every fixture inside the room and in order', () => {
    let n = 0;
    for (const s of allSpecs()) {
      const L = bathLayout(s);
      n++;
      for (const v of layoutNumbers(L)) expect(Number.isFinite(v)).toBe(true);
      const W = L.camera.roomW;
      const v = L.vanity;
      expect(v.x0).toBeGreaterThan(0);
      expect(v.x1).toBeLessThanOrEqual(W);
      expect(v.x1 - v.x0).toBeGreaterThan(2);
      const bathingRight = L.shower ? L.shower.x1 : (L.alcove?.partition?.x1 ?? L.alcove?.x1 ?? 0);
      const right = L.freestanding ? L.freestanding.cx + L.freestanding.width / 2 : bathingRight;
      expect(v.x0).toBeGreaterThanOrEqual(right - 1e-9);
      // Always a toilet, between the bathing zone (and a freestanding tub's filler) and the vanity.
      expect(L.toilet.cx - 1).toBeGreaterThanOrEqual(right - 1e-9);
      expect(L.toilet.cx + 1).toBeLessThanOrEqual(v.x0 + 1e-9);
      // Exactly one bathing layout.
      expect(Number(!!L.shower) + Number(!!L.alcove)).toBe(1);
      expect(!!L.freestanding).toBe(s.bathing === 'tub_and_shower');
      for (const m of L.mirrors) {
        expect(m.y0).toBeGreaterThan(v.top);
        expect(m.y1).toBeLessThan(BATH_CEILING_FT);
        expect(m.x0).toBeGreaterThanOrEqual(v.x0 - 1e-9);
        expect(m.x1).toBeLessThanOrEqual(v.x1 + 1e-9);
      }
      expect(L.mirrors.length).toBe(v.kind === 'double' ? 2 : 1);
      for (const sc of L.sconces) {
        expect(sc.x).toBeGreaterThan(bathingRight);
        expect(sc.x).toBeLessThan(W);
      }
      if (L.niche) {
        const zoneX1 = L.shower?.x1 ?? L.alcove!.x1;
        expect(L.niche.x0).toBeGreaterThanOrEqual(0);
        expect(L.niche.x1).toBeLessThanOrEqual(zoneX1);
        // The valve trim (0.32 ft radius) never lands in the niche.
        if (L.valve) expect(L.valve.y + 0.32 < L.niche.y0 || L.valve.y - 0.32 > L.niche.y1).toBe(true);
      }
      // Fixtures stand in front of the back wall and behind the frame's floor edge.
      const edges = frameEdgeDepths(L.camera);
      if (L.freestanding) expect(L.freestanding.zFront).toBeGreaterThan(edges.floor);
      if (L.plant) expect(L.plant.z).toBeGreaterThan(edges.floor);
      if (L.window.wall === 'right') {
        expect(L.window.z1).toBeLessThan(L.camera.zBack);
        expect(L.window.z0).toBeLessThan(L.window.z1);
      }
    }
    expect(n).toBeGreaterThan(90);
  });

  it('draws what the spec asks for', () => {
    expect(bathLayout(spec({ bathing: 'walk_in', extras: { bench: true, niche: true, rainHead: true, ledMirror: false, heatedFloor: false } }))).toMatchObject({
      alcove: null,
      shower: { glass: true },
      showerHead: { kind: 'rain' },
    });
    const combo = bathLayout(spec({ room: 'large', lengthFt: 14, widthFt: 12, bathing: 'tub_and_shower', vanity: 'double' }));
    expect(combo.freestanding).not.toBeNull();
    expect(combo.window.wall).toBe('back');
    // Every layout has a toilet, beside the tub's filler; the tub stays clear of the shower glass.
    expect(combo.toilet.cx - 1).toBeGreaterThan(combo.freestanding!.cx + combo.freestanding!.width / 2);
    expect(combo.camera.zBack - combo.freestanding!.zFront).toBeLessThanOrEqual(combo.shower!.depth);
    expect(bathLayout(spec({ bathing: 'tub_shower', glass: false })).alcove).toMatchObject({ glass: false });
    expect(bathLayout(spec({ bathing: 'walk_in', extras: { bench: false, niche: false, rainHead: false, ledMirror: false, heatedFloor: false } }))).toMatchObject({ bench: null, niche: null, showerHead: { kind: 'wall' } });
    // A small room keeps a single vanity at its real size.
    const small = bathLayout(spec({ room: 'small', lengthFt: 8, widthFt: 5, bathing: 'walk_in', vanity: 'single' }));
    expect(small.vanity.x1 - small.vanity.x0).toBe(2.5);
    expect(small.camera.roomW).toBeLessThanOrEqual(9);
  });

  it('lays out what buildBathScene makes from real answers', () => {
    const empty = bathLayout(buildBathScene(BATHROOM_TEMPLATE, { answers: {} }));
    expect(empty.alcove).not.toBeNull();
    expect(empty.vanity.kind).toBe('single');
    const walkIn = bathLayout(buildBathScene(BATHROOM_TEMPLATE, { answers: { project: ['tub_to_shower'], size: ['small'] } }));
    expect(walkIn.shower).not.toBeNull();
  });
});

describe('bath picture helpers', () => {
  it('maps materials, catalog swaps and unknowns to a texture', () => {
    expect(materialTexture('showerTile', null)).toBe('tile_plain');
    expect(materialTexture('showerTile', 'zellige')).toBe('tile_zellige');
    expect(materialTexture('showerTile', 'terrazzo')).toBe('tile_large_porcelain');
    expect(materialTexture('counter', 'quartzite')).toBe('counter_marble_look');
    expect(materialTexture('floor', 'nonsense')).toBe('floor_plain');
    expect(materialTexture('vanityFinish', null)).toBe('vanity_white');
  });

  it('sizes the canvas to the element, capped at 2x', () => {
    expect(bathCanvasScale(1200, 1)).toBe(1);
    expect(bathCanvasScale(600, 3)).toBe(1.5);
    expect(bathCanvasScale(1400, 2)).toBe(2);
    expect(bathCanvasScale(1400, 2, 1)).toBe(1);
    expect(bathCanvasScale(100, 1)).toBe(0.5);
    expect(bathCanvasScale(NaN, NaN)).toBe(1);
  });

  it('exports at 3:2 and only in the browser', async () => {
    expect(bathRasterSize(1536)).toEqual({ width: 1536, height: 1024 });
    await expect(rasterizeBathScene({} as HTMLCanvasElement)).rejects.toThrow(/browser/);
  });
});
