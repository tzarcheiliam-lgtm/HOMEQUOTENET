#!/usr/bin/env python3
"""
Builds every photo of the Pool Masters configurator matrix (numpy + Pillow only)
from the kie.ai edits made by scripts/generate-pool-configurator-photos.mjs.

The edits are few (one per visible change); everything else is composited
here so each view stays the same yard and every pick shows in every view that
can show it:

  aerial-<deck>[-pebble][-spa][-yard|-kitchen|-cover]   48 keys
  poolside-<finish>-<edge>[-spa]                          18 keys
  evening[-led|-pebble][-fire][-spa]                       12 keys

Methods (all deterministic, no credits):
  * diff patch: cut a feature (spa, fire bowls) out of the edit that added it,
    by where that edit differs from its own source, and feather it into another
    variant shot from the same camera.
  * region patch: a fixed polygon (the landscaped slope, the yard corner) taken
    from an edit, feathered in.
  * finish recolour: the pebble / quartz water colour is learned from the
    poolside edits (per-channel quantile mapping, plaster -> pebble on the same
    pixels) and applied to water pixels only (inside the pool outline, weighted
    by how blue-green the pixel is), so texture and caustics stay.
  * edge band: the natural-stone tile and coping band is copied from the one
    stone edit onto the other finishes, except where both images are water.

Run it with `python3 -I` so nothing is imported from the current directory:

  python3 -I scripts/pool-configurator-composite.py <raw_dir> <final_dir> [--sheet <out.jpg>]
"""
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

W, H = 2528, 1696


def disp(points, dw=1264, dh=848):
    """Points measured on a 1264 x 848 preview -> fractions."""
    return [(x / dw, y / dh) for x, y in points]


# ------------------------------------------------------------- geometry (fractions)

AERIAL_POOL = disp([(440, 375), (605, 330), (1162, 476), (1155, 662), (590, 556), (440, 552)])
AERIAL_SPA_CLIP = (0.28, 0.38, 0.60, 0.72)
# Outside the black fence (the bare dirt slope), following the fence's top rail.
AERIAL_SLOPE = disp([(0, 300), (50, 340), (120, 405), (200, 470), (300, 540), (420, 615), (550, 690), (700, 775), (830, 848), (0, 848)])
# The garden beyond the glass fence (top left) that holds the patio cover / kitchen.
AERIAL_GARDEN = [(0, 0), (0.40, 0), (0.40, 0.10), (0.46, 0.26), (0.275, 0.52), (0.16, 0.47), (0, 0.38)]

POOLSIDE_POOL = disp([(0, 690), (405, 496), (808, 496), (1200, 848), (0, 848)])
# Pool plus its coping (for the natural-stone edge band).
POOLSIDE_EDGE = disp([(0, 600), (395, 485), (818, 485), (1264, 770), (1264, 848), (0, 848)])
# The raised spa (rim, walls, interior and the spill sheet on its front), as drawn by the edits.
POOLSIDE_SPA = disp([(55, 610), (285, 528), (566, 525), (568, 600), (512, 692), (380, 700), (230, 700), (80, 694), (55, 662)])
EVENING_SPA = disp([(0, 588), (170, 566), (546, 565), (547, 650), (472, 848), (0, 848)])
# Fire bowls + their glow on the deck, above the far waterline (LED water keeps its own colour).
EVENING_FIRE_CLIP = (0.0, 0.30, 1.0, 0.585)


# ------------------------------------------------------------- helpers

def load(raw_dir, key):
    im = Image.open(os.path.join(raw_dir, f'{key}.jpg')).convert('RGB')
    if im.size != (W, H):
        im = im.resize((W, H), Image.LANCZOS)
    return np.asarray(im, dtype=np.float32)


def save(arr, path):
    Image.fromarray(np.clip(arr + 0.5, 0, 255).astype(np.uint8)).save(path, quality=94)


def poly(points, blur=6):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon([(x * W, y * H) for x, y in points], fill=255)
    if blur:
        m = m.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(m, dtype=np.float32) / 255.0


def water(a, lo=10, span=40):
    """0..1: how much a pixel looks like pool water (blue-green over red)."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return np.clip((b - r - lo) / span, 0, 1) * np.clip((g - r + 10) / 40, 0, 1)


def blend(base, donor, mask):
    m = mask[..., None]
    return base * (1 - m) + donor * m


def _box(m, radius, threshold):
    img = Image.fromarray(m).filter(ImageFilter.BoxBlur(radius))
    return np.where(np.asarray(img) > threshold, 255, 0).astype(np.uint8)


def diff_mask(a, b, clip=(0, 0, 1, 1), threshold=28):
    """Where `a` differs from `b` (an added feature and its shadow), de-speckled, filled, feathered."""
    sw, sh = W // 4, H // 4

    def small(x):
        g = Image.fromarray(np.clip(x, 0, 255).astype(np.uint8)).convert('L').resize((sw, sh), Image.BILINEAR)
        return np.asarray(g.filter(ImageFilter.GaussianBlur(1.5)), dtype=np.int16)

    d = np.abs(small(a) - small(b)) > threshold
    yy, xx = np.mgrid[0:sh, 0:sw]
    x0, y0, x1, y1 = clip
    d &= (xx >= x0 * sw) & (xx <= x1 * sw) & (yy >= y0 * sh) & (yy <= y1 * sh)
    m = np.where(d, 255, 0).astype(np.uint8)
    m = _box(m, 2, 170)  # erode: drop specks
    m = _box(m, 6, 20)  # dilate and fill the feature's body
    m = _box(m, 4, 200)  # erode back a little
    big = Image.fromarray(m).resize((W, H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(max(1, W * 0.002)))
    return np.asarray(big, dtype=np.float32) / 255.0


def quantile_lut(src, dst, mask):
    """Per-channel 256-entry LUT mapping src's distribution onto dst's over the masked pixels."""
    sel = mask > 0.6
    lut = np.zeros((3, 256), np.float32)
    for c in range(3):
        s = np.sort(src[..., c][sel])
        d = np.sort(dst[..., c][sel])
        q = np.searchsorted(s, np.arange(256)) / max(1, len(s))
        lut[c] = d[np.clip((q * (len(d) - 1)).astype(int), 0, len(d) - 1)]
    return lut


def apply_lut(a, lut, weight, gain=(1.0, 1.0, 1.0)):
    idx = np.clip(a, 0, 255).astype(np.int32)
    out = a.copy()
    for c in range(3):
        mapped = np.minimum(255, lut[c][idx[..., c]] * gain[c])
        out[..., c] = a[..., c] * (1 - weight) + mapped * weight
    return out


# ------------------------------------------------------------- build

def build(raw_dir, out_dir):
    os.makedirs(out_dir, exist_ok=True)
    R = lambda k: load(raw_dir, k)  # noqa: E731
    written = []

    def out(key, arr):
        save(arr, os.path.join(out_dir, f'{key}.jpg'))
        written.append(key)

    # Finish colours, learned on the poolside edits (same pixels, plaster -> quartz / pebble).
    ps_plaster = R('poolside-plaster-classic')
    ps_water = poly(POOLSIDE_POOL, 0) * water(ps_plaster, 15, 45)
    lut_pebble = quantile_lut(ps_plaster, R('poolside-pebble-classic'), ps_water)
    lut_quartz = quantile_lut(ps_plaster, R('poolside-quartz-classic'), ps_water)

    # ---- aerial
    a_res = R('aerial-resurface')
    a_spa_donor = R('aerial-resurface-spa')
    a_spa_mask = diff_mask(a_spa_donor, a_res, AERIAL_SPA_CLIP)
    slope = R('aerial-slope.raw')
    slope_mask = poly(AERIAL_SLOPE, 5)
    garden = poly(AERIAL_GARDEN, 14)
    yards = {'yard': R('aerial-yard-both.raw'), 'kitchen': R('aerial-yard-kitchen.raw'), 'cover': R('aerial-yard-cover.raw')}
    pool_poly = poly(AERIAL_POOL, 3)
    for deck in ('resurface', 'pavers', 'porcelain'):
        base = a_res if deck == 'resurface' else R(f'aerial-{deck}')
        for spa in (False, True):
            img = blend(base, a_spa_donor, a_spa_mask) if spa else base
            img = blend(img, slope, slope_mask)
            for pebble in (False, True):
                lit = apply_lut(img, lut_pebble, pool_poly * water(img, 5, 40)) if pebble else img
                for yard in ('', 'yard', 'kitchen', 'cover'):
                    final = blend(lit, yards[yard], garden) if yard else lit
                    key = '-'.join(t for t in ('aerial', deck, 'pebble' if pebble else '', 'spa' if spa else '', yard) if t)
                    out(key, final)

    # ---- poolside
    stone = R('poolside-plaster-stone')
    spa_donor = R('poolside-plaster-classic-spa')
    spa_mask = poly(POOLSIDE_SPA, 4)
    edge_zone = poly(POOLSIDE_EDGE, 2)
    pool_ps = poly(POOLSIDE_POOL, 3)
    for finish in ('plaster', 'quartz', 'pebble'):
        for edge in ('classic', 'premium', 'stone'):
            if edge == 'stone':
                target = R(f'poolside-{finish}-classic')
                band = edge_zone * (1 - np.minimum(water(target, 15, 45), water(stone, 15, 45)))
                img = stone if finish == 'plaster' else blend(target, stone, band)
            else:
                img = R(f'poolside-{finish}-{edge}')
            out(f'poolside-{finish}-{edge}', img)
            # Spa: pasted from the plaster edit, the water inside it recoloured to the finish.
            spa = blend(img, spa_donor, spa_mask)
            if finish != 'plaster':
                lut = lut_pebble if finish == 'pebble' else lut_quartz
                spa = apply_lut(spa, lut, spa_mask * water(spa, 15, 45))
            out(f'poolside-{finish}-{edge}-spa', spa)

    # ---- evening
    eve = R('evening')
    led_raw = R('evening-led')
    pool_ev = poly(POOLSIDE_POOL, 3)
    # Softer LED: the violet pushed to a deep pool blue.
    r, g, b = led_raw[..., 0], led_raw[..., 1], led_raw[..., 2]
    w_led = pool_ev * np.clip((b - r - 30) / 50, 0, 1)
    led = led_raw.copy()
    led[..., 0] = r * (1 - 0.45 * w_led)
    led[..., 1] = np.minimum(255, g * (1 + 0.12 * w_led))
    fire_donor = R('evening-fire')
    fire_mask = diff_mask(fire_donor, eve, EVENING_FIRE_CLIP)
    espa_donor = R('evening-spa')
    espa_mask = poly(EVENING_SPA, 4)
    outside_spa = 1 - espa_mask
    for water_tok in ('', 'led', 'pebble'):
        base = led if water_tok == 'led' else eve
        for fire in (False, True):
            for spa in (False, True):
                img = blend(base, fire_donor, fire_mask) if fire else base
                # The spa keeps its own warm light (also with colour LEDs in the pool).
                if spa:
                    img = blend(img, espa_donor, espa_mask)
                if water_tok == 'pebble':
                    img = apply_lut(img, lut_pebble, pool_ev * water(img, 10, 40) * (outside_spa if spa else 1), gain=(0.8, 0.82, 1.28))
                key = '-'.join(t for t in ('evening', water_tok, 'fire' if fire else '', 'spa' if spa else '') if t)
                out(key, img)
    return written


def sheet(out_dir, keys, path, cols=6, tw=420):
    th = int(tw / 1.5)
    rows = (len(keys) + cols - 1) // cols
    s = Image.new('RGB', (cols * tw, rows * (th + 18)), 'white')
    d = ImageDraw.Draw(s)
    for i, k in enumerate(keys):
        x, y = (i % cols) * tw, (i // cols) * (th + 18)
        s.paste(Image.open(os.path.join(out_dir, f'{k}.jpg')).resize((tw, th)), (x, y + 18))
        d.text((x + 4, y + 3), k, fill='black')
    s.save(path, quality=85)


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    keys = build(sys.argv[1], sys.argv[2])
    print('\n'.join(keys))
    print(len(keys), 'photos')
    if '--sheet' in sys.argv:
        sheet(sys.argv[2], keys, sys.argv[sys.argv.index('--sheet') + 1])
