#!/usr/bin/env python3
"""
Post-processing for the live pool scene assets (numpy + Pillow only).

Called by scripts/generate-scene-textures.mjs, which holds the prompts and
the kie.ai calls; this file only turns downloaded images into the files the
site serves. Run it with `python3 -I` so nothing is imported from the
current directory.

  photos   <src_dir> <out_dir>               owner job photos -> gallery WebP (metadata stripped)
  refcrop  <src> <out> <x,y,w,h>             crop a reference patch for the image model
  texture  <raw> <out> [options]             flatten light, colour-balance, make seamless, export WebP
  caustics <out> [--size N] [--seed N]       procedural, seamless caustic network (grayscale)
  sprite   <raw> <out> [options]             key out the flat background, despill, trim, export WebP
  preview  <out> <file...>                   3x3 tile previews (textures) / sprites on grey, one sheet
  stats    <file...>                         size, dimensions, mean colour as JSON lines
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageOps

# ----------------------------------------------------------------- helpers


def load_rgb(path):
    im = ImageOps.exif_transpose(Image.open(path))
    return np.asarray(im.convert('RGB'), dtype=np.float32) / 255.0


def to_image(arr, mode='RGB'):
    return Image.fromarray(np.clip(arr * 255.0 + 0.5, 0, 255).astype(np.uint8), mode)


def gaussian_wrap(a, sigma):
    """Gaussian blur with wrap-around edges (FFT), for 2-D or HxWxC arrays."""
    if sigma <= 0:
        return a
    h, w = a.shape[:2]
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    g = np.exp(-2.0 * (np.pi * sigma) ** 2 * (fx * fx + fy * fy))
    if a.ndim == 2:
        return np.real(np.fft.ifft2(np.fft.fft2(a) * g))
    return np.stack([np.real(np.fft.ifft2(np.fft.fft2(a[..., c]) * g)) for c in range(a.shape[2])], -1)


def gaussian_reflect(a, sigma):
    """Gaussian blur that mirrors at the edges (for images that do not tile yet)."""
    h, w = a.shape[:2]
    pad = [(h, h), (w, w)] + ([(0, 0)] if a.ndim == 3 else [])
    big = np.pad(a, pad, mode='symmetric')
    return gaussian_wrap(big, sigma)[h:2 * h, w:2 * w]


def luminance(a):
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def hex_rgb(s):
    s = s.lstrip('#')
    return np.array([int(s[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float32) / 255.0


def rgb_hex(c):
    c = np.clip(np.round(np.asarray(c) * 255), 0, 255).astype(int)
    return '#%02x%02x%02x' % tuple(c)


def save_webp(im, out, max_kb, quality=86, lossless_alpha=False):
    """Save as WebP, stepping quality down until the file fits max_kb. Never writes metadata."""
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    # A fresh image carries no EXIF/XMP/ICC from the source.
    clean = Image.frombytes(im.mode, im.size, im.tobytes())
    q = quality
    while True:
        kw = dict(format='WEBP', quality=q, method=6)
        if clean.mode == 'RGBA':
            kw['alpha_quality'] = 100 if lossless_alpha else 90
        clean.save(out, **kw)
        kb = os.path.getsize(out) / 1024
        if kb <= max_kb or q <= 40:
            return q, kb
        q -= 4


# ------------------------------------------------------------------ photos

# source file -> (published name, crop box as fractions l,t,r,b or None)
PHOTOS = [
    ('015_hero_pool_with_umbrella_spa_and_baja_shelf.jpg', 'pool-umbrella-spa-baja-shelf', None),
    ('033_front_pool_view_with_blue_umbrellas.jpg', 'baja-shelf-loungers-blue-umbrellas', None),
    ('043_long_pool_with_angled_spa_and_umbrella.jpg', 'raised-dark-tile-spa-long-pool', None),
    ('042_fire_and_water_bowls_closeup.jpg', 'fire-water-bowls-closeup', None),
    ('014_purple_lit_pool_and_spa_night.jpg', 'night-led-pool-spa', None),
    ('037_covered_outdoor_kitchen_front_view.jpg', 'covered-outdoor-kitchen-bar', None),
    ('031_overhead_pool_with_blue_umbrellas.jpg', 'overhead-pool-turf-bands-pavers', None),
    ('024_topdown_dark_house_backyard_pool.jpg', 'modern-pool-ipe-deck-overhead', None),
    ('008_covered_lounge_with_pool_at_dusk.jpg', 'covered-lounge-pool-dusk', None),
    ('021_stone_wall_firepit_seating.jpg', 'fire-pit-stone-wall-seating', None),
    ('027_aerial_rectangular_pool_and_lawn.jpg', 'pool-turf-planting-overhead', None),
]


def cmd_photos(args):
    for src, name, crop in PHOTOS:
        im = ImageOps.exif_transpose(Image.open(os.path.join(args.src_dir, src))).convert('RGB')
        if crop:
            w, h = im.size
            im = im.crop((int(crop[0] * w), int(crop[1] * h), int(crop[2] * w), int(crop[3] * h)))
        out = os.path.join(args.out_dir, name + '.webp')
        # Busy photos: give up a little resolution before giving up quality.
        for edge in (args.max_edge, int(args.max_edge * 0.9), int(args.max_edge * 0.8)):
            sized = im.copy()
            sized.thumbnail((edge, edge), Image.LANCZOS)
            q, kb = save_webp(sized, out, args.max_kb, quality=82)
            if q >= 74:
                break
        im = sized
        print(json.dumps({'file': out, 'size': im.size, 'quality': q, 'kb': round(kb, 1)}))


def cmd_refcrop(args):
    x, y, w, h = [int(v) for v in args.box.split(',')]
    im = Image.open(args.src).convert('RGB').crop((x, y, x + w, y + h))
    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    Image.frombytes('RGB', im.size, im.tobytes()).save(args.out, quality=92)
    print(json.dumps({'file': args.out, 'size': im.size}))


# ---------------------------------------------------------------- textures


def best_offset(a, window=0.2):
    """Roll offset (between 30% and 70% of the size) that best lines the texture up with itself.

    For regular patterns (pavers, boards, mosaic) this finds a shift that is a
    whole number of pattern periods (a third, a half...), so the seam cut below
    joins grout lines to grout lines instead of leaving a jog.
    """
    h, w = a.shape[:2]
    lum = luminance(a)
    hp = lum - gaussian_wrap(lum, max(h, w) / 32)
    f = np.fft.fft2(hp)
    corr = np.real(np.fft.ifft2(f * np.conj(f)))
    y0, y1 = int(h * (0.5 - window)), int(h * (0.5 + window))
    x0, x1 = int(w * (0.5 - window)), int(w * (0.5 + window))
    sub = corr[y0:y1, x0:x1]
    iy, ix = np.unravel_index(np.argmax(sub), sub.shape)
    return y0 + iy, x0 + ix


def dp_seam(cost):
    """Minimal top-to-bottom 8-connected path through cost (H x W); returns x per row."""
    h, w = cost.shape
    acc = cost.copy()
    back = np.zeros((h, w), dtype=np.int8)
    for y in range(1, h):
        prev = acc[y - 1]
        left = np.concatenate(([np.inf], prev[:-1]))
        right = np.concatenate((prev[1:], [np.inf]))
        stack = np.stack([left, prev, right])
        idx = np.argmin(stack, axis=0)
        acc[y] += stack[idx, np.arange(w)]
        back[y] = idx - 1
    path = np.zeros(h, dtype=np.int64)
    path[-1] = int(np.argmin(acc[-1]))
    for y in range(h - 1, 0, -1):
        path[y - 1] = path[y] + back[y, path[y]]
    return path


def make_seamless(a, feather=2.5, edge=0.05, margin=0.08):
    """Offset-and-cut: blend the image with a half-rolled copy along minimal-difference seams.

    The rolled copy is continuous across the image edges (its border comes from
    the middle of the original), so it covers the border; the original keeps
    the middle; the boundary between them follows the path where the two
    agree best (image-quilting style), feathered by a few pixels.
    """
    h, w = a.shape[:2]
    dy, dx = best_offset(a)
    b = np.roll(a, (dy, dx), axis=(0, 1))
    diff = gaussian_wrap(np.sum((a - b) ** 2, axis=2), 1.5) + 1e-4
    yy, xx = np.mgrid[0:h, 0:w]
    # Seams run in bands either side of the rolled copy's own wrap seam (at dx, dy),
    # which has to stay well inside the kept middle.
    gap_x, gap_y = int(w * margin), int(h * margin)
    edge_x, edge_y = int(w * edge), int(h * edge)
    left = dp_seam(diff[:, edge_x:dx - gap_x]) + edge_x
    right = dp_seam(diff[:, dx + gap_x:w - edge_x]) + dx + gap_x
    top = dp_seam(diff[edge_y:dy - gap_y, :].T) + edge_y
    bottom = dp_seam(diff[dy + gap_y:h - edge_y, :].T) + dy + gap_y
    m = ((xx > left[:, None]) & (xx < right[:, None]) & (yy > top[None, :]) & (yy < bottom[None, :])).astype(np.float32)
    m = np.clip(gaussian_wrap(m, feather), 0, 1)[..., None]
    return a * m + b * (1 - m)


def flatten_light(a, strength, sigma=0.2):
    """Divide out the low-frequency lighting so repeats don't show a bright corner or band."""
    if strength <= 0:
        return a
    lum = luminance(a)
    low = gaussian_reflect(lum, max(a.shape[:2]) * sigma)
    gain = (np.mean(lum) / np.maximum(low, 1e-3)) ** strength
    return a * gain[..., None]


def balance(a, target, strength):
    """Pull the mean colour toward the target (per-channel gain)."""
    if target is None or strength <= 0:
        return a
    mean = a.reshape(-1, 3).mean(0)
    gain = (target / np.maximum(mean, 1e-3)) ** strength
    return a * gain


def adjust(a, saturation=1.0, contrast=1.0):
    if saturation != 1.0:
        lum = luminance(a)[..., None]
        a = lum + (a - lum) * saturation
    if contrast != 1.0:
        m = luminance(a).mean()
        a = m + (a - m) * contrast
    return a


def cmd_texture(args):
    im = ImageOps.exif_transpose(Image.open(args.raw)).convert('RGB')
    if args.crop:
        x, y, w, h = [int(v) for v in args.crop.split(',')]
        im = im.crop((x, y, x + w, y + h))
    # Square, working size.
    s = min(im.size)
    l, t = (im.size[0] - s) // 2, (im.size[1] - s) // 2
    im = im.crop((l, t, l + s, t + s)).resize((args.size, args.size), Image.LANCZOS)
    a = np.asarray(im, dtype=np.float32) / 255.0
    a = flatten_light(a, args.flatten, args.flatten_sigma)
    a = adjust(a, args.saturation, args.contrast)
    a = balance(a, hex_rgb(args.target) if args.target else None, args.balance)
    if not args.no_seamless:
        a = make_seamless(a, feather=args.feather)
    a = np.clip(a, 0, 1)
    out_im = to_image(a)
    if args.gray:
        out_im = out_im.convert('L').convert('RGB')
    size = args.size
    q, kb = save_webp(out_im, args.out, args.max_kb, quality=args.quality)
    if q < args.min_quality and size > 768:
        # Busy textures (grass, gravel, mulch): 768 px at good quality beats 1024 px of
        # compression mush. Resize a 3x3 tiling and keep the middle so the edges still wrap.
        size = 768
        big = Image.new('RGB', (args.size * 3, args.size * 3))
        for i in range(3):
            for j in range(3):
                big.paste(out_im, (i * args.size, j * args.size))
        out_im = big.resize((size * 3, size * 3), Image.LANCZOS).crop((size, size, size * 2, size * 2))
        q, kb = save_webp(out_im, args.out, args.max_kb, quality=args.quality)
    print(json.dumps({'file': args.out, 'size': size, 'quality': q, 'kb': round(kb, 1),
                      'mean': rgb_hex(np.asarray(out_im, dtype=np.float32).reshape(-1, 3).mean(0) / 255)}))


# ---------------------------------------------------------------- caustics


def periodic_noise(n, rng, octaves=((2, 1.0), (3, 0.6), (5, 0.35))):
    """Smooth noise that tiles: a sum of sinusoids with whole-number frequencies."""
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n
    out = np.zeros((n, n), np.float32)
    for f, amp in octaves:
        for _ in range(4):
            kx, ky = rng.integers(-f, f + 1, size=2)
            if kx == 0 and ky == 0:
                kx = f
            out += amp * np.sin(2 * np.pi * (kx * xx + ky * yy) + rng.uniform(0, 2 * np.pi))
    return out / np.abs(out).max()


def worley_edges(n, cells, rng, warp_x, warp_y):
    """F2 - F1 distance on a torus: small along cell borders (the caustic web)."""
    pts = rng.uniform(0, 1, size=(cells * cells, 2)).astype(np.float32)
    yy, xx = np.mgrid[0:n, 0:n].astype(np.float32) / n
    px = (xx + warp_x) % 1.0
    py = (yy + warp_y) % 1.0
    f1 = np.full((n, n), 9.0, np.float32)
    f2 = np.full((n, n), 9.0, np.float32)
    for (x, y) in pts:
        dx = np.abs(px - x)
        dx = np.minimum(dx, 1 - dx)
        dy = np.abs(py - y)
        dy = np.minimum(dy, 1 - dy)
        d = np.sqrt(dx * dx + dy * dy)
        f2 = np.where(d < f1, f1, np.minimum(f2, d))
        f1 = np.minimum(f1, d)
    return (f2 - f1) * cells


def cmd_caustics(args):
    rng = np.random.default_rng(args.seed)
    n = args.size
    hi = ((3, 1.0), (5, 0.6), (8, 0.35))
    layers = []
    # A bold web of curved light lines plus a fainter, finer one, both domain-warped
    # so the cell borders bend like real caustics instead of reading as polygons.
    for cells, width, amp, warp, blur in ((8, 0.075, 1.0, 0.05, 0.9), (13, 0.06, 0.4, 0.04, 1.6)):
        wx = periodic_noise(n, rng, hi) * warp
        wy = periodic_noise(n, rng, hi) * warp
        e = worley_edges(n, cells, rng, wx, wy)
        layers.append(gaussian_wrap(amp * np.exp(-e / width), blur))
    # Brightness drifts gently across the floor.
    drift = 0.75 + 0.25 * periodic_noise(n, rng, ((1, 1.0), (2, 0.5)))
    c = (layers[0] + layers[1]) * drift
    c = c / np.percentile(c, 99.6)
    c = np.clip(c, 0, 1) ** 1.35
    im = to_image(c, 'L')
    q, kb = save_webp(im.convert('RGB'), args.out, args.max_kb, quality=88)
    print(json.dumps({'file': args.out, 'size': n, 'quality': q, 'kb': round(kb, 1)}))


# ----------------------------------------------------------------- sprites


def cmd_sprite(args):
    im = ImageOps.exif_transpose(Image.open(args.raw)).convert('RGB')
    a = np.asarray(im, dtype=np.float32) / 255.0
    h, w = a.shape[:2]
    # The model never paints the key colour exactly: sample it from the border.
    border = np.concatenate([a[:4].reshape(-1, 3), a[-4:].reshape(-1, 3), a[:, :4].reshape(-1, 3), a[:, -4:].reshape(-1, 3)])
    key = np.median(border, axis=0)
    dist = np.sqrt(np.sum((a - key) ** 2, axis=2))
    alpha = np.clip((dist - args.lo) / (args.hi - args.lo), 0, 1)
    magenta = key[0] > 0.6 and key[2] > 0.6 and key[1] < 0.4
    if magenta:
        # Blend-aware matte: how much of the key's "magenta-ness" (min(R,B) - G) is
        # left in a pixel says how much backdrop shows through it. Catches the pink
        # haze inside foliage that a plain distance key reads as solid.
        mk = min(key[0], key[2]) - key[1]
        m = np.minimum(a[..., 0], a[..., 2]) - a[..., 1]
        alpha = np.minimum(alpha, np.clip((1 - m / mk - 0.04) / 0.86, 0, 1))
    # Keep only the largest connected object region (drops stray specks on the backdrop).
    solid = alpha > 0.5
    alpha = alpha * _keep_main(solid, args.keep)
    # Soften: a slight blur of the matte, then pull it in by a fraction of a pixel.
    alpha = np.clip(gaussian_reflect(alpha, args.soften) * 1.08 - 0.04, 0, 1)
    # Despill: where the backdrop bled into the edge, remove the key tint.
    rgb = a.copy()
    edge = (alpha < 0.999)[..., None]
    k = key / max(key.max(), 1e-3)
    if k[1] > 0.6 and k[0] < 0.5 and k[2] < 0.5:  # green key
        spill = np.clip(rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2]), 0, 1)
        rgb[..., 1] -= spill * edge[..., 0]
    elif magenta:
        # Unmix the backdrop from part-covered pixels, then clear any pink cast left anywhere.
        al = np.maximum(alpha, 0.05)[..., None]
        rgb = np.where(edge, (rgb - key * (1 - al)) / al, rgb)
        rgb = np.clip(rgb, 0, 1)
        spill = np.clip(np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1], 0, 1)
        rgb[..., 0] -= spill
        rgb[..., 2] -= spill
    else:  # light/neutral key: unpremultiply the backdrop out of the edge pixels
        al = np.maximum(alpha, 0.05)[..., None]
        rgb = np.where(edge, (rgb - key * (1 - al)) / al, rgb)
    rgb = np.clip(rgb, 0, 1)
    rgba = np.dstack([rgb, alpha])
    ys, xs = np.where(alpha > 0.03)
    pad = 3
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, h)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, w)
    rgba = rgba[y0:y1, x0:x1]
    out = to_image(rgba, 'RGBA')
    out.thumbnail((args.max_px, args.max_px), Image.LANCZOS)
    q, kb = save_webp(out, args.out, args.max_kb, quality=args.quality, lossless_alpha=True)
    print(json.dumps({'file': args.out, 'size': out.size, 'quality': q, 'kb': round(kb, 1),
                      'aspect': round(out.size[0] / out.size[1], 4), 'key': rgb_hex(key)}))


def _keep_main(full_mask, keep, step=4):
    """Mask of connected components (4-connected) at least `keep` x the largest; numpy-only flood fill.

    Labels a `step`-times smaller copy (fast enough in pure Python), then scales back up.
    """
    fh, fw = full_mask.shape
    mask = full_mask[::step, ::step]
    h, w = mask.shape
    labels = np.zeros((h, w), np.int32)
    sizes = [0]
    cur = 0
    ys, xs = np.nonzero(mask)
    for sy, sx in zip(ys, xs):
        if labels[sy, sx]:
            continue
        cur += 1
        stack = [(sy, sx)]
        labels[sy, sx] = cur
        n = 0
        while stack:
            y, x = stack.pop()
            n += 1
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = cur
                    stack.append((ny, nx))
        sizes.append(n)
    if cur == 0:
        return np.ones((fh, fw), np.float32)
    sizes = np.array(sizes)
    keep_ids = np.nonzero(sizes >= sizes.max() * keep)[0]
    keep_ids = keep_ids[keep_ids > 0]
    solid = np.isin(labels, keep_ids)
    solid = np.repeat(np.repeat(solid, step, axis=0), step, axis=1)[:fh, :fw]
    # Holes inside the object (and soft edge pixels next to it) stay; far specks go.
    grown = gaussian_reflect(solid.astype(np.float32), 2 * step) > 0.02
    return grown.astype(np.float32)


# ----------------------------------------------------------------- preview


def cmd_preview(args):
    cells = []
    for f in args.files:
        im = Image.open(f)
        label = os.path.basename(f)
        if im.mode == 'RGBA':
            bg = Image.new('RGBA', (360, 360), (150, 150, 150, 255))
            ImageDraw.Draw(bg).rectangle((180, 0, 360, 360), fill=(205, 196, 180, 255))
            sp = im.copy()
            sp.thumbnail((330, 330), Image.LANCZOS)
            bg.alpha_composite(sp, ((360 - sp.size[0]) // 2, (360 - sp.size[1]) // 2))
            cells.append((bg.convert('RGB'), label))
        else:
            t = im.convert('RGB')
            t = t.resize((args.tile, args.tile), Image.LANCZOS)
            big = Image.new('RGB', (args.tile * 3, args.tile * 3))
            for i in range(3):
                for j in range(3):
                    big.paste(t, (i * args.tile, j * args.tile))
            cells.append((big.resize((360, 360), Image.LANCZOS) if args.tile * 3 != 360 else big, label))
    cols = min(args.cols, len(cells))
    rows = (len(cells) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 370, rows * 385), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (c, label) in enumerate(cells):
        x, y = (i % cols) * 370, (i // cols) * 385
        sheet.paste(c, (x, y))
        d.text((x + 2, y + 365), label, fill='black')
    sheet.save(args.out, quality=88)
    print(args.out)


def cmd_stats(args):
    for f in args.files:
        im = Image.open(f)
        a = np.asarray(im.convert('RGBA'), dtype=np.float32) / 255
        op = a[..., 3] > 0.5
        mean = a[..., :3][op].mean(0) if op.any() else a[..., :3].reshape(-1, 3).mean(0)
        print(json.dumps({'file': f, 'size': im.size, 'mode': im.mode, 'kb': round(os.path.getsize(f) / 1024, 1),
                          'mean': rgb_hex(mean)}))


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)

    s = sub.add_parser('photos')
    s.add_argument('src_dir')
    s.add_argument('out_dir')
    s.add_argument('--max-edge', type=int, default=1600)
    s.add_argument('--max-kb', type=float, default=255)
    s.set_defaults(fn=cmd_photos)

    s = sub.add_parser('refcrop')
    s.add_argument('src')
    s.add_argument('out')
    s.add_argument('box')
    s.set_defaults(fn=cmd_refcrop)

    s = sub.add_parser('texture')
    s.add_argument('raw')
    s.add_argument('out')
    s.add_argument('--size', type=int, default=1024)
    s.add_argument('--crop', default=None, help='x,y,w,h in raw pixels before squaring')
    s.add_argument('--target', default=None, help='mean colour to balance toward, #rrggbb')
    s.add_argument('--balance', type=float, default=0.7)
    s.add_argument('--flatten', type=float, default=0.85)
    s.add_argument('--flatten-sigma', type=float, default=0.2, help='lighting blur, as a fraction of the size')
    s.add_argument('--saturation', type=float, default=1.0)
    s.add_argument('--contrast', type=float, default=1.0)
    s.add_argument('--feather', type=float, default=2.5)
    s.add_argument('--quality', type=int, default=84)
    s.add_argument('--min-quality', type=int, default=66, help='below this, drop to 768 px instead')
    s.add_argument('--max-kb', type=float, default=215)
    s.add_argument('--gray', action='store_true')
    s.add_argument('--no-seamless', action='store_true')
    s.set_defaults(fn=cmd_texture)

    s = sub.add_parser('caustics')
    s.add_argument('out')
    s.add_argument('--size', type=int, default=1024)
    s.add_argument('--seed', type=int, default=7)
    s.add_argument('--max-kb', type=float, default=215)
    s.set_defaults(fn=cmd_caustics)

    s = sub.add_parser('sprite')
    s.add_argument('raw')
    s.add_argument('out')
    s.add_argument('--max-px', type=int, default=512)
    s.add_argument('--lo', type=float, default=0.12, help='colour distance from the key that is still fully clear')
    s.add_argument('--hi', type=float, default=0.32, help='colour distance from the key that is fully opaque')
    s.add_argument('--soften', type=float, default=0.7)
    s.add_argument('--keep', type=float, default=0.02, help='keep components at least this fraction of the largest')
    s.add_argument('--quality', type=int, default=88)
    s.add_argument('--max-kb', type=float, default=145)
    s.set_defaults(fn=cmd_sprite)

    s = sub.add_parser('preview')
    s.add_argument('out')
    s.add_argument('files', nargs='+')
    s.add_argument('--tile', type=int, default=120)
    s.add_argument('--cols', type=int, default=4)
    s.set_defaults(fn=cmd_preview)

    s = sub.add_parser('stats')
    s.add_argument('files', nargs='+')
    s.set_defaults(fn=cmd_stats)

    args = p.parse_args()
    args.fn(args)


if __name__ == '__main__':
    sys.exit(main())
