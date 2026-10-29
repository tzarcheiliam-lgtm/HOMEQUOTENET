module.exports = [
"[project]/components/estimator/scene/bath/procedural.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PROC_PX",
    ()=>PROC_PX,
    "grain",
    ()=>grain,
    "hashString",
    ()=>hashString,
    "hexRgb",
    ()=>hexRgb,
    "makeCanvas",
    ()=>makeCanvas,
    "mix",
    ()=>mix,
    "proceduralTexture",
    ()=>proceduralTexture,
    "rng",
    ()=>rng,
    "shade",
    ()=>shade
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/textures.ts [app-ssr] (ecmascript)");
;
const PROC_PX = 512;
function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
}
function ctx2d(c) {
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available.');
    return ctx;
}
function rng(seed) {
    let a = seed >>> 0;
    return ()=>{
        a = a + 0x6d2b79f5 >>> 0;
        let t = a;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function hashString(s) {
    let h = 2166136261;
    for(let i = 0; i < s.length; i++)h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
}
function hexRgb(hex) {
    const v = hex.replace('#', '');
    const n = parseInt(v.length === 3 ? v.split('').map((c)=>c + c).join('') : v, 16);
    return [
        n >> 16 & 255,
        n >> 8 & 255,
        n & 255
    ];
}
function shade([r, g, b], d, a = 1) {
    const c = (v)=>Math.round(Math.min(255, Math.max(0, v + d)));
    return a >= 1 ? `rgb(${c(r)},${c(g)},${c(b)})` : `rgba(${c(r)},${c(g)},${c(b)},${a})`;
}
function mix(a, b, t) {
    return [
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t
    ];
}
/** Smooth, seamless value noise (cells x cells blobs) as a canvas of `size`. */ function smoothNoise(size, cells, rand) {
    const small = makeCanvas(cells, cells);
    const sctx = ctx2d(small);
    const img = sctx.createImageData(cells, cells);
    for(let i = 0; i < cells * cells; i++){
        const v = Math.round(rand() * 255);
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
    }
    sctx.putImageData(img, 0, 0);
    // Tile 3 x 3 and crop the middle: bilinear upscaling then wraps seamlessly.
    const big = makeCanvas(size * 3, size * 3);
    const bctx = ctx2d(big);
    bctx.imageSmoothingEnabled = true;
    bctx.imageSmoothingQuality = 'high';
    for(let i = 0; i < 3; i++)for(let j = 0; j < 3; j++)bctx.drawImage(small, i * size, j * size, size, size);
    const out = makeCanvas(size, size);
    ctx2d(out).drawImage(big, size, size, size, size, 0, 0, size, size);
    return out;
}
/** Fine grain noise tile, shared. */ let grainTile = null;
function grain() {
    if (grainTile) return grainTile;
    const c = makeCanvas(256, 256);
    const ctx = ctx2d(c);
    const img = ctx.createImageData(256, 256);
    const rand = rng(7);
    for(let i = 0; i < 256 * 256; i++){
        const v = Math.round(110 + rand() * 36);
        img.data[i * 4] = v;
        img.data[i * 4 + 1] = v;
        img.data[i * 4 + 2] = v;
        img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    grainTile = c;
    return c;
}
/** Overlay mottling (soft-light) and fine grain onto a region. */ function mottle(ctx, size, rand, cells, alpha, grainAlpha = 0.25) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = alpha;
    ctx.drawImage(smoothNoise(size, cells, rand), 0, 0);
    ctx.globalAlpha = grainAlpha;
    const pattern = ctx.createPattern(grain(), 'repeat');
    if (pattern) {
        ctx.fillStyle = pattern;
        ctx.fillRect(0, 0, size, size);
    }
    ctx.restore();
}
/** Run `draw` at the 9 wrap offsets so strokes crossing an edge come back on the other side. */ function wrapped(ctx, size, draw) {
    for (const dx of [
        -size,
        0,
        size
    ]){
        for (const dy of [
            -size,
            0,
            size
        ]){
            ctx.save();
            ctx.translate(dx, dy);
            draw();
            ctx.restore();
        }
    }
}
/** Soft marble / stone veins: meandering strokes, blurred by shadow. */ function veins(ctx, size, rand, colour, count, width, alpha) {
    const paths = [];
    for(let i = 0; i < count; i++){
        let x = rand() * size;
        let y = rand() * size;
        // Long, gently meandering diagonals (real veining flows; it does not branch like twigs).
        let ang = 0.35 + rand() * 0.5;
        const turn = (rand() - 0.5) * 0.05;
        const pts = [
            [
                x,
                y
            ]
        ];
        const steps = 10 + Math.floor(rand() * 10);
        for(let k = 0; k < steps; k++){
            ang += turn + (rand() - 0.5) * 0.28;
            x += Math.cos(ang) * size * 0.035;
            y += Math.sin(ang) * size * 0.035;
            pts.push([
                x,
                y
            ]);
        }
        paths.push({
            pts,
            w: width * (0.4 + rand() * 1.2)
        });
    }
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = colour;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    wrapped(ctx, size, ()=>{
        for (const p of paths){
            ctx.lineWidth = p.w;
            ctx.shadowColor = colour;
            ctx.shadowBlur = p.w * 2.5;
            ctx.beginPath();
            ctx.moveTo(p.pts[0][0], p.pts[0][1]);
            for(let k = 1; k < p.pts.length - 1; k++){
                const mx = (p.pts[k][0] + p.pts[k + 1][0]) / 2;
                const my = (p.pts[k][1] + p.pts[k + 1][1]) / 2;
                ctx.quadraticCurveTo(p.pts[k][0], p.pts[k][1], mx, my);
            }
            ctx.stroke();
        }
    });
    ctx.restore();
}
function tileGrid(ctx, size, rand, o) {
    ctx.fillStyle = o.grout;
    ctx.fillRect(0, 0, size, size);
    const tw = size / o.cols;
    const th = size / o.rows;
    const g = o.groutPx / 2;
    for(let r = 0; r < o.rows; r++){
        const shift = o.bond && r % 2 === 1 ? tw / 2 : 0;
        for(let c = -1; c < o.cols; c++){
            const x = c * tw + shift;
            if (x >= size || x + tw <= 0) continue;
            const y = r * th;
            let colour = o.base;
            if (o.drift) colour = mix(colour, o.drift, rand() * rand());
            const d = (rand() - 0.5) * 2 * o.jitter;
            const draw = (ox)=>{
                const x0 = x + ox + g;
                const y0 = y + g;
                const w = tw - o.groutPx;
                const h = th - o.groutPx;
                ctx.fillStyle = shade(colour, d);
                if (o.handmade) {
                    const j = ()=>(rand() - 0.5) * o.groutPx * 1.2;
                    ctx.beginPath();
                    ctx.moveTo(x0 + j(), y0 + j());
                    ctx.lineTo(x0 + w / 2 + j(), y0 + j());
                    ctx.lineTo(x0 + w + j(), y0 + j());
                    ctx.lineTo(x0 + w + j(), y0 + h / 2 + j());
                    ctx.lineTo(x0 + w + j(), y0 + h + j());
                    ctx.lineTo(x0 + w / 2 + j(), y0 + h + j());
                    ctx.lineTo(x0 + j(), y0 + h + j());
                    ctx.lineTo(x0 + j(), y0 + h / 2 + j());
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.fillRect(x0, y0, w, h);
                }
                if (o.glaze) {
                    const lg = ctx.createLinearGradient(0, y0, 0, y0 + h);
                    lg.addColorStop(0, `rgba(255,255,255,${0.55 * o.glaze})`);
                    lg.addColorStop(0.18, `rgba(255,255,255,${0.12 * o.glaze})`);
                    lg.addColorStop(0.75, 'rgba(255,255,255,0)');
                    lg.addColorStop(1, `rgba(0,0,0,${0.16 * o.glaze})`);
                    ctx.fillStyle = lg;
                    ctx.fillRect(x0, y0, w, h);
                    // Pillowed edge: darker sides.
                    const sg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
                    sg.addColorStop(0, `rgba(0,0,0,${0.08 * o.glaze})`);
                    sg.addColorStop(0.12, 'rgba(0,0,0,0)');
                    sg.addColorStop(0.88, 'rgba(0,0,0,0)');
                    sg.addColorStop(1, `rgba(0,0,0,${0.1 * o.glaze})`);
                    ctx.fillStyle = sg;
                    ctx.fillRect(x0, y0, w, h);
                }
                if (o.handmade) {
                    // Uneven glaze pooling: a few soft light and dark blobs per tile.
                    for(let k = 0; k < 3; k++){
                        const cx = x0 + rand() * w;
                        const cy = y0 + rand() * h;
                        const rr = (0.25 + rand() * 0.45) * w;
                        const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
                        const light = rand() < 0.55;
                        rg.addColorStop(0, light ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.06)');
                        rg.addColorStop(1, 'rgba(0,0,0,0)');
                        ctx.fillStyle = rg;
                        ctx.fillRect(x0, y0, w, h);
                    }
                }
            };
            draw(0);
            // Tiles that cross the right edge wrap to the left.
            if (x + tw > size) draw(-size);
        }
    }
}
/** Planks running vertically (along the room's depth on the floor). */ function planks(ctx, size, rand, o) {
    ctx.fillStyle = o.gap;
    ctx.fillRect(0, 0, size, size);
    const pw = size / o.cols;
    const pl = size / o.lengths;
    for(let c = 0; c < o.cols; c++){
        const offset = rand() * pl;
        for(let k = -1; k < o.lengths + 1; k++){
            const y = k * pl + offset;
            const colour = mix(o.base, o.dark, rand() * 0.55);
            const d = (rand() - 0.5) * 2 * o.jitter;
            const segs = [
                y,
                y - size
            ];
            for (const yy of segs){
                if (yy >= size || yy + pl <= 0) continue;
                const x0 = c * pw + 1;
                const w = pw - 2;
                const y0 = yy + 1;
                const h = pl - 2;
                ctx.fillStyle = shade(colour, d);
                ctx.fillRect(x0, y0, w, h);
                // Grain: long thin streaks along the plank.
                ctx.save();
                ctx.beginPath();
                ctx.rect(x0, y0, w, h);
                ctx.clip();
                const streaks = 9 + Math.floor(rand() * 8);
                for(let s = 0; s < streaks; s++){
                    const sx = x0 + rand() * w;
                    const amp = 1 + rand() * 3;
                    const freq = 0.004 + rand() * 0.01;
                    const ph = rand() * 6;
                    ctx.strokeStyle = rand() < 0.6 ? shade(colour, -30 - rand() * 25, o.grain) : shade(colour, 25, o.grain * 0.8);
                    ctx.lineWidth = 0.6 + rand() * 1.6;
                    ctx.beginPath();
                    for(let t = 0; t <= h; t += 12){
                        const xx = sx + Math.sin((y0 + t) * freq + ph) * amp;
                        if (t === 0) ctx.moveTo(xx, y0 + t);
                        else ctx.lineTo(xx, y0 + t);
                    }
                    ctx.stroke();
                }
                // A knot now and then.
                if (rand() < 0.3) {
                    const kx = x0 + w * (0.25 + rand() * 0.5);
                    const ky = y0 + h * rand();
                    ctx.strokeStyle = shade(colour, -45, 0.35);
                    ctx.lineWidth = 1;
                    for(let r = 2; r < 9; r += 2.5){
                        ctx.beginPath();
                        ctx.ellipse(kx, ky, r * 0.6, r * 2.2, 0, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                }
                // Slight end-to-end tone change and a micro bevel.
                const lg = ctx.createLinearGradient(x0, 0, x0 + w, 0);
                lg.addColorStop(0, 'rgba(0,0,0,0.10)');
                lg.addColorStop(0.08, 'rgba(255,255,255,0.05)');
                lg.addColorStop(0.92, 'rgba(0,0,0,0)');
                lg.addColorStop(1, 'rgba(0,0,0,0.12)');
                ctx.fillStyle = lg;
                ctx.fillRect(x0, y0, w, h);
                ctx.restore();
            }
        }
    }
}
function hexMosaic(ctx, size, rand, base, grout, accent) {
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, size, size);
    const cols = 9;
    const rows = 10;
    const w = size / cols;
    const h = size / rows;
    const r = w / Math.sqrt(3) * 0.97;
    for(let row = -1; row <= rows; row++){
        for(let col = -1; col <= cols; col++){
            const cx = col * w + (row % 2 !== 0 ? w / 2 : 0) + w / 2;
            const cy = row * h + h / 2;
            const isAccent = accent && rand() < 0.015;
            const colour = isAccent ? accent : base;
            ctx.fillStyle = shade(colour, (rand() - 0.5) * 12);
            ctx.beginPath();
            for(let k = 0; k < 6; k++){
                const a = Math.PI / 6 + k * Math.PI / 3;
                const px = cx + Math.cos(a) * r * 0.9;
                const py = cy + Math.sin(a) * r * 0.9 * (h / (w * 0.866));
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            const gl = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
            gl.addColorStop(0, 'rgba(255,255,255,0.22)');
            gl.addColorStop(1, 'rgba(0,0,0,0.05)');
            ctx.fillStyle = gl;
            ctx.fill();
        }
    }
}
const DRAW = {
    tile_subway: (ctx, S, r)=>{
        tileGrid(ctx, S, r, {
            cols: 4,
            rows: 8,
            bond: true,
            grout: '#d6d3cc',
            groutPx: 3,
            base: hexRgb('#f3f2ee'),
            jitter: 4,
            glaze: 1
        });
        mottle(ctx, S, r, 6, 0.12, 0.12);
    },
    tile_large_porcelain: (ctx, S, r)=>{
        ctx.fillStyle = '#e6e3dc';
        ctx.fillRect(0, 0, S, S);
        mottle(ctx, S, r, 5, 0.35, 0.2);
        veins(ctx, S, r, 'rgba(160,152,140,1)', 4, 1.6, 0.18);
        // 24 x 48" slabs in a half bond: grout lines only.
        ctx.fillStyle = 'rgba(150,145,136,0.55)';
        ctx.fillRect(0, 0, S, 2);
        ctx.fillRect(0, S / 2, S, 2);
        ctx.fillRect(0, 0, 2, S / 2);
        ctx.fillRect(S / 2, S / 2, 2, S / 2);
        const lg = ctx.createLinearGradient(0, 0, S, S);
        lg.addColorStop(0, 'rgba(255,255,255,0.10)');
        lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = lg;
        ctx.fillRect(0, 0, S, S);
    },
    tile_zellige: (ctx, S, r)=>{
        tileGrid(ctx, S, r, {
            cols: 6,
            rows: 6,
            grout: '#e7e6df',
            groutPx: 4,
            base: hexRgb('#b9d3c6'),
            jitter: 14,
            glaze: 0.45,
            handmade: true,
            drift: hexRgb('#e9efe7')
        });
        mottle(ctx, S, r, 12, 0.2, 0.1);
    },
    tile_marble: (ctx, S, r)=>{
        ctx.fillStyle = '#efeeeb';
        ctx.fillRect(0, 0, S, S);
        mottle(ctx, S, r, 4, 0.3, 0.12);
        // Broad cloudy drifts, then a few crisp veins inside them.
        veins(ctx, S, r, 'rgba(150,150,156,1)', 3, 14, 0.1);
        veins(ctx, S, r, 'rgba(125,124,126,1)', 3, 1.6, 0.3);
        veins(ctx, S, r, 'rgba(165,160,155,1)', 2, 0.7, 0.22);
        ctx.fillStyle = 'rgba(170,168,160,0.5)';
        ctx.fillRect(0, 0, S, 2);
        ctx.fillRect(0, 0, 2, S);
    },
    tile_plain: (ctx, S, r)=>{
        tileGrid(ctx, S, r, {
            cols: 4,
            rows: 4,
            grout: '#d2cdc2',
            groutPx: 3,
            base: hexRgb('#ebe7df'),
            jitter: 3,
            glaze: 0.5
        });
        mottle(ctx, S, r, 6, 0.15, 0.12);
    },
    floor_porcelain_wood: (ctx, S, r)=>{
        planks(ctx, S, r, {
            cols: 9,
            lengths: 1.5,
            base: hexRgb('#b98f66'),
            dark: hexRgb('#8a6440'),
            jitter: 10,
            grain: 0.35,
            gap: '#6e5238'
        });
    },
    floor_large_stone: (ctx, S, r)=>{
        ctx.fillStyle = '#d2cdc3';
        ctx.fillRect(0, 0, S, S);
        mottle(ctx, S, r, 7, 0.5, 0.3);
        veins(ctx, S, r, 'rgba(150,142,130,1)', 3, 1.0, 0.1);
        ctx.fillStyle = 'rgba(140,134,124,0.8)';
        ctx.fillRect(0, 0, S, 3);
        ctx.fillRect(0, S / 2, S, 3);
        ctx.fillRect(0, 0, 3, S);
        ctx.fillRect(S / 2, 0, 3, S);
    },
    floor_hex_mosaic: (ctx, S, r)=>{
        hexMosaic(ctx, S, r, hexRgb('#f1f1ee'), '#c9c8c3', hexRgb('#9ea2a6'));
    },
    floor_lvp: (ctx, S, r)=>{
        planks(ctx, S, r, {
            cols: 9,
            lengths: 1.2,
            base: hexRgb('#ab967f'),
            dark: hexRgb('#8b765f'),
            jitter: 7,
            grain: 0.25,
            gap: '#7d6a56'
        });
    },
    floor_plain: (ctx, S, r)=>{
        tileGrid(ctx, S, r, {
            cols: 2,
            rows: 2,
            grout: '#b9b1a3',
            groutPx: 4,
            base: hexRgb('#d9d3c7'),
            jitter: 4
        });
        mottle(ctx, S, r, 8, 0.4, 0.25);
    },
    paint_soft_white: (ctx, S, r)=>paint(ctx, S, r, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"].paint_soft_white.fallback),
    paint_greige: (ctx, S, r)=>paint(ctx, S, r, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"].paint_greige.fallback),
    paint_sage: (ctx, S, r)=>paint(ctx, S, r, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"].paint_sage.fallback),
    paint_navy: (ctx, S, r)=>paint(ctx, S, r, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"].paint_navy.fallback),
    counter_quartz_white: (ctx, S, r)=>{
        ctx.fillStyle = '#f5f4f1';
        ctx.fillRect(0, 0, S, S);
        for(let i = 0; i < 900; i++){
            ctx.fillStyle = r() < 0.7 ? 'rgba(170,168,162,0.35)' : 'rgba(120,118,112,0.3)';
            ctx.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2);
        }
        veins(ctx, S, r, 'rgba(175,172,165,1)', 2, 1.2, 0.2);
    },
    counter_marble_look: (ctx, S, r)=>{
        ctx.fillStyle = '#efede8';
        ctx.fillRect(0, 0, S, S);
        mottle(ctx, S, r, 4, 0.25, 0.1);
        veins(ctx, S, r, 'rgba(130,125,118,1)', 3, 2.6, 0.3);
        veins(ctx, S, r, 'rgba(176,150,110,1)', 3, 1.0, 0.25);
    },
    counter_concrete: (ctx, S, r)=>{
        ctx.fillStyle = '#a9a7a2';
        ctx.fillRect(0, 0, S, S);
        mottle(ctx, S, r, 9, 0.6, 0.45);
        for(let i = 0; i < 260; i++){
            ctx.fillStyle = 'rgba(70,70,68,0.35)';
            ctx.beginPath();
            ctx.arc(r() * S, r() * S, 0.6 + r() * 1.4, 0, Math.PI * 2);
            ctx.fill();
        }
    },
    vanity_white: (ctx, S, r)=>paint(ctx, S, r, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"].vanity_white.fallback, 0.12),
    vanity_wood: (ctx, S, r)=>{
        planks(ctx, S, r, {
            cols: 3,
            lengths: 0.5,
            base: hexRgb('#ad8156'),
            dark: hexRgb('#8c6440'),
            jitter: 6,
            grain: 0.4,
            gap: '#9b7550'
        });
    },
    vanity_navy_green: (ctx, S, r)=>paint(ctx, S, r, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"].vanity_navy_green.fallback, 0.16),
    vanity_black: (ctx, S, r)=>paint(ctx, S, r, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"].vanity_black.fallback, 0.16)
};
function paint(ctx, S, r, colour, grainAlpha = 0.1) {
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, S, S);
    mottle(ctx, S, r, 5, 0.1, grainAlpha);
}
const cache = new Map();
function proceduralTexture(id) {
    const hit = cache.get(id);
    if (hit) return hit;
    const c = makeCanvas(PROC_PX, PROC_PX);
    const ctx = ctx2d(c);
    ctx.fillStyle = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"][id].fallback;
    ctx.fillRect(0, 0, PROC_PX, PROC_PX);
    try {
        DRAW[id](ctx, PROC_PX, rng(hashString(id)));
    } catch  {
    // A canvas feature missing: the flat fallback colour still reads fine.
    }
    cache.set(id, c);
    return c;
}
}),
"[project]/components/estimator/scene/bath/assets.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "assetUrl",
    ()=>assetUrl,
    "bathAssetsLoading",
    ()=>bathAssetsLoading,
    "onBathAssetLoad",
    ()=>onBathAssetLoad,
    "preloadBathAssets",
    ()=>preloadBathAssets,
    "preloadBathAssetsWhenIdle",
    ()=>preloadBathAssetsWhenIdle,
    "recordBathAssets",
    ()=>recordBathAssets,
    "spriteImage",
    ()=>spriteImage,
    "textureSource",
    ()=>textureSource
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/textures.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/bath/procedural.ts [app-ssr] (ecmascript)");
;
;
const images = new Map();
const listeners = new Set();
/** The files the current paint asks for (null outside recordBathAssets). */ let recording = null;
function recordBathAssets(paint) {
    const used = new Set();
    const outer = recording;
    recording = used;
    try {
        paint();
    } finally{
        recording = outer;
    }
    return used;
}
function assetUrl(src, dir) {
    return /^(\/|https?:|data:|blob:)/.test(src) ? src : `${dir}${src}`;
}
function load(url) {
    recording?.add(url);
    const hit = images.get(url);
    if (hit) return hit;
    const img = new Image();
    img.decoding = 'async';
    let resolve;
    const done = new Promise((r)=>resolve = r);
    const entry = {
        img,
        ready: false,
        failed: false,
        done
    };
    img.onload = ()=>{
        entry.ready = true;
        resolve();
        listeners.forEach((fn)=>fn(url));
    };
    img.onerror = ()=>{
        entry.failed = true;
        resolve();
    };
    img.src = url;
    images.set(url, entry);
    return entry;
}
function onBathAssetLoad(fn) {
    listeners.add(fn);
    return ()=>{
        listeners.delete(fn);
    };
}
function bathAssetsLoading() {
    for (const e of images.values())if (!e.ready && !e.failed) return true;
    return false;
}
function textureSource(id) {
    const entry = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"][id];
    if (entry.src && typeof Image !== 'undefined') {
        const e = load(assetUrl(entry.src, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURE_DIR"]));
        if (e.ready && e.img.naturalWidth > 0) {
            return {
                image: e.img,
                width: e.img.naturalWidth,
                height: e.img.naturalHeight,
                realFt: entry.realFt,
                file: true
            };
        }
    }
    const c = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["proceduralTexture"])(id);
    return {
        image: c,
        width: c.width,
        height: c.height,
        realFt: entry.realFt,
        file: false
    };
}
function spriteImage(id) {
    const entry = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITES"][id];
    if (!entry.src || typeof Image === 'undefined') return null;
    const e = load(assetUrl(entry.src, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITE_DIR"]));
    return e.ready && e.img.naturalWidth > 0 ? e.img : null;
}
function preloadBathAssets() {
    if (typeof Image === 'undefined') return Promise.resolve();
    const outer = recording;
    recording = null;
    const pending = [];
    for (const t of Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"]))if (t.src) pending.push(load(assetUrl(t.src, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURE_DIR"])).done);
    for (const s of Object.values(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITES"]))if (s.src) pending.push(load(assetUrl(s.src, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITE_DIR"])).done);
    recording = outer;
    return Promise.all(pending).then(()=>undefined);
}
let idleQueued = false;
function preloadBathAssetsWhenIdle() {
    if ("TURBOPACK compile-time truthy", 1) return;
    //TURBOPACK unreachable
    ;
    const run = undefined;
}
}),
"[project]/components/estimator/scene/bath/paint.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "materialTexture",
    ()=>materialTexture,
    "paintBathScene",
    ()=>paintBathScene,
    "releaseBathCanvases",
    ()=>releaseBathCanvases
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/geometry.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/textures.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/bath/assets.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/bath/procedural.ts [app-ssr] (ecmascript)");
;
;
;
;
;
/**
 * Canvas 2D painter for the live bathroom picture (browser only).
 *
 * One frame, back to front, in 1200 x 800 frame units:
 * 1. Room planes. Each wall / floor is composed flat ("unrolled", in feet) on
 *    its own canvas: material, tile zones, window, niche, backsplash, contact
 *    shadows, corner occlusion and floor light. The back wall is then drawn
 *    straight on; the floor goes row by row and the side walls column by
 *    column. In one-point perspective each row (column) of a plane sits at a
 *    single depth, so it is a uniformly scaled strip of the flat canvas: real
 *    foreshortened tile, plank and grout lines at device-pixel steps.
 * 2. Fixtures, nearest last: shower (bench, glass), alcove tub (curtain or
 *    screen), freestanding tub, toilet, vanity (with its perspective counter
 *    top, sinks and faucets), towel, plant. Generated sprites replace the
 *    vector drawings for small decor once their files exist.
 * 3. Light: a light map (daylight from the window, or an evening of warm
 *    sconce / can / LED pools on a dim blue ambient) multiplies the frame,
 *    then glows are screened on top, then a soft vignette, a warm grade and
 *    film grain.
 *
 * Redraws are synchronous; the flat textures are cached per material and
 * plane scale (bounded by pixels, released with releaseBathCanvases). A
 * `draft` paint (while the homeowner is picking) draws the perspective planes
 * in coarser strips and skips the reflections, for a fraction of the cost;
 * the scene repaints sharp once picks settle.
 */ const C = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_CEILING_FT"];
const { width: FW, height: FH } = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SCENE"];
function baseTexture(id) {
    return id.endsWith(':fresh') ? id.slice(0, -6) : id;
}
/** Catalog swaps the manifest has no file for: the closest look. */ const CLOSEST = {
    showerTile: {
        ceramic: 'tile_plain',
        terrazzo: 'tile_large_porcelain'
    },
    counter: {
        granite: 'counter_concrete',
        quartzite: 'counter_marble_look'
    },
    floor: {
        ceramic: 'floor_plain',
        marble: 'floor_large_stone'
    }
};
function materialTexture(question, id) {
    if (!id) return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_DEFAULT_TEXTURES"][question];
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bathOptionTexture"])(question, id) ?? CLOSEST[question]?.[id] ?? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_DEFAULT_TEXTURES"][question];
}
// ---------------------------------------------------------------------------
// Textures at plane scale
// ---------------------------------------------------------------------------
/** Resampled textures, least recently used first; bounded by total pixels (iOS caps canvas memory). */ const scaledCache = new Map();
const SCALED_MAX_PX = 24e6;
let scaledPx = 0;
/** Plane scales snap to these steps, so live, close-up and export paints share cached textures. */ function snapP(P) {
    const steps = [
        24,
        32,
        40,
        48,
        64,
        80,
        96,
        112,
        128,
        150
    ];
    return steps.find((s)=>s >= P - 0.5) ?? 150;
}
/** The texture resampled so one copy spans realFt * P px (cached per size). */ function scaledTexture(id, P) {
    const base = baseTexture(id);
    const src = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["textureSource"])(base);
    const w = Math.max(4, Math.round(src.realFt * P));
    const h = Math.max(4, Math.round(w * src.height / src.width));
    const key = `${id}|${w}|${src.file ? 1 : 0}`;
    const hit = scaledCache.get(key);
    if (hit) {
        scaledCache.delete(key);
        scaledCache.set(key, hit);
        return hit;
    }
    const c = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["makeCanvas"])(w, h);
    const cx = c.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(src.image, 0, 0, w, h);
    if (id !== base) freshen(cx, w, h);
    scaledPx += w * h;
    for (const [k, old] of scaledCache){
        if (scaledPx <= SCALED_MAX_PX) break;
        scaledPx -= old.width * old.height;
        scaledCache.delete(k);
    }
    scaledCache.set(key, c);
    return c;
}
/** A renewed area before its pick: the existing beige finish, desaturated and lifted to a clean new white-grey. */ function freshen(cx, w, h) {
    cx.save();
    cx.globalCompositeOperation = 'saturation';
    cx.fillStyle = 'rgb(128,128,128)';
    cx.fillRect(0, 0, w, h);
    cx.globalCompositeOperation = 'screen';
    cx.fillStyle = 'rgb(118,120,122)';
    cx.fillRect(0, 0, w, h);
    cx.restore();
}
function releaseBathCanvases() {
    scaledCache.clear();
    scaledPx = 0;
    for (const c of pool.values()){
        c.width = 1;
        c.height = 1;
    }
    pool.clear();
    if (lightCanvas) lightCanvas.width = lightCanvas.height = 1;
    lightCanvas = null;
}
/** Fill a px rect with a texture whose pattern origin is (ax, ay). */ function fillTexture(ctx, id, P, x, y, w, h, ax = 0, ay = 0) {
    const pattern = ctx.createPattern(scaledTexture(id, P), 'repeat');
    if (!pattern) return;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.fillStyle = pattern;
    ctx.fillRect(x - ax, y - ay, w, h);
    ctx.restore();
}
function linear(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [t, c] of stops)g.addColorStop(t, c);
    return g;
}
function radial(ctx, x, y, r, stops, r0 = 0) {
    const g = ctx.createRadialGradient(x, y, r0, x, y, Math.max(r, r0 + 0.01));
    for (const [t, c] of stops)g.addColorStop(t, c);
    return g;
}
/** A blurred shape via the shadow trick (canvas filter is not everywhere): draws only the shadow. */ function softShape(ctx, blur, colour, path) {
    const OFF = 10000;
    const t = ctx.getTransform();
    ctx.save();
    ctx.shadowColor = colour;
    ctx.shadowBlur = blur * Math.hypot(t.a, t.b);
    ctx.shadowOffsetX = OFF * t.a;
    ctx.shadowOffsetY = OFF * t.d;
    ctx.translate(-OFF, -OFF);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    path(ctx);
    ctx.fill();
    ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
}
// ---------------------------------------------------------------------------
// Perspective strips
// ---------------------------------------------------------------------------
/**
 * A horizontal plane at height y (x0..x1 wide, zFar..zNear deep), drawn row by
 * row from a flat canvas whose u = (x - x0) * P and v = (zFar - z) * P.
 */ function hPlane(ctx, cam, src, P, x0, x1, zFar, zNear, y, step) {
    const dy = cam.eye - y;
    if (Math.abs(dy) < 1e-3 || zNear >= zFar) return;
    const yFar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, 0, y, zFar).y;
    const yNear = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, 0, y, zNear).y;
    const top = Math.min(yFar, yNear);
    const bottom = Math.max(yFar, yNear);
    const zAt = (sy)=>cam.f * dy / (sy - cam.vpY);
    const from = Math.max(top, -10);
    const to = Math.min(bottom, FH + 10);
    const srcW = (x1 - x0) * P;
    ctx.save();
    // Strips are thin and many: 'high' quality would build a mip chain per call.
    ctx.imageSmoothingQuality = 'low';
    for(let sy = Math.floor(from / step) * step; sy < to; sy += step){
        const a = Math.max(sy, top);
        const b = Math.min(sy + step, bottom);
        if (b <= a) continue;
        const za = zAt(a);
        const zb = zAt(b);
        const v0 = (zFar - Math.max(za, zb)) * P;
        const v1 = (zFar - Math.min(za, zb)) * P;
        const zm = (za + zb) / 2;
        const xl = cam.vpX + cam.f * (x0 - cam.camX) / zm;
        const xr = cam.vpX + cam.f * (x1 - cam.camX) / zm;
        const sv = Math.max(0, Math.min(src.height - 0.5, v0));
        const sh = Math.max(0.5, Math.min(src.height - sv, v1 - v0));
        ctx.drawImage(src, 0, sv, srcW, sh, xl, a, xr - xl, b - a + 0.04);
    }
    ctx.restore();
}
/**
 * A vertical plane facing sideways at x = xWall (zFar..zNear deep, y0..y1
 * tall), column by column from a flat canvas whose u = (zFar - z) * P and
 * v = (y1 - y) * P.
 */ function vPlane(ctx, cam, src, P, xWall, zFar, zNear, y0, y1, step) {
    const dx = xWall - cam.camX;
    if (Math.abs(dx) < 1e-3 || zNear >= zFar) return;
    const xFar = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, xWall, 0, zFar).x;
    const xNear = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, xWall, 0, zNear).x;
    const left = Math.min(xFar, xNear);
    const right = Math.max(xFar, xNear);
    const zAt = (sx)=>cam.f * dx / (sx - cam.vpX);
    const from = Math.max(left, -10);
    const to = Math.min(right, FW + 10);
    const srcH = (y1 - y0) * P;
    ctx.save();
    ctx.imageSmoothingQuality = 'low';
    for(let sx = Math.floor(from / step) * step; sx < to; sx += step){
        const a = Math.max(sx, left);
        const b = Math.min(sx + step, right);
        if (b <= a) continue;
        const za = zAt(a);
        const zb = zAt(b);
        const u0 = (zFar - Math.max(za, zb)) * P;
        const u1 = (zFar - Math.min(za, zb)) * P;
        const zm = (za + zb) / 2;
        const yt = cam.vpY - cam.f * (y1 - cam.eye) / zm;
        const yb = cam.vpY - cam.f * (y0 - cam.eye) / zm;
        const su = Math.max(0, Math.min(src.width - 0.5, u0));
        const sw = Math.max(0.5, Math.min(src.width - su, u1 - u0));
        ctx.drawImage(src, su, 0, sw, srcH, a, yt, b - a + 0.04, yb - yt);
    }
    ctx.restore();
}
const pool = new Map();
/**
 * Scratch canvases reused frame to frame (allocating several megapixel
 * canvases per pick is what makes a redraw slow, not the drawing). Paints are
 * synchronous, so instances can share them.
 */ function pooled(key, w, h) {
    const cw = Math.max(1, Math.round(w));
    const ch = Math.max(1, Math.round(h));
    let c = pool.get(key);
    if (!c) {
        c = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["makeCanvas"])(cw, ch);
        pool.set(key, c);
    } else if (c.width !== cw || c.height !== ch) {
        c.width = cw;
        c.height = ch;
    } else {
        const cx = c.getContext('2d');
        cx.setTransform(1, 0, 0, 1, 0, 0);
        cx.globalAlpha = 1;
        cx.globalCompositeOperation = 'source-over';
        cx.clearRect(0, 0, cw, ch);
    }
    return c;
}
/** A flat canvas filled with a texture, w x h feet at P px/ft (pattern anchored bottom-left). */ function surface(key, id, wFt, hFt, P, anchorBottom = true) {
    const c = pooled(key, wFt * P, hFt * P);
    const cx = c.getContext('2d');
    fillTexture(cx, id, P, 0, 0, c.width, c.height, 0, anchorBottom ? c.height : 0);
    return c;
}
function polygon(ctx, pts) {
    ctx.moveTo(pts[0].x, pts[0].y);
    for(let i = 1; i < pts.length; i++)ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
}
function paintBathScene(ctx, spec, opts) {
    const L = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bathLayout"])(spec);
    const cam = L.camera;
    const metalId = spec.metal && __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_METAL_COLORS"][spec.metal] ? spec.metal : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_DEFAULT_METAL"];
    const paintId = materialTexture('paint', spec.paint);
    const zoom = opts.focus === 'close' ? 1.55 : 1;
    const dpx = opts.scale * zoom;
    const draft = Boolean(opts.draft);
    // A renewed area shows a clean new neutral until its material is picked (a new layout always gets new tile).
    const freshTile = !spec.showerTile && (spec.bathing !== 'existing' || Boolean(spec.renew?.bathing));
    const freshFloor = !spec.floor && Boolean(spec.renew?.floor);
    const look = {
        spec,
        L,
        cam,
        mood: opts.mood,
        tile: freshTile ? 'tile_plain:fresh' : materialTexture('showerTile', spec.showerTile),
        floor: freshFloor ? 'floor_plain:fresh' : materialTexture('floor', spec.floor),
        paint: paintId,
        counter: materialTexture('counter', spec.counter),
        cabinet: materialTexture('vanityFinish', spec.vanityFinish),
        metal: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_METAL_COLORS"][metalId],
        metalRgb: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexRgb"])(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_METAL_COLORS"][metalId]),
        paintRgb: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexRgb"])(textureFallback(paintId)),
        dark: opts.mood === 'evening',
        dpx,
        // Strip step: device px, but no finer than 1/1.5 frame px (invisible on 2x screens, half the draws);
        // a draft uses 2.5 frame px strips (about a third of the draws).
        step: draft ? 2.5 : 1 / Math.min(dpx, 1.5),
        // Plane canvases: enough px per ft for the nearest surfaces, capped for memory (lower for a draft).
        P: snapP(Math.min(150, Math.max(draft ? 32 : 48, Math.round((draft ? 40 : 64) * dpx)))),
        draft
    };
    ctx.save();
    ctx.setTransform(opts.scale, 0, 0, opts.scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = look.dark ? '#2a2a33' : '#e8e4dc';
    ctx.fillRect(0, 0, FW, FH);
    if (zoom !== 1) {
        const target = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bathFocusPoint"])(L, opts.target ?? 'vanity');
        const tx = Math.min(FW - FW / (2 * zoom), Math.max(FW / (2 * zoom), target.x));
        const ty = Math.min(FH - FH / (2 * zoom), Math.max(FH / (2 * zoom), target.y));
        ctx.translate(FW / 2, FH / 2);
        ctx.scale(zoom, zoom);
        ctx.translate(-tx, -ty);
    }
    drawRoom(ctx, look);
    drawFixtures(ctx, look);
    drawLight(ctx, look);
    ctx.restore();
    // Grade in device space (unzoomed).
    ctx.save();
    ctx.setTransform(opts.scale, 0, 0, opts.scale, 0, 0);
    grade(ctx, look);
    ctx.restore();
}
function textureFallback(texture) {
    const id = baseTexture(texture);
    const mean = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["textureSource"])(id).file ? sampleMean(id) : FALLBACKS[id] ?? '#e9e6df';
    if (id === texture) return mean;
    const [r, g, b] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mix"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexRgb"])(mean), [
        236,
        236,
        236
    ], 0.75).map((v)=>Math.round(v));
    return `#${[
        r,
        g,
        b
    ].map((v)=>v.toString(16).padStart(2, '0')).join('')}`;
}
const FALLBACKS = Object.fromEntries(Object.entries(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"]).map(([k, v])=>[
        k,
        v.fallback
    ]));
const meanCache = new Map();
/** Mean colour of a loaded texture file (for reflections and tinted glass). */ function sampleMean(id) {
    const hit = meanCache.get(id);
    if (hit) return hit;
    const src = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["textureSource"])(id);
    const c = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["makeCanvas"])(1, 1);
    const cx = c.getContext('2d', {
        willReadFrequently: true
    });
    cx.drawImage(src.image, 0, 0, 1, 1);
    let value = FALLBACKS[id] ?? '#e9e6df';
    try {
        const d = cx.getImageData(0, 0, 1, 1).data;
        value = `#${[
            d[0],
            d[1],
            d[2]
        ].map((v)=>v.toString(16).padStart(2, '0')).join('')}`;
    } catch  {
    // Tainted (should not happen: same-origin files); keep the manifest colour.
    }
    meanCache.set(id, value);
    return value;
}
// ---------------------------------------------------------------------------
// Room planes
// ---------------------------------------------------------------------------
function drawRoom(ctx, k) {
    const { cam, P, step } = k;
    const edges = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["frameEdgeDepths"])(cam);
    const zl = Math.max(0.5, Math.min(edges.left, cam.zBack - 0.5));
    const zr = Math.max(0.5, Math.min(edges.right, cam.zBack - 0.5));
    const zf = Math.max(0.5, Math.min(edges.floor, cam.zBack - 0.5));
    // Side walls (columns), then floor rows over their lower edge, then ceiling.
    const leftDepth = cam.zBack - zl;
    const rightDepth = cam.zBack - zr;
    vPlane(ctx, cam, sideWall(k, 'left', leftDepth), P, 0, cam.zBack, zl, 0, C, step);
    vPlane(ctx, cam, sideWall(k, 'right', rightDepth), P, cam.roomW, cam.zBack, zr, 0, C, step);
    const backTL = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, 0, C, cam.zBack);
    const backBR = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, cam.roomW, 0, cam.zBack);
    ctx.save();
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(backWall(k), backTL.x, backTL.y, backBR.x - backTL.x, backBR.y - backTL.y);
    ctx.restore();
    hPlane(ctx, cam, floorPlane(k, cam.zBack - zf), P, 0, cam.roomW, cam.zBack, zf, 0, step);
    drawCeiling(ctx, k);
}
/** Back wall, flat: x * P across, (C - y) * P down. */ function backWall(k) {
    const { cam, L, P, spec } = k;
    const W = cam.roomW;
    const c = pooled('back', W * P, C * P);
    const ctx = c.getContext('2d');
    const X = (x)=>x * P;
    const Y = (y)=>(C - y) * P;
    fillTexture(ctx, k.paint, P, 0, 0, c.width, c.height, 0, c.height);
    // Paint reads lighter high on the wall (bounce from the ceiling).
    ctx.fillStyle = linear(ctx, 0, 0, 0, c.height, [
        [
            0,
            'rgba(255,255,255,0.05)'
        ],
        [
            1,
            'rgba(0,0,0,0.05)'
        ]
    ]);
    ctx.fillRect(0, 0, c.width, c.height);
    baseboard(ctx, c.width, Y(0), P);
    // Daylight comes from the window side: the wall brightens towards it.
    const fromRight = L.window.wall === 'right';
    ctx.fillStyle = linear(ctx, 0, 0, c.width, 0, [
        [
            0,
            fromRight ? 'rgba(40,30,20,0.10)' : 'rgba(40,30,20,0.04)'
        ],
        [
            1,
            fromRight ? 'rgba(255,250,240,0.06)' : 'rgba(40,30,20,0.04)'
        ]
    ]);
    ctx.fillRect(0, 0, c.width, c.height);
    // Tile zones.
    if (L.shower) tileZone(ctx, k, X(L.shower.x0), Y(L.shower.tileTop), X(L.shower.x1), Y(0));
    if (L.alcove) tileZone(ctx, k, X(L.alcove.x0), Y(L.alcove.tileTop), X(L.alcove.x1), Y(0));
    // Window over a freestanding tub.
    if (L.window.wall === 'back') windowPane(ctx, k, X(L.window.rect.x0), Y(L.window.rect.y1), X(L.window.rect.x1) - X(L.window.rect.x0), Y(L.window.rect.y0) - Y(L.window.rect.y1), P);
    // Backsplash in the counter material.
    const v = L.vanity;
    fillTexture(ctx, k.counter, P, X(v.x0 - 0.06), Y(v.top + 0.35), X(v.x1 + 0.06) - X(v.x0 - 0.06), 0.35 * P, X(v.x0), Y(v.top));
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(X(v.x0 - 0.06), Y(v.top + 0.35) - 1, X(v.x1 + 0.06) - X(v.x0 - 0.06), 2);
    // Cabinet shadow on the wall (strong under a floating vanity).
    if (v.bottom > 0) {
        softShape(ctx, 0.5 * P, 'rgba(0,0,0,0.38)', (s)=>s.rect(X(v.x0 + 0.1), Y(v.bottom + 0.15), X(v.x1 - 0.1) - X(v.x0 + 0.1), 0.6 * P));
    }
    // Niche.
    if (L.niche) niche(ctx, k, L.niche, X, Y);
    // Mirrors and sconces hang on this wall.
    for (const m of L.mirrors)mirror(ctx, k, m, X, Y);
    for (const s of L.sconces)sconce(ctx, k, s, X, Y);
    // Shower trim on the wall.
    if (L.valve) valveTrim(ctx, k, X(L.valve.x), Y(L.valve.y));
    if (L.showerHead?.kind === 'wall') wallHead(ctx, k, X(L.showerHead.x), Y(L.showerHead.y));
    if (L.towel) towelHook(ctx, k, X(L.towel.x), Y(L.towel.y));
    if (spec.extras.heatedFloor && thermostatOnBack(k)) thermostat(ctx, k, X(v.x1 + 0.45), Y(4.3));
    // Vector toilet: a soft tank shadow on the wall (the generated toilet casts its own, see toilet()).
    if (!(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spriteImage"])('toilet')) softShape(ctx, 0.25 * P, 'rgba(0,0,0,0.2)', (s)=>s.rect(X(L.toilet.cx - 0.6), Y(2.5), 1.2 * P, 1.1 * P));
    // Corner occlusion along every edge.
    edgeShade(ctx, c.width, c.height, P, {
        left: 0.9,
        right: 0.9,
        top: 0.5,
        bottom: 0.45
    }, 0.3);
    return c;
}
/** Painted 4" baseboard with a lit top edge (tile zones and the vanity are drawn over it). */ function baseboard(ctx, w, floorY, P) {
    const h = 0.33 * P;
    ctx.fillStyle = '#f4f2ed';
    ctx.fillRect(0, floorY - h, w, h);
    ctx.fillStyle = linear(ctx, 0, floorY - h, 0, floorY, [
        [
            0,
            'rgba(255,255,255,0.9)'
        ],
        [
            0.08,
            'rgba(0,0,0,0.06)'
        ],
        [
            0.15,
            'rgba(0,0,0,0)'
        ],
        [
            1,
            'rgba(0,0,0,0.1)'
        ]
    ]);
    ctx.fillRect(0, floorY - h, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, floorY - h - 1, w, 1.5);
}
function tileZone(ctx, k, x0, y0, x1, y1) {
    fillTexture(ctx, k.tile, k.P, x0, y0, x1 - x0, y1 - y0, x0, y1);
    // Schluter / bullnose edge where tile meets paint.
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x0, y0, x1 - x0, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x0, y0 + 2, x1 - x0, 2);
}
function edgeShade(ctx, w, h, P, e, strength = 0.22) {
    const a = strength;
    if (e.left) {
        ctx.fillStyle = linear(ctx, 0, 0, e.left * P, 0, [
            [
                0,
                `rgba(30,24,18,${a})`
            ],
            [
                1,
                'rgba(30,24,18,0)'
            ]
        ]);
        ctx.fillRect(0, 0, e.left * P, h);
    }
    if (e.right) {
        ctx.fillStyle = linear(ctx, w, 0, w - e.right * P, 0, [
            [
                0,
                `rgba(30,24,18,${a})`
            ],
            [
                1,
                'rgba(30,24,18,0)'
            ]
        ]);
        ctx.fillRect(w - e.right * P, 0, e.right * P, h);
    }
    if (e.top) {
        ctx.fillStyle = linear(ctx, 0, 0, 0, e.top * P, [
            [
                0,
                `rgba(30,24,18,${a * 0.8})`
            ],
            [
                1,
                'rgba(30,24,18,0)'
            ]
        ]);
        ctx.fillRect(0, 0, w, e.top * P);
    }
    if (e.bottom) {
        ctx.fillStyle = linear(ctx, 0, h, 0, h - e.bottom * P, [
            [
                0,
                `rgba(30,24,18,${a})`
            ],
            [
                1,
                'rgba(30,24,18,0)'
            ]
        ]);
        ctx.fillRect(0, h - e.bottom * P, w, e.bottom * P);
    }
}
/** Side wall, flat: u = distance from the back wall, v = (C - y). */ function sideWall(k, side, depth) {
    const { L, P } = k;
    const c = pooled(`side-${side}`, depth * P, C * P);
    const ctx = c.getContext('2d');
    const U = (fromBack)=>fromBack * P;
    const Y = (y)=>(C - y) * P;
    // Anchor the paint at the back corner so it lines up with the back wall.
    fillTexture(ctx, k.paint, P, 0, 0, c.width, c.height, 0, c.height);
    baseboard(ctx, c.width, Y(0), P);
    if (side === 'left') {
        if (L.shower) tileZoneSide(ctx, k, 0, Y(L.shower.tileTop), U(L.shower.depth), Y(0));
        if (L.alcove) tileZoneSide(ctx, k, 0, Y(L.alcove.tileTop), U(L.alcove.depth), Y(0));
    } else {
        if (L.window.wall === 'right') {
            const zb = k.cam.zBack;
            const w = L.window;
            windowPane(ctx, k, U(zb - w.z1), Y(w.y1), U(w.z1 - w.z0), Y(w.y0) - Y(w.y1), P);
        }
        // Heated floor: its thermostat by the back corner when the back wall has no room beside the vanity.
        if (k.spec.extras.heatedFloor && !thermostatOnBack(k)) thermostat(ctx, k, U(0.4), Y(4.3));
    }
    // Light: the left wall faces the window and reads brighter towards the room.
    // Both side walls fall off towards the camera; the window wall is the darker one
    // (light comes from it, so it is seen against the light).
    const windowWall = side === 'right' === (L.window.wall === 'right');
    ctx.fillStyle = linear(ctx, 0, 0, c.width, 0, [
        [
            0,
            windowWall ? 'rgba(40,30,22,0.10)' : 'rgba(255,250,240,0.04)'
        ],
        [
            1,
            windowWall ? 'rgba(40,30,22,0.30)' : 'rgba(40,30,22,0.20)'
        ]
    ]);
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = linear(ctx, 0, 0, 0, c.height, [
        [
            0,
            'rgba(40,30,22,0.06)'
        ],
        [
            0.5,
            'rgba(40,30,22,0)'
        ],
        [
            1,
            'rgba(40,30,22,0.08)'
        ]
    ]);
    ctx.fillRect(0, 0, c.width, c.height);
    edgeShade(ctx, c.width, c.height, P, {
        left: 0.9,
        top: 0.5,
        bottom: 0.45
    }, 0.3);
    return c;
}
function tileZoneSide(ctx, k, x0, y0, x1, y1) {
    // The pattern origin is the back corner, so courses run on from the back wall.
    fillTexture(ctx, k.tile, k.P, x0, y0, x1 - x0, y1 - y0, 0, y1);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(x0, y0, x1 - x0, 2);
    // Tile edge trim where the tile stops along the wall.
    ctx.fillStyle = 'rgba(0,0,0,0.14)';
    ctx.fillRect(x1 - 2, y0, 3, y1 - y0);
}
/** Floor, flat: u = x, v = distance from the back wall. */ function floorPlane(k, depth) {
    const { cam, L, P, spec } = k;
    const W = cam.roomW;
    const c = pooled('floor', W * P, depth * P);
    const ctx = c.getContext('2d');
    const X = (x)=>x * P;
    const V = (fromBack)=>fromBack * P;
    const zb = cam.zBack;
    fillTexture(ctx, k.floor, P, 0, 0, c.width, c.height, 0, 0);
    // Shower pan: small hex mosaic tinted by the wall tile, with a linear drain.
    if (L.shower) {
        const s = L.shower;
        const x0 = X(s.x0);
        const w = X(s.x1) - x0;
        const h = V(s.depth);
        fillTexture(ctx, 'floor_hex_mosaic', P * 0.75, x0, 0, w, h, 0, 0);
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexRgb"])(textureFallback(k.tile)), 12);
        ctx.fillRect(x0, 0, w, h);
        ctx.restore();
        ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -25);
        ctx.fillRect(x0 + 0.25 * P, V(0.35), w - 0.5 * P, 0.07 * P);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(x0 + 0.25 * P, V(0.35), w - 0.5 * P, 0.015 * P);
        // Curb.
        ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexRgb"])(textureFallback(k.tile)), -8);
        ctx.fillRect(x0, h - 0.1 * P, w, 0.1 * P);
    }
    // Bath mat in front of the vanity (or the shower when there is room).
    const v = L.vanity;
    const matW = Math.min(2.6, v.x1 - v.x0 - 0.3);
    const matX = (v.x0 + v.x1) / 2 - matW / 2;
    const matZ = v.depth + 0.35;
    if (matZ + 1.7 < depth - 0.2) {
        softShape(ctx, 0.08 * P, 'rgba(0,0,0,0.25)', (s)=>roundRect(s, X(matX), V(matZ), matW * P, 1.7 * P, 0.12 * P));
        ctx.beginPath();
        roundRect(ctx, X(matX), V(matZ), matW * P, 1.7 * P, 0.12 * P);
        ctx.fillStyle = k.dark ? '#e2ddd2' : '#f6f2ea';
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.globalAlpha = 0.22;
        ctx.globalCompositeOperation = 'multiply';
        const pat = ctx.createPattern((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["grain"])(), 'repeat');
        if (pat) {
            ctx.fillStyle = pat;
            ctx.fillRect(X(matX), V(matZ), matW * P, 1.7 * P);
        }
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(160,150,135,0.5)';
        ctx.lineWidth = 0.05 * P;
        ctx.beginPath();
        roundRect(ctx, X(matX) + 0.12 * P, V(matZ) + 0.12 * P, (matW - 0.24) * P, 1.46 * P, 0.08 * P);
        ctx.stroke();
        ctx.restore();
    }
    // Contact shadows of everything standing on the floor.
    const shadow = (blur, a, path)=>softShape(ctx, blur * P, `rgba(25,18,12,${a})`, path);
    if (v.bottom === 0) shadow(0.18, 0.5, (s)=>s.rect(X(v.x0 - 0.02), 0, X(v.x1 + 0.02) - X(v.x0 - 0.02), V(v.depth + 0.05)));
    else shadow(0.55, 0.32, (s)=>s.rect(X(v.x0 + 0.2), 0, X(v.x1 - 0.2) - X(v.x0 + 0.2), V(v.depth - 0.2)));
    if (L.toilet) {
        const t = L.toilet;
        shadow(0.2, 0.42, (s)=>s.ellipse(X(t.cx), V(1.3), 0.45 * P, 0.8 * P, 0, 0, Math.PI * 2));
    }
    if (L.alcove) shadow(0.15, 0.45, (s)=>s.rect(X(L.alcove.x0), 0, X(L.alcove.x1) - X(L.alcove.x0), V(L.alcove.depth + 0.04)));
    if (L.freestanding) {
        const t = L.freestanding;
        const mid = zb - (t.zFront + t.depth / 2);
        shadow(0.35, 0.4, (s)=>s.ellipse(X(t.cx), V(mid), t.width / 2 * 0.88 * P, t.depth / 2 * 0.82 * P, 0, 0, Math.PI * 2));
    }
    if (L.plant) {
        const p = L.plant;
        shadow(0.25, 0.4, (s)=>s.ellipse(X(p.x), V(zb - p.z), 0.55 * P, 0.4 * P, 0, 0, Math.PI * 2));
    }
    if (L.alcove?.partition) shadow(0.2, 0.35, (s)=>s.rect(X(L.alcove.partition.x0), 0, X(L.alcove.partition.x1) - X(L.alcove.partition.x0) + 0.1 * P, V(L.alcove.depth)));
    // Daylight from the window, or warm can pools in the evening (light map does the rest).
    if (!k.dark) {
        const w = L.window;
        const glow = w.wall === 'right' ? {
            x: X(W - 1.3),
            y: V((zb - w.z0 + zb - w.z1) / 2 + 0.6),
            rx: 2.2 * P,
            ry: 1.7 * P
        } : {
            x: X((w.rect.x0 + w.rect.x1) / 2),
            y: V(L.freestanding ? L.freestanding.depth + 1.6 : 1.6),
            rx: 2.6 * P,
            ry: 1.6 * P
        };
        ctx.save();
        ctx.translate(glow.x, glow.y);
        ctx.scale(glow.rx, glow.ry);
        ctx.fillStyle = radial(ctx, 0, 0, 1, [
            [
                0,
                'rgba(255,248,232,0.30)'
            ],
            [
                1,
                'rgba(255,248,232,0)'
            ]
        ]);
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
    }
    // Polished floor: a faint sheen towards the back (reflected wall light).
    ctx.fillStyle = linear(ctx, 0, 0, 0, c.height, [
        [
            0,
            'rgba(255,255,255,0.10)'
        ],
        [
            0.4,
            'rgba(255,255,255,0)'
        ]
    ]);
    ctx.fillRect(0, 0, c.width, c.height);
    edgeShade(ctx, c.width, c.height, P, {
        left: 0.55,
        right: 0.55,
        top: 0.5
    }, 0.28);
    void spec;
    return c;
}
function drawCeiling(ctx, k) {
    const { cam, L } = k;
    const tl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, 0, C, cam.zBack);
    const tr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, cam.roomW, C, cam.zBack);
    const far = Math.max(0.5, cam.zFront);
    const nl = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, 0, C, far);
    const nr = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, cam.roomW, C, far);
    ctx.save();
    ctx.beginPath();
    polygon(ctx, [
        nl,
        nr,
        tr,
        tl
    ]);
    ctx.clip();
    const base = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.paintRgb, 0);
    // Ceilings photograph a little darker than the walls, darkest near the camera.
    const ceil = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mix"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexRgb"])('#f1eee8'), k.paintRgb, 0.15);
    ctx.fillStyle = base;
    ctx.fillRect(-10, -10, FW + 20, tl.y + 20);
    ctx.fillStyle = linear(ctx, 0, 0, 0, tl.y, [
        [
            0,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(ceil, -38)
        ],
        [
            1,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(ceil, -10)
        ]
    ]);
    ctx.fillRect(-10, -10, FW + 20, tl.y + 20);
    ctx.restore();
    // Crown shadow along the back edge.
    ctx.fillStyle = linear(ctx, 0, tl.y - 10, 0, tl.y, [
        [
            0,
            'rgba(0,0,0,0)'
        ],
        [
            1,
            'rgba(0,0,0,0.12)'
        ]
    ]);
    ctx.fillRect(tl.x, tl.y - 10, tr.x - tl.x, 10);
    // Recessed cans.
    for (const can of L.cans){
        const p = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, can.x, C, can.z);
        const r = 0.28 * cam.f / can.z;
        const ry = Math.max(1, Math.abs((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, can.x, C, can.z - 0.28).y - (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(cam, can.x, C, can.z + 0.28).y) / 2);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r * 1.12, ry * 1.12, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r, ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = k.dark ? '#fff4dc' : radial(ctx, p.x, p.y, r, [
            [
                0,
                '#fbfaf7'
            ],
            [
                1,
                '#c9c6bf'
            ]
        ]);
        ctx.fill();
    }
}
function windowPane(ctx, k, x, y, w, h, P) {
    const frame = 0.18 * P;
    softShape(ctx, 0.12 * P, 'rgba(0,0,0,0.25)', (s)=>s.rect(x - frame, y - frame, w + frame * 2, h + frame * 2 + 0.1 * P));
    ctx.fillStyle = '#f7f6f2';
    ctx.fillRect(x - frame, y - frame, w + frame * 2, h + frame * 2);
    // Sill.
    ctx.fillStyle = '#fbfaf7';
    ctx.fillRect(x - frame * 1.6, y + h + frame * 0.6, w + frame * 3.2, frame * 0.8);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(x - frame * 1.6, y + h + frame * 1.4, w + frame * 3.2, 2);
    // Frosted glass: bright daylight, or dusk blue.
    ctx.fillStyle = k.dark ? linear(ctx, 0, y, 0, y + h, [
        [
            0,
            '#1f2b45'
        ],
        [
            1,
            '#33405c'
        ]
    ]) : linear(ctx, 0, y, 0, y + h, [
        [
            0,
            '#ffffff'
        ],
        [
            0.6,
            '#f4f6f6'
        ],
        [
            1,
            '#e6ebec'
        ]
    ]);
    ctx.fillRect(x, y, w, h);
    if (!k.dark) {
        // Soft greenery behind the frosted glass.
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        for(let i = 0; i < 5; i++){
            ctx.fillStyle = radial(ctx, x + w * (0.15 + i * 0.18), y + h * (0.75 + i % 2 * 0.1), h * 0.35, [
                [
                    0,
                    'rgba(150,175,140,0.28)'
                ],
                [
                    1,
                    'rgba(150,175,140,0)'
                ]
            ]);
            ctx.fillRect(x, y, w, h);
        }
        ctx.restore();
    }
    // Muntin.
    ctx.fillStyle = '#f2f1ec';
    ctx.fillRect(x, y + h / 2 - frame * 0.35, w, frame * 0.7);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(x, y + h / 2 + frame * 0.35, w, 2);
}
function niche(ctx, k, n, X, Y) {
    const x = X(n.x0);
    const y = Y(n.y1);
    const w = X(n.x1) - x;
    const h = Y(n.y0) - y;
    ctx.save();
    fillTexture(ctx, k.tile, k.P, x, y, w, h, X(0), Y(0));
    // Recess depth: shadow from the top and left, a lit sill.
    ctx.fillStyle = linear(ctx, 0, y, 0, y + h, [
        [
            0,
            'rgba(0,0,0,0.38)'
        ],
        [
            0.35,
            'rgba(0,0,0,0.12)'
        ],
        [
            1,
            'rgba(0,0,0,0.02)'
        ]
    ]);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = linear(ctx, x, 0, x + w, 0, [
        [
            0,
            'rgba(0,0,0,0.18)'
        ],
        [
            0.15,
            'rgba(0,0,0,0)'
        ],
        [
            0.85,
            'rgba(0,0,0,0)'
        ],
        [
            1,
            'rgba(0,0,0,0.12)'
        ]
    ]);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(x - 2, y + h - 3, w + 4, 4);
    ctx.strokeStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, 0, 0.8);
    ctx.lineWidth = 0.025 * k.P;
    ctx.strokeRect(x, y, w, h);
    // Bottles.
    const P = k.P;
    const bottles = [
        [
            0.22,
            0.62,
            '#efe9df'
        ],
        [
            0.42,
            0.75,
            '#c9b79a'
        ],
        [
            0.62,
            0.55,
            '#ffffff'
        ]
    ];
    for (const [fx, hFt, col] of bottles){
        const bw = 0.2 * P;
        const bh = hFt * P * 0.9;
        const bx = x + w * fx;
        const by = y + h - 2 - bh;
        ctx.beginPath();
        roundRect(ctx, bx, by, bw, bh, bw * 0.25);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.fillStyle = linear(ctx, bx, 0, bx + bw, 0, [
            [
                0,
                'rgba(0,0,0,0.18)'
            ],
            [
                0.35,
                'rgba(255,255,255,0.25)'
            ],
            [
                1,
                'rgba(0,0,0,0.22)'
            ]
        ]);
        ctx.fill();
        ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -10);
        ctx.fillRect(bx + bw * 0.3, by - 0.08 * P, bw * 0.4, 0.08 * P);
    }
    ctx.restore();
}
function mirror(ctx, k, m, X, Y) {
    const P = k.P;
    const x = X(m.x0);
    const y = Y(m.y1);
    const w = X(m.x1) - x;
    const h = Y(m.y0) - y;
    const led = k.spec.extras.ledMirror;
    const r = led ? 0.22 * P : 0.04 * P;
    softShape(ctx, 0.12 * P, 'rgba(0,0,0,0.32)', (s)=>roundRect(s, x + 0.03 * P, y + 0.07 * P, w, h, r));
    // Frame (metal for a framed mirror; a thin bevel for LED).
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, r);
    ctx.fillStyle = led ? '#dfe3e4' : k.metal;
    ctx.fill();
    const inset = led ? 0.04 * P : 0.09 * P;
    const gx = x + inset;
    const gy = y + inset;
    const gw = w - inset * 2;
    const gh = h - inset * 2;
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, gx, gy, gw, gh, Math.max(0, r - inset));
    ctx.clip();
    // Reflection: the room behind the camera (the opposite wall and the doorway), soft.
    const wall = k.paintRgb;
    ctx.fillStyle = linear(ctx, 0, gy, 0, gy + gh, [
        [
            0,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["mix"])(wall, [
                255,
                255,
                255
            ], 0.35), k.dark ? -90 : -4)
        ],
        [
            1,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(wall, k.dark ? -110 : -24)
        ]
    ]);
    ctx.fillRect(gx, gy, gw, gh);
    // Doorway reflected: a darker vertical panel with a white casing.
    const dx = gx + gw * 0.58;
    ctx.fillStyle = k.dark ? 'rgba(20,18,26,0.6)' : 'rgba(120,110,100,0.22)';
    ctx.fillRect(dx, gy + gh * 0.18, gw * 0.3, gh);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(dx - 0.06 * P, gy + gh * 0.14, 0.06 * P, gh);
    // Glass sheen.
    ctx.fillStyle = linear(ctx, gx, gy, gx + gw, gy + gh, [
        [
            0,
            'rgba(255,255,255,0.28)'
        ],
        [
            0.35,
            'rgba(255,255,255,0.05)'
        ],
        [
            0.55,
            'rgba(255,255,255,0.12)'
        ],
        [
            0.7,
            'rgba(255,255,255,0)'
        ]
    ]);
    ctx.fillRect(gx, gy, gw, gh);
    ctx.restore();
    if (led) {
        // Frosted LED band just inside the edge.
        ctx.save();
        ctx.lineWidth = 0.07 * P;
        ctx.strokeStyle = k.dark ? 'rgba(255,240,210,0.95)' : 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        roundRect(ctx, gx + 0.12 * P, gy + 0.12 * P, gw - 0.24 * P, gh - 0.24 * P, Math.max(0, r - 0.12 * P));
        ctx.stroke();
        ctx.restore();
    }
}
/**
 * A generated sprite for trim that only exists in a silver finish: used when
 * the picked metal is silver too, otherwise the vector drawing (which takes
 * any finish) is drawn instead.
 */ function silverSprite(k, id) {
    const metal = k.spec.metal ?? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_DEFAULT_METAL"];
    return metal === 'chrome' || metal === 'brushed_nickel' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spriteImage"])(id) : null;
}
function sconce(ctx, k, s, X, Y) {
    const P = k.P;
    const x = X(s.x);
    const y = Y(s.y);
    // The generated sconce is brushed nickel (a warm silver): chrome gets the vector one in true chrome.
    const img = !k.dark && (k.spec.metal ?? __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_DEFAULT_METAL"]) === 'brushed_nickel' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spriteImage"])('sconce') : null;
    if (img) {
        const e = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITES"].sconce;
        softShape(ctx, 0.12 * P, 'rgba(0,0,0,0.28)', (c)=>roundRect(c, x - 0.12 * P, y - 0.5 * P + 0.08 * P, 0.24 * P, 1.0 * P, 0.05 * P));
        ctx.drawImage(img, x - e.widthFt * P / 2, y - e.heightFt * P / 2, e.widthFt * P, e.heightFt * P);
        return;
    }
    softShape(ctx, 0.1 * P, 'rgba(0,0,0,0.3)', (c)=>roundRect(c, x - 0.1 * P, y - 0.45 * P + 0.06 * P, 0.2 * P, 0.95 * P, 0.03 * P));
    // Backplate.
    ctx.beginPath();
    roundRect(ctx, x - 0.07 * P, y - 0.3 * P, 0.14 * P, 0.6 * P, 0.03 * P);
    ctx.fillStyle = linear(ctx, x - 0.07 * P, 0, x + 0.07 * P, 0, [
        [
            0,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -30)
        ],
        [
            0.4,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, 30)
        ],
        [
            1,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -40)
        ]
    ]);
    ctx.fill();
    // Shade: frosted cylinder.
    const sw = 0.36 * P;
    const sh = 0.7 * P;
    ctx.beginPath();
    roundRect(ctx, x - sw / 2, y - sh / 2, sw, sh, 0.06 * P);
    ctx.fillStyle = k.dark ? linear(ctx, x - sw / 2, 0, x + sw / 2, 0, [
        [
            0,
            '#ffd9a0'
        ],
        [
            0.5,
            '#fff6e4'
        ],
        [
            1,
            '#ffd29a'
        ]
    ]) : linear(ctx, x - sw / 2, 0, x + sw / 2, 0, [
        [
            0,
            '#d9d6cf'
        ],
        [
            0.45,
            '#fbfaf6'
        ],
        [
            1,
            '#cfccc4'
        ]
    ]);
    ctx.fill();
    ctx.fillStyle = k.metal;
    ctx.fillRect(x - sw / 2 - 0.01 * P, y - sh / 2 - 0.02 * P, sw + 0.02 * P, 0.05 * P);
    ctx.fillRect(x - sw / 2 - 0.01 * P, y + sh / 2 - 0.03 * P, sw + 0.02 * P, 0.05 * P);
}
function valveTrim(ctx, k, x, y) {
    const P = k.P;
    ctx.beginPath();
    ctx.arc(x, y, 0.32 * P, 0, Math.PI * 2);
    ctx.fillStyle = radial(ctx, x - 0.1 * P, y - 0.1 * P, 0.4 * P, [
        [
            0,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, 50)
        ],
        [
            1,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -35)
        ]
    ]);
    ctx.fill();
    ctx.strokeStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -55, 0.6);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -20);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.3);
    ctx.beginPath();
    roundRect(ctx, -0.04 * P, -0.05 * P, 0.4 * P, 0.1 * P, 0.04 * P);
    ctx.fill();
    ctx.restore();
}
function wallHead(ctx, k, x, y) {
    const P = k.P;
    const img = silverSprite(k, 'shower_head');
    if (img) {
        const e = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITES"].shower_head;
        ctx.drawImage(img, x - e.widthFt * P / 2, y - 0.1 * P, e.widthFt * P, e.heightFt * P);
        return;
    }
    ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -15);
    ctx.fillRect(x - 0.035 * P, y - 0.02 * P, 0.07 * P, 0.4 * P);
    ctx.beginPath();
    ctx.ellipse(x, y + 0.4 * P, 0.3 * P, 0.16 * P, 0, 0, Math.PI * 2);
    ctx.fillStyle = radial(ctx, x - 0.08 * P, y + 0.35 * P, 0.32 * P, [
        [
            0,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, 55)
        ],
        [
            1,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -40)
        ]
    ]);
    ctx.fill();
}
function towelHook(ctx, k, x, y) {
    const P = k.P;
    ctx.fillStyle = k.metal;
    ctx.beginPath();
    ctx.arc(x, y, 0.06 * P, 0, Math.PI * 2);
    ctx.fill();
    const sprite = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spriteImage"])('towel');
    const tw = 1.25 * P;
    const th = 2.2 * P;
    if (sprite) {
        const e = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITES"].towel;
        ctx.drawImage(sprite, x - e.widthFt * P / 2, y - 0.05 * P, e.widthFt * P, e.heightFt * P);
        return;
    }
    softShape(ctx, 0.12 * P, 'rgba(0,0,0,0.28)', (s)=>towelPath(s, x + 0.05 * P, y + 0.08 * P, tw, th));
    ctx.beginPath();
    towelPath(ctx, x, y, tw, th);
    const base = k.spec.paint === 'navy' ? [
        240,
        236,
        228
    ] : [
        214,
        200,
        182
    ];
    ctx.fillStyle = linear(ctx, x - tw / 2, 0, x + tw / 2, 0, [
        [
            0,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(base, -38)
        ],
        [
            0.18,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(base, -5)
        ],
        [
            0.32,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(base, -24)
        ],
        [
            0.5,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(base, 8)
        ],
        [
            0.68,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(base, -20)
        ],
        [
            0.85,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(base, 0)
        ],
        [
            1,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(base, -40)
        ]
    ]);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = 'multiply';
    const pat = ctx.createPattern((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["grain"])(), 'repeat');
    if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(x - tw, y, tw * 2, th + 10);
    }
    ctx.restore();
    // Woven band.
    ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(base, -30, 0.6);
    ctx.fillRect(x - tw / 2 + 2, y + th * 0.82, tw - 4, 0.08 * P);
}
function towelPath(ctx, x, y, w, h) {
    ctx.moveTo(x - w * 0.2, y);
    ctx.quadraticCurveTo(x - w * 0.5, y + h * 0.15, x - w * 0.48, y + h * 0.5);
    ctx.lineTo(x - w * 0.5, y + h);
    ctx.quadraticCurveTo(x, y + h * 1.03, x + w * 0.5, y + h);
    ctx.lineTo(x + w * 0.48, y + h * 0.5);
    ctx.quadraticCurveTo(x + w * 0.5, y + h * 0.15, x + w * 0.2, y);
    ctx.closePath();
}
/** The heated-floor thermostat goes on the back wall right of the vanity when it fits there. */ function thermostatOnBack(k) {
    return k.L.vanity.x1 + 0.7 < k.cam.roomW - 0.15;
}
function thermostat(ctx, k, x, y) {
    const P = k.P;
    ctx.beginPath();
    roundRect(ctx, x - 0.17 * P, y - 0.22 * P, 0.34 * P, 0.44 * P, 0.04 * P);
    ctx.fillStyle = '#f7f7f5';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = k.dark ? '#ffb46b' : '#3c4a52';
    ctx.fillRect(x - 0.11 * P, y - 0.14 * P, 0.22 * P, 0.12 * P);
}
function drawFixtures(ctx, k) {
    const { L } = k;
    const zb = k.cam.zBack;
    const list = [];
    if (L.showerHead?.kind === 'rain') list.push({
        z: zb - 1.2,
        draw: ()=>rainHead(ctx, k)
    });
    if (L.shower) {
        const s = L.shower;
        if (L.bench) list.push({
            z: zb - L.bench.zFromBack1,
            draw: ()=>bench(ctx, k)
        });
        list.push({
            z: zb - s.depth,
            draw: ()=>showerGlass(ctx, k)
        });
    }
    if (L.alcove) list.push({
        z: zb - L.alcove.depth,
        draw: ()=>alcoveTub(ctx, k)
    });
    if (L.freestanding) list.push({
        z: L.freestanding.zFront,
        draw: ()=>freestandingTub(ctx, k)
    });
    if (L.toilet) list.push({
        z: zb - 2.3,
        draw: ()=>toilet(ctx, k)
    });
    list.push({
        z: zb - L.vanity.depth,
        draw: ()=>vanity(ctx, k)
    });
    if (L.plant) list.push({
        z: L.plant.z - 0.4,
        draw: ()=>plant(ctx, k)
    });
    list.sort((a, b)=>b.z - a.z);
    for (const d of list)d.draw();
    if (!k.draft) mirrorReflections(ctx, k);
}
/**
 * The mirrors catch a dim, soft reflection of the room: a flipped, blurred
 * crop of the frame drawn so far, darkened, under a fresh glass sheen.
 */ function mirrorReflections(ctx, k) {
    const { cam, L } = k;
    const zb = cam.zBack;
    const s = cam.f / zb;
    const t = ctx.getTransform();
    const led = k.spec.extras.ledMirror;
    const inset = led ? 0.04 : 0.09;
    for (const m of L.mirrors){
        const a = pt(k, m.x0 + inset, m.y1 - inset, zb);
        const b = pt(k, m.x1 - inset, m.y0 + inset, zb);
        const w = b.x - a.x;
        const h = b.y - a.y;
        if (w < 4 || h < 4) continue;
        // Source: a wider patch of the room, pulled towards the middle of the frame and down to the fixtures.
        const cx = (a.x + b.x) / 2 + (FW / 2 - (a.x + b.x) / 2) * 0.4;
        const sw = w * 2.4;
        const sh = h * 1.7;
        const sx = cx - sw / 2;
        const sy = a.y + h * 0.35;
        const dx0 = Math.max(0, Math.round(t.a * sx + t.e));
        const dy0 = Math.max(0, Math.round(t.d * sy + t.f));
        const dx1 = Math.min(ctx.canvas.width, Math.round(t.a * (sx + sw) + t.e));
        const dy1 = Math.min(ctx.canvas.height, Math.round(t.d * (sy + sh) + t.f));
        if (dx1 - dx0 < 8 || dy1 - dy0 < 8) continue;
        // Small and smoothed up again: the blur of an out-of-focus reflection.
        const tmp = pooled('mirror', Math.max(4, Math.round((dx1 - dx0) / 7)), Math.max(4, Math.round((dy1 - dy0) / 7)));
        const tc = tmp.getContext('2d');
        tc.imageSmoothingQuality = 'high';
        tc.setTransform(-1, 0, 0, 1, tmp.width, 0);
        tc.drawImage(ctx.canvas, dx0, dy0, dx1 - dx0, dy1 - dy0, 0, 0, tmp.width, tmp.height);
        tc.setTransform(1, 0, 0, 1, 0, 0);
        ctx.save();
        ctx.beginPath();
        roundRect(ctx, a.x, a.y, w, h, led ? Math.max(0, 0.18 * s) : 0);
        ctx.clip();
        ctx.globalAlpha = k.dark ? 0.4 : 0.62;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tmp, a.x, a.y, w, h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = k.dark ? 'rgba(10,10,16,0.25)' : 'rgba(40,44,48,0.10)';
        ctx.fillRect(a.x, a.y, w, h);
        ctx.fillStyle = linear(ctx, a.x, a.y, b.x, b.y, [
            [
                0,
                'rgba(255,255,255,0.26)'
            ],
            [
                0.32,
                'rgba(255,255,255,0.04)'
            ],
            [
                0.5,
                'rgba(255,255,255,0.1)'
            ],
            [
                0.62,
                'rgba(255,255,255,0)'
            ]
        ]);
        ctx.fillRect(a.x, a.y, w, h);
        ctx.restore();
    }
}
/** A tight dark line where something meets the floor (frame px), so it sits on it instead of floating. */ function contactLine(ctx, x0, x1, y, s, a = 0.4) {
    const h = Math.max(1.5, 0.09 * s);
    ctx.fillStyle = linear(ctx, 0, y - h * 0.4, 0, y + h, [
        [
            0,
            'rgba(18,12,8,0)'
        ],
        [
            0.35,
            `rgba(18,12,8,${a})`
        ],
        [
            1,
            'rgba(18,12,8,0)'
        ]
    ]);
    ctx.fillRect(x0, y - h * 0.4, x1 - x0, h * 1.4);
}
function pt(k, x, y, z) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["project"])(k.cam, x, y, z);
}
function box(ctx, k, b, faces) {
    const { cam } = k;
    const P = (x, y, z)=>pt(k, x, y, z);
    if (faces.side) {
        if (cam.camX < b.x0) faces.side(ctx, [
            P(b.x0, b.y0, b.zNear),
            P(b.x0, b.y0, b.zFar),
            P(b.x0, b.y1, b.zFar),
            P(b.x0, b.y1, b.zNear)
        ], 'left');
        else if (cam.camX > b.x1) faces.side(ctx, [
            P(b.x1, b.y0, b.zNear),
            P(b.x1, b.y0, b.zFar),
            P(b.x1, b.y1, b.zFar),
            P(b.x1, b.y1, b.zNear)
        ], 'right');
    }
    if (faces.top && b.y1 < cam.eye) faces.top(ctx, [
        P(b.x0, b.y1, b.zNear),
        P(b.x1, b.y1, b.zNear),
        P(b.x1, b.y1, b.zFar),
        P(b.x0, b.y1, b.zFar)
    ]);
    if (faces.front) faces.front(ctx, [
        P(b.x0, b.y0, b.zNear),
        P(b.x1, b.y0, b.zNear),
        P(b.x1, b.y1, b.zNear),
        P(b.x0, b.y1, b.zNear)
    ]);
}
function fillQuad(ctx, quad, style) {
    ctx.beginPath();
    polygon(ctx, quad);
    ctx.fillStyle = style;
    ctx.fill();
}
/** Texture a frontal rect (world x0..x1, y0..y1 at depth z) at its true scale. */ function frontalTexture(ctx, k, id, x0, x1, y0, y1, z) {
    const s = k.cam.f / z;
    const a = pt(k, x0, y1, z);
    const b = pt(k, x1, y0, z);
    ctx.save();
    ctx.beginPath();
    ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.clip();
    // Draw at frame scale s: build the pattern at device resolution, then scale back.
    const P = Math.max(8, Math.round(s * k.dpx));
    ctx.translate(a.x, b.y);
    ctx.scale(s / P, s / P);
    fillTexture(ctx, id, P, 0, -(b.y - a.y) * (P / s), (b.x - a.x) * (P / s), (b.y - a.y) * (P / s), 0, 0);
    ctx.restore();
}
function bench(ctx, k) {
    const b = k.L.bench;
    const zb = k.cam.zBack;
    const P = k.P;
    const zNear = zb - b.zFromBack1;
    const zFar = zb - b.zFromBack0;
    const depth = zFar - zNear;
    const tileRgb = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexRgb"])(textureFallback(k.tile));
    vPlane(ctx, k.cam, darken(surface('bench-side', k.tile, depth, b.height, P), 0.12), P, b.x1, zFar, zNear, 0, b.height, k.step);
    hPlane(ctx, k.cam, lighten(surface('bench-top', k.tile, b.x1, depth, P, false), 0.06), P, 0, b.x1, zFar, zNear, b.height, k.step);
    frontalTexture(ctx, k, k.tile, 0, b.x1, 0, b.height, zNear);
    const a = pt(k, 0, b.height, zNear);
    const c = pt(k, b.x1, b.height, zNear);
    ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(tileRgb, 30, 0.7);
    ctx.fillRect(a.x, a.y - 1, c.x - a.x, 2);
}
function darken(c, a) {
    const ctx = c.getContext('2d');
    ctx.fillStyle = `rgba(20,16,12,${a})`;
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
}
function lighten(c, a) {
    const ctx = c.getContext('2d');
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(0, 0, c.width, c.height);
    return c;
}
function rainHead(ctx, k) {
    const head = k.L.showerHead;
    const zb = k.cam.zBack;
    const m = k.metalRgb;
    const img = silverSprite(k, 'rain_head');
    if (img) {
        // Ceiling-mounted: the sprite hangs from the ceiling over the shower.
        const e = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITES"].rain_head;
        const z = zb - 1.2;
        const sc = k.cam.f / z;
        const top = pt(k, head.x, C, z);
        ctx.drawImage(img, top.x - e.widthFt * sc / 2, top.y, e.widthFt * sc, e.heightFt * sc);
        return;
    }
    // Arm out of the wall, then a 12" square plate seen from below.
    const a0 = pt(k, head.x, head.y + 0.25, zb);
    const a1 = pt(k, head.x, head.y + 0.25, zb - 1.1);
    ctx.strokeStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, -10);
    ctx.lineWidth = 0.08 * k.cam.f / (zb - 0.5);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(a0.x, a0.y);
    ctx.lineTo(a1.x, a1.y);
    ctx.stroke();
    const zc = zb - 1.2;
    const y = head.y;
    const q = [
        pt(k, head.x - 0.5, y, zc + 0.5),
        pt(k, head.x + 0.5, y, zc + 0.5),
        pt(k, head.x + 0.5, y, zc - 0.5),
        pt(k, head.x - 0.5, y, zc - 0.5)
    ];
    fillQuad(ctx, q, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, -35));
    const front = [
        pt(k, head.x - 0.5, y, zc - 0.5),
        pt(k, head.x + 0.5, y, zc - 0.5),
        pt(k, head.x + 0.5, y + 0.06, zc - 0.5),
        pt(k, head.x - 0.5, y + 0.06, zc - 0.5)
    ];
    fillQuad(ctx, front, linear(ctx, front[0].x, 0, front[1].x, 0, [
        [
            0,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, -10)
        ],
        [
            0.5,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, 45)
        ],
        [
            1,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, -20)
        ]
    ]));
}
function showerGlass(ctx, k) {
    const s = k.L.shower;
    const zb = k.cam.zBack;
    const zFront = zb - s.depth;
    const top = 6.6;
    const curb = s.curb;
    const tileRgb = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexRgb"])(textureFallback(k.tile));
    // Curb (a low tiled step along the front).
    box(ctx, k, {
        x0: s.x0,
        x1: s.x1,
        y0: 0,
        y1: curb,
        zNear: zFront - 0.15,
        zFar: zFront + 0.15
    }, {
        front: (c, q)=>fillQuad(c, q, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(tileRgb, -12)),
        top: (c, q)=>fillQuad(c, q, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(tileRgb, 8)),
        side: (c, q)=>fillQuad(c, q, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(tileRgb, -25))
    });
    // Return panel along x = x1 (seen at an angle), then the front panel + door.
    const ret = [
        pt(k, s.x1, curb, zFront),
        pt(k, s.x1, curb, zb),
        pt(k, s.x1, top, zb),
        pt(k, s.x1, top, zFront)
    ];
    glassPane(ctx, k, ret, 0.7);
    const front = [
        pt(k, s.x0, curb, zFront),
        pt(k, s.x1, curb, zFront),
        pt(k, s.x1, top, zFront),
        pt(k, s.x0, top, zFront)
    ];
    glassPane(ctx, k, front, 1);
    // Door split, hinges and handle.
    const doorX = s.x0 + (s.x1 - s.x0) * 0.48;
    const d0 = pt(k, doorX, curb, zFront);
    const d1 = pt(k, doorX, top, zFront);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(d0.x, d0.y);
    ctx.lineTo(d1.x, d1.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(80,110,110,0.35)';
    ctx.beginPath();
    ctx.moveTo(d0.x + 1.5, d0.y);
    ctx.lineTo(d1.x + 1.5, d1.y);
    ctx.stroke();
    const sc = k.cam.f / zFront;
    const m = k.metalRgb;
    for (const hy of [
        1.2,
        5.6
    ]){
        const h = pt(k, s.x1, hy, zFront);
        ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, 10);
        ctx.fillRect(h.x - 0.12 * sc, h.y - 0.2 * sc, 0.16 * sc, 0.4 * sc);
    }
    const hx = pt(k, doorX + 0.25, 4.4, zFront);
    const hb = pt(k, doorX + 0.25, 3.0, zFront);
    ctx.strokeStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, -10);
    ctx.lineWidth = 0.07 * sc;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hx.x, hx.y);
    ctx.lineTo(hb.x, hb.y);
    ctx.stroke();
    ctx.strokeStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, 60, 0.8);
    ctx.lineWidth = 0.02 * sc;
    ctx.beginPath();
    ctx.moveTo(hx.x - 0.02 * sc, hx.y);
    ctx.lineTo(hb.x - 0.02 * sc, hb.y);
    ctx.stroke();
    // Thin metal channel along the wall and the top of the return.
    const w0 = pt(k, s.x1, curb, zb);
    const w1 = pt(k, s.x1, top, zb);
    ctx.strokeStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, -5, 0.9);
    ctx.lineWidth = 0.05 * (k.cam.f / zb);
    ctx.beginPath();
    ctx.moveTo(w0.x, w0.y);
    ctx.lineTo(w1.x, w1.y);
    ctx.stroke();
}
/** Clear glass: faint tint, green edges, diagonal reflections. */ function glassPane(ctx, k, quad, strength) {
    ctx.save();
    ctx.beginPath();
    polygon(ctx, quad);
    ctx.fillStyle = k.dark ? `rgba(150,170,180,${0.1 * strength})` : `rgba(215,232,234,${0.16 * strength})`;
    ctx.fill();
    ctx.clip();
    const xs = quad.map((p)=>p.x);
    const ys = quad.map((p)=>p.y);
    const x0 = Math.min(...xs);
    const x1 = Math.max(...xs);
    const y0 = Math.min(...ys);
    const y1 = Math.max(...ys);
    const w = x1 - x0;
    const h = y1 - y0;
    ctx.fillStyle = linear(ctx, x0, y0, x0 + w * 0.6, y1, [
        [
            0,
            'rgba(255,255,255,0)'
        ],
        [
            0.3,
            `rgba(255,255,255,${0.16 * strength})`
        ],
        [
            0.36,
            'rgba(255,255,255,0.02)'
        ],
        [
            0.5,
            `rgba(255,255,255,${0.1 * strength})`
        ],
        [
            0.53,
            'rgba(255,255,255,0)'
        ],
        [
            1,
            'rgba(255,255,255,0)'
        ]
    ]);
    ctx.fillRect(x0, y0, w, h);
    ctx.restore();
    ctx.beginPath();
    polygon(ctx, quad);
    ctx.strokeStyle = `rgba(120,160,155,${0.55 * strength})`;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * strength})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
}
function alcoveTub(ctx, k) {
    const a = k.L.alcove;
    const zb = k.cam.zBack;
    const zFront = zb - a.depth;
    const tub = {
        x0: a.x0,
        x1: a.x1,
        y0: 0,
        y1: a.rim,
        zNear: zFront,
        zFar: zb
    };
    const white = [
        246,
        245,
        241
    ];
    // Partition (alcove end wall), full height.
    if (a.partition) {
        const p = a.partition;
        box(ctx, k, {
            x0: p.x0,
            x1: p.x1,
            y0: 0,
            y1: C,
            zNear: zFront - 0.02,
            zFar: zb
        }, {
            side: (c, q)=>fillQuad(c, q, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.paintRgb, -26)),
            front: (c, q)=>{
                // The end wall's edge: lit from the window side, a corner bead highlight.
                fillQuad(c, q, linear(c, q[0].x, 0, q[1].x, 0, [
                    [
                        0,
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.paintRgb, -16)
                    ],
                    [
                        0.5,
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.paintRgb, -4)
                    ],
                    [
                        1,
                        (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.paintRgb, 4)
                    ]
                ]));
                c.fillStyle = linear(c, 0, q[3].y, 0, q[0].y, [
                    [
                        0,
                        'rgba(0,0,0,0.12)'
                    ],
                    [
                        0.3,
                        'rgba(0,0,0,0)'
                    ],
                    [
                        1,
                        'rgba(0,0,0,0.06)'
                    ]
                ]);
                c.fill();
                c.fillStyle = 'rgba(255,255,255,0.4)';
                c.fillRect(q[1].x - 1.5, q[2].y, 1.5, q[1].y - q[2].y);
                const bb = pt(k, 0, 0.33, zFront - 0.02).y;
                c.fillStyle = '#f2f0eb';
                c.fillRect(q[0].x, bb, q[1].x - q[0].x, q[0].y - bb);
            }
        });
    }
    box(ctx, k, tub, {
        top: (c, q)=>{
            fillQuad(c, q, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(white, 4));
            // Basin: an inset opening, darker towards the front lip.
            const inset = 0.32;
            const basin = [
                pt(k, a.x0 + inset, a.rim, zFront + inset),
                pt(k, a.x1 - inset, a.rim, zFront + inset),
                pt(k, a.x1 - inset, a.rim, zb - inset),
                pt(k, a.x0 + inset, a.rim, zb - inset)
            ];
            fillQuad(c, basin, linear(c, 0, basin[2].y, 0, basin[0].y, [
                [
                    0,
                    '#e9e7e2'
                ],
                [
                    0.7,
                    '#d7d5cf'
                ],
                [
                    1,
                    '#bfbcb5'
                ]
            ]));
            c.strokeStyle = 'rgba(0,0,0,0.08)';
            c.lineWidth = 1;
            c.stroke();
        },
        front: (c, q)=>{
            fillQuad(c, q, linear(c, 0, q[3].y, 0, q[0].y, [
                [
                    0,
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(white, 6)
                ],
                [
                    0.12,
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(white, -4)
                ],
                [
                    1,
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(white, -26)
                ]
            ]));
            // Apron shading: rounder at the ends.
            c.fillStyle = linear(c, q[0].x, 0, q[1].x, 0, [
                [
                    0,
                    'rgba(0,0,0,0.10)'
                ],
                [
                    0.1,
                    'rgba(0,0,0,0)'
                ],
                [
                    0.9,
                    'rgba(0,0,0,0)'
                ],
                [
                    1,
                    'rgba(0,0,0,0.12)'
                ]
            ]);
            c.fill();
            c.fillStyle = 'rgba(255,255,255,0.7)';
            c.fillRect(q[3].x, q[3].y, q[2].x - q[3].x, 1.5);
        }
    });
    {
        const a0 = pt(k, a.x0, 0, zFront);
        const a1 = pt(k, a.x1, a.rim, zFront);
        floorReflection(ctx, k, a0.x, a1.x, a1.y, a0.y);
        contactLine(ctx, a0.x, a1.x, a0.y, k.cam.f / zFront, 0.45);
    }
    // A shower bench on a tub-shower combo: a tiled seat on the tub deck at the open end.
    if (k.spec.extras.bench) tubSeat(ctx, k);
    // Spout under the valve.
    const sp = pt(k, (a.x0 + a.x1) / 2, a.rim + 0.55, zb - 0.02);
    const s = k.cam.f / zb;
    ctx.fillStyle = linear(ctx, 0, sp.y - 0.06 * s, 0, sp.y + 0.12 * s, [
        [
            0,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, 50)
        ],
        [
            1,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -40)
        ]
    ]);
    ctx.beginPath();
    roundRect(ctx, sp.x - 0.09 * s, sp.y - 0.06 * s, 0.18 * s, 0.16 * s, 0.05 * s);
    ctx.fill();
    if (a.glass) {
        const top = 6.4;
        const x1 = a.x0 + (a.x1 - a.x0) * 0.55;
        glassPane(ctx, k, [
            pt(k, a.x0, a.rim, zFront + 0.2),
            pt(k, x1, a.rim, zFront + 0.2),
            pt(k, x1, top, zFront + 0.2),
            pt(k, a.x0, top, zFront + 0.2)
        ], 1);
    } else {
        curtain(ctx, k, a.x0, a.x1, zFront + 0.12);
    }
}
function tubSeat(ctx, k) {
    const a = k.L.alcove;
    const zb = k.cam.zBack;
    const seat = {
        x0: a.x1 - 1.25,
        x1: a.x1,
        y0: a.rim - 0.05,
        y1: a.rim + 0.5,
        zNear: zb - 1.15,
        zFar: zb
    };
    const tileRgb = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexRgb"])(textureFallback(k.tile));
    box(ctx, k, seat, {
        top: (c, q)=>fillQuad(c, q, (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(tileRgb, 10)),
        front: ()=>frontalTexture(ctx, k, k.tile, seat.x0, seat.x1, seat.y0, seat.y1, seat.zNear)
    });
    const e0 = pt(k, seat.x0, seat.y1, seat.zNear);
    const e1 = pt(k, seat.x1, seat.y1, seat.zNear);
    ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(tileRgb, 35, 0.8);
    ctx.fillRect(e0.x, e0.y - 1, e1.x - e0.x, 2);
    const b0 = pt(k, seat.x0, seat.y0, seat.zNear);
    contactLine(ctx, b0.x, e1.x, b0.y, k.cam.f / seat.zNear, 0.3);
}
function curtain(ctx, k, x0, x1, z) {
    const s = k.cam.f / z;
    const rodY = 7.0;
    const r0 = pt(k, x0, rodY, z);
    const r1 = pt(k, x1, rodY, z);
    ctx.strokeStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, 0);
    ctx.lineWidth = 0.06 * s;
    ctx.beginPath();
    ctx.moveTo(r0.x, r0.y);
    ctx.lineTo(r1.x, r1.y);
    ctx.stroke();
    // Pulled to the left: soft folds of linen down to just below the rim.
    const cw = (x1 - x0) * 0.36;
    const top = pt(k, x0, rodY - 0.05, z);
    const bottom = pt(k, x0, 1.2, z);
    const right = pt(k, x0 + cw, 0, z).x;
    const linen = k.spec.paint === 'soft_white' || !k.spec.paint ? [
        236,
        230,
        218
    ] : [
        246,
        243,
        236
    ];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(right, top.y);
    ctx.bezierCurveTo(right - 0.1 * s, top.y + (bottom.y - top.y) * 0.4, right + 0.25 * s, top.y + (bottom.y - top.y) * 0.75, right + 0.15 * s, bottom.y);
    for(let i = 0; i <= 8; i++){
        const x = right + 0.15 * s - (right + 0.15 * s - top.x) * i / 8;
        ctx.lineTo(x, bottom.y + (i % 2 ? 0.05 * s : 0));
    }
    ctx.closePath();
    const stops = [];
    const folds = 7;
    for(let i = 0; i <= folds * 2; i++)stops.push([
        i / (folds * 2),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(linen, i % 2 ? 4 : -22)
    ]);
    ctx.fillStyle = linear(ctx, top.x, 0, right + 0.2 * s, 0, stops);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = linear(ctx, 0, top.y, 0, bottom.y, [
        [
            0,
            'rgba(255,255,255,0.1)'
        ],
        [
            1,
            'rgba(0,0,0,0.12)'
        ]
    ]);
    ctx.fillRect(top.x - 2, top.y, right - top.x + 0.5 * s, bottom.y - top.y + 0.1 * s);
    ctx.restore();
    // Rings.
    ctx.fillStyle = k.metal;
    for(let i = 0; i < 6; i++){
        const x = top.x + (right - top.x) * i / 5;
        ctx.beginPath();
        ctx.arc(x, r0.y, 0.045 * s, 0, Math.PI * 2);
        ctx.fill();
    }
}
function freestandingTub(ctx, k) {
    const t = k.L.freestanding;
    const zMid = t.zFront + t.depth / 2;
    const rim = pt(k, t.cx, t.height, zMid);
    const rx = t.width / 2 * k.cam.f / zMid;
    const ryTop = Math.abs(pt(k, t.cx, t.height, t.zFront).y - pt(k, t.cx, t.height, t.zFront + t.depth).y) / 2;
    const base = pt(k, t.cx, 0, zMid);
    const bx = rx * 0.78;
    const bry = Math.abs(pt(k, t.cx, 0, t.zFront + 0.2).y - pt(k, t.cx, 0, t.zFront + t.depth - 0.2).y) / 2;
    const sprite = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spriteImage"])('tub_freestanding');
    if (sprite) {
        const e = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITES"].tub_freestanding;
        const s = k.cam.f / t.zFront;
        const b = pt(k, t.cx, 0, t.zFront + 0.3);
        ctx.drawImage(sprite, b.x - e.widthFt * s / 2, b.y - e.heightFt * s, e.widthFt * s, e.heightFt * s);
    } else {
        // Body: from the rim's widest points down to a narrower oval foot.
        ctx.beginPath();
        ctx.moveTo(rim.x - rx, rim.y);
        ctx.bezierCurveTo(rim.x - rx, rim.y + (base.y - rim.y) * 0.55, base.x - bx, base.y - bry * 0.4, base.x - bx * 0.9, base.y + bry * 0.5);
        ctx.ellipse(base.x, base.y + bry * 0.5, bx * 0.9, bry * 0.55, 0, Math.PI, 0, true);
        ctx.bezierCurveTo(base.x + bx, base.y - bry * 0.4, rim.x + rx, rim.y + (base.y - rim.y) * 0.55, rim.x + rx, rim.y);
        ctx.ellipse(rim.x, rim.y, rx, ryTop, 0, 0, Math.PI, false);
        ctx.closePath();
        ctx.fillStyle = linear(ctx, rim.x - rx, 0, rim.x + rx, 0, [
            [
                0,
                '#b9b8b3'
            ],
            [
                0.12,
                '#dedcd7'
            ],
            [
                0.4,
                '#fbfaf8'
            ],
            [
                0.55,
                '#ffffff'
            ],
            [
                0.85,
                '#d7d5cf'
            ],
            [
                1,
                '#a9a7a2'
            ]
        ]);
        ctx.fill();
        ctx.save();
        ctx.clip();
        ctx.fillStyle = linear(ctx, 0, rim.y, 0, base.y + bry, [
            [
                0,
                'rgba(0,0,0,0)'
            ],
            [
                0.7,
                'rgba(0,0,0,0.04)'
            ],
            [
                1,
                'rgba(0,0,0,0.2)'
            ]
        ]);
        ctx.fillRect(rim.x - rx, rim.y, rx * 2, base.y - rim.y + bry * 2);
        ctx.restore();
        // Rim and interior.
        ctx.beginPath();
        ctx.ellipse(rim.x, rim.y, rx, ryTop, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#f7f6f3';
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(rim.x, rim.y + ryTop * 0.05, rx * 0.9, ryTop * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = linear(ctx, 0, rim.y - ryTop, 0, rim.y + ryTop, [
            [
                0,
                '#f2f1ee'
            ],
            [
                0.55,
                '#d9d7d1'
            ],
            [
                1,
                '#bdbbb5'
            ]
        ]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    floorReflection(ctx, k, rim.x - rx, rim.x + rx, rim.y, base.y + bry * 0.9);
    // Where the foot meets the floor.
    ctx.save();
    ctx.translate(base.x, base.y + bry * 0.55);
    ctx.scale(bx * 0.95, Math.max(2, bry * 0.5));
    ctx.fillStyle = radial(ctx, 0, 0, 1, [
        [
            0,
            'rgba(18,12,8,0.42)'
        ],
        [
            0.7,
            'rgba(18,12,8,0.18)'
        ],
        [
            1,
            'rgba(18,12,8,0)'
        ]
    ]);
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
    // Floor-mounted filler beside the tub.
    const fx = t.cx + t.width / 2 + 0.35;
    const fz = zMid + 0.2;
    const f0 = pt(k, fx, 0, fz);
    const f1 = pt(k, fx, 2.9, fz);
    const f2 = pt(k, fx - 0.55, 2.55, fz);
    const s = k.cam.f / fz;
    ctx.strokeStyle = linear(ctx, f0.x - 0.05 * s, 0, f0.x + 0.05 * s, 0, [
        [
            0,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -40)
        ],
        [
            0.5,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, 50)
        ],
        [
            1,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -40)
        ]
    ]);
    ctx.lineWidth = 0.09 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f0.x, f0.y);
    ctx.lineTo(f1.x, f1.y + 0.2 * s);
    ctx.quadraticCurveTo(f1.x, f1.y - 0.05 * s, f2.x, f2.y);
    ctx.stroke();
    ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -20);
    ctx.beginPath();
    ctx.ellipse(f0.x, f0.y, 0.16 * s, 0.05 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // A towel draped over the far end (the generated tub has its own styling).
    if (sprite) return;
    const tx = pt(k, t.cx - t.width / 2 + 0.6, t.height, zMid);
    const ts = k.cam.f / zMid;
    ctx.beginPath();
    ctx.moveTo(tx.x - 0.45 * ts, tx.y - ryTop * 0.6);
    ctx.quadraticCurveTo(tx.x, tx.y - ryTop * 0.9, tx.x + 0.45 * ts, tx.y - ryTop * 0.5);
    ctx.lineTo(tx.x + 0.4 * ts, tx.y + 0.75 * ts);
    ctx.quadraticCurveTo(tx.x, tx.y + 0.82 * ts, tx.x - 0.42 * ts, tx.y + 0.72 * ts);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, tx.x - 0.45 * ts, 0, tx.x + 0.45 * ts, 0, [
        [
            0,
            '#cdbfae'
        ],
        [
            0.3,
            '#e9e0d3'
        ],
        [
            0.6,
            '#d8ccbc'
        ],
        [
            1,
            '#bdae9b'
        ]
    ]);
    ctx.fill();
}
/** How glossy each floor reads (reflection strength). */ const FLOOR_GLOSS = {
    floor_large_stone: 0.2,
    floor_plain: 0.12,
    floor_porcelain_wood: 0.12,
    floor_hex_mosaic: 0.07,
    floor_lvp: 0.06
};
/**
 * A soft mirror image of what was just drawn above a floor line (frame
 * x0..x1, from yTop down to yBase), fading out below it: polished tile
 * catches the vanity and tub the way it does in a listing photo.
 */ function floorReflection(ctx, k, x0, x1, yTop, yBase) {
    if (k.draft) return;
    const gloss = FLOOR_GLOSS[baseTexture(k.floor)] ?? 0.08;
    const t = ctx.getTransform();
    const dx0 = Math.max(0, Math.floor(t.a * x0 + t.e));
    const dx1 = Math.min(ctx.canvas.width, Math.ceil(t.a * x1 + t.e));
    const dBase = Math.round(t.d * yBase + t.f);
    const span = Math.min(yBase - yTop, 70) * t.d;
    const h = Math.min(Math.round(span), dBase, ctx.canvas.height - dBase);
    const w = dx1 - dx0;
    if (w <= 2 || h <= 2) return;
    const tmp = pooled('reflection', w, h);
    const tc = tmp.getContext('2d');
    tc.setTransform(1, 0, 0, -1, 0, h);
    tc.drawImage(ctx.canvas, dx0, dBase - h, w, h, 0, 0, w, h);
    tc.setTransform(1, 0, 0, 1, 0, 0);
    tc.globalCompositeOperation = 'destination-in';
    tc.fillStyle = linear(tc, 0, 0, 0, h, [
        [
            0,
            'rgba(0,0,0,1)'
        ],
        [
            0.6,
            'rgba(0,0,0,0.25)'
        ],
        [
            1,
            'rgba(0,0,0,0)'
        ]
    ]);
    tc.fillRect(0, 0, w, h);
    tc.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = gloss;
    ctx.drawImage(tmp, dx0, dBase);
    ctx.restore();
}
function toilet(ctx, k) {
    const t = k.L.toilet;
    const zb = k.cam.zBack;
    const sprite = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spriteImage"])('toilet');
    if (sprite) {
        const e = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITES"].toilet;
        const z = zb - 1.4;
        const s = k.cam.f / z;
        const b = pt(k, t.cx, 0, z);
        // Contact shadow right under the foot, so it sits on the floor.
        ctx.fillStyle = radial(ctx, 0, 0, 1, [
            [
                0,
                'rgba(20,14,10,0.55)'
            ],
            [
                0.6,
                'rgba(20,14,10,0.25)'
            ],
            [
                1,
                'rgba(20,14,10,0)'
            ]
        ]);
        ctx.save();
        ctx.translate(b.x, b.y - 0.04 * s);
        ctx.scale(0.62 * s, 0.14 * s);
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
        // Its own soft shadow on the wall behind, offset away from the window light.
        ctx.save();
        ctx.shadowColor = 'rgba(40,28,18,0.32)';
        ctx.shadowBlur = 0.3 * s * k.dpx;
        ctx.shadowOffsetX = (k.L.window.wall === 'right' ? -0.1 : 0.06) * s * k.dpx;
        ctx.shadowOffsetY = 0.04 * s * k.dpx;
        ctx.drawImage(sprite, b.x - e.widthFt * s / 2, b.y - e.heightFt * s, e.widthFt * s, e.heightFt * s);
        ctx.restore();
        return;
    }
    const white = (d)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])([
            247,
            246,
            243
        ], d);
    // Tank.
    const zt = zb - 0.55;
    const st = k.cam.f / zt;
    const tank = pt(k, t.cx, 2.55, zt);
    const tankBottom = pt(k, t.cx, 1.45, zt);
    const tw = 1.55 * st;
    // Tank lid (top visible from above).
    const lid = [
        pt(k, t.cx - 0.82, 2.6, zt + 0.02),
        pt(k, t.cx + 0.82, 2.6, zt + 0.02),
        pt(k, t.cx + 0.82, 2.6, zb - 0.02),
        pt(k, t.cx - 0.82, 2.6, zb - 0.02)
    ];
    fillQuad(ctx, lid, white(4));
    ctx.beginPath();
    roundRect(ctx, tank.x - tw / 2, tank.y, tw, tankBottom.y - tank.y, 0.1 * st);
    ctx.fillStyle = linear(ctx, tank.x - tw / 2, 0, tank.x + tw / 2, 0, [
        [
            0,
            white(-28)
        ],
        [
            0.25,
            white(-2)
        ],
        [
            0.6,
            white(4)
        ],
        [
            1,
            white(-34)
        ]
    ]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(tank.x - tw / 2 + 0.05 * st, tank.y, tw - 0.1 * st, 1.5);
    // Flush lever.
    ctx.fillStyle = k.metal;
    ctx.fillRect(tank.x - tw / 2 + 0.15 * st, tank.y + 0.25 * st, 0.28 * st, 0.06 * st);
    // Bowl: closed lid (an oval seen from above) over a tapered body.
    const zc = zb - 1.55;
    const sc = k.cam.f / zc;
    const seat = pt(k, t.cx, 1.38, zc);
    const rx = 0.68 * sc;
    const ry = Math.abs(pt(k, t.cx, 1.38, zb - 0.75).y - pt(k, t.cx, 1.38, zb - 2.35).y) / 2;
    const foot = pt(k, t.cx, 0, zb - 1.25);
    const fs = k.cam.f / (zb - 1.25);
    ctx.beginPath();
    ctx.moveTo(seat.x - rx * 0.95, seat.y);
    ctx.bezierCurveTo(seat.x - rx * 0.9, seat.y + (foot.y - seat.y) * 0.5, foot.x - 0.4 * fs, foot.y - 0.3 * fs, foot.x - 0.42 * fs, foot.y);
    ctx.lineTo(foot.x + 0.42 * fs, foot.y);
    ctx.bezierCurveTo(foot.x + 0.4 * fs, foot.y - 0.3 * fs, seat.x + rx * 0.9, seat.y + (foot.y - seat.y) * 0.5, seat.x + rx * 0.95, seat.y);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, seat.x - rx, 0, seat.x + rx, 0, [
        [
            0,
            white(-40)
        ],
        [
            0.3,
            white(-6)
        ],
        [
            0.55,
            white(6)
        ],
        [
            1,
            white(-44)
        ]
    ]);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(seat.x, seat.y + ry * 0.1, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = white(-30);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(seat.x, seat.y - ry * 0.05, rx * 0.98, ry * 0.95, 0, 0, Math.PI * 2);
    ctx.fillStyle = linear(ctx, 0, seat.y - ry, 0, seat.y + ry, [
        [
            0,
            white(2)
        ],
        [
            0.6,
            white(6)
        ],
        [
            1,
            white(-12)
        ]
    ]);
    ctx.fill();
}
function vanity(ctx, k) {
    const v = k.L.vanity;
    const zb = k.cam.zBack;
    const zFront = zb - v.depth;
    const P = k.P;
    const bodyTop = v.top - 0.12;
    const cab = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hexRgb"])(textureFallback(k.cabinet));
    const sprite = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spriteImage"])(v.kind === 'double' ? 'vanity_double' : v.kind === 'floating' ? 'vanity_floating' : 'vanity_single');
    void sprite; // Vanity sprites are not used: the cabinet is built in 3D to take any finish and width.
    // Cabinet.
    box(ctx, k, {
        x0: v.x0,
        x1: v.x1,
        y0: v.bottom,
        y1: bodyTop,
        zNear: zFront,
        zFar: zb
    }, {
        side: (c, q, which)=>{
            vPlane(c, k.cam, darken(surface('vanity-side', k.cabinet, v.depth, bodyTop - v.bottom, P), 0.22), P, which === 'left' ? v.x0 : v.x1, zb, zFront, v.bottom, bodyTop, k.step);
            void q;
        },
        front: ()=>{
            frontalTexture(ctx, k, k.cabinet, v.x0, v.x1, v.bottom, bodyTop, zFront);
            cabinetFronts(ctx, k, zFront, bodyTop, cab);
        }
    });
    // Counter slab: perspective top with the sinks cut in, then its front edge.
    const ox = 0.06;
    const cx0 = v.x0 - ox;
    const cx1 = v.x1 + ox;
    const cz = zFront - ox;
    const cdepth = zb - cz;
    const top = surface('counter', k.counter, cx1 - cx0, cdepth, P, false);
    const tctx = top.getContext('2d');
    for (const sx of v.sinks)sinkCut(tctx, k, (sx - cx0) * P, cdepth * 0.55 * P, P);
    // Wall shadow line + front highlight.
    tctx.fillStyle = linear(tctx, 0, 0, 0, 0.25 * P, [
        [
            0,
            'rgba(0,0,0,0.2)'
        ],
        [
            1,
            'rgba(0,0,0,0)'
        ]
    ]);
    tctx.fillRect(0, 0, top.width, 0.25 * P);
    tctx.fillStyle = linear(tctx, 0, top.height - 0.12 * P, 0, top.height, [
        [
            0,
            'rgba(255,255,255,0)'
        ],
        [
            1,
            'rgba(255,255,255,0.35)'
        ]
    ]);
    tctx.fillRect(0, top.height - 0.12 * P, top.width, 0.12 * P);
    hPlane(ctx, k.cam, top, P, cx0, cx1, zb, cz, v.top, k.step);
    frontalTexture(ctx, k, k.counter, cx0, cx1, v.top - 0.12, v.top, cz);
    const e0 = pt(k, cx0, v.top, cz);
    const e1 = pt(k, cx1, v.top - 0.12, cz);
    ctx.fillStyle = linear(ctx, 0, e0.y, 0, e1.y, [
        [
            0,
            'rgba(255,255,255,0.45)'
        ],
        [
            0.25,
            'rgba(255,255,255,0)'
        ],
        [
            1,
            'rgba(0,0,0,0.2)'
        ]
    ]);
    ctx.fillRect(e0.x, e0.y, e1.x - e0.x, e1.y - e0.y);
    // Shadow of the slab on the cabinet face.
    ctx.fillStyle = linear(ctx, 0, e1.y, 0, e1.y + 0.18 * (k.cam.f / zFront), [
        [
            0,
            'rgba(0,0,0,0.28)'
        ],
        [
            1,
            'rgba(0,0,0,0)'
        ]
    ]);
    ctx.fillRect(e0.x + 1, e1.y, e1.x - e0.x - 2, 0.18 * (k.cam.f / zFront));
    if (v.bottom === 0) {
        const fl = pt(k, v.x0, 0, zFront);
        const fr = pt(k, v.x1, v.top, zFront);
        floorReflection(ctx, k, fl.x, fr.x, fr.y, fl.y);
        contactLine(ctx, fl.x, fr.x, fl.y, k.cam.f / zFront, 0.35);
    }
    // Faucets, soap, a folded towel.
    for (const sx of v.sinks)faucet(ctx, k, sx, v.top, zb - 0.28);
    const sDecor = k.cam.f / (zb - 0.45);
    const soapX = v.sinks.length > 1 ? (v.sinks[0] + v.sinks[1]) / 2 : v.sinks[0] + Math.min(0.9, (v.x1 - v.x0) * 0.33);
    const soap = pt(k, soapX, v.top, zb - 0.45);
    ctx.beginPath();
    roundRect(ctx, soap.x - 0.1 * sDecor, soap.y - 0.55 * sDecor, 0.2 * sDecor, 0.55 * sDecor, 0.05 * sDecor);
    ctx.fillStyle = linear(ctx, soap.x - 0.1 * sDecor, 0, soap.x + 0.1 * sDecor, 0, [
        [
            0,
            '#7b5a3a'
        ],
        [
            0.4,
            '#c49a6c'
        ],
        [
            1,
            '#6a4a2e'
        ]
    ]);
    ctx.fill();
    ctx.fillStyle = k.metal;
    ctx.fillRect(soap.x - 0.04 * sDecor, soap.y - 0.68 * sDecor, 0.08 * sDecor, 0.13 * sDecor);
    ctx.fillRect(soap.x - 0.02 * sDecor, soap.y - 0.68 * sDecor, 0.14 * sDecor, 0.04 * sDecor);
    if (v.sinks.length === 1 && v.x1 - v.sinks[0] > 1.0) {
        const tx = v.sinks[0] - Math.min(0.95, (v.x1 - v.x0) * 0.34);
        const tw = 0.7;
        for(let i = 0; i < 2; i++){
            const y0 = v.top + i * 0.17;
            const q = [
                pt(k, tx - tw / 2, y0 + 0.17, zb - 0.95),
                pt(k, tx + tw / 2, y0 + 0.17, zb - 0.95),
                pt(k, tx + tw / 2, y0 + 0.17, zb - 0.25),
                pt(k, tx - tw / 2, y0 + 0.17, zb - 0.25)
            ];
            const f = [
                pt(k, tx - tw / 2, y0, zb - 0.95),
                pt(k, tx + tw / 2, y0, zb - 0.95),
                pt(k, tx + tw / 2, y0 + 0.17, zb - 0.95),
                pt(k, tx - tw / 2, y0 + 0.17, zb - 0.95)
            ];
            fillQuad(ctx, f, i ? '#ddd3c5' : '#cfc3b2');
            fillQuad(ctx, q, i ? '#efe9df' : '#e6ddd0');
        }
    }
}
/** Doors, drawers, toe kick and pulls on the cabinet front. */ function cabinetFronts(ctx, k, z, bodyTop, cab) {
    const v = k.L.vanity;
    const s = k.cam.f / z;
    const metal = k.metalRgb;
    const R = (x0, y0, x1, y1)=>{
        const a = pt(k, x0, y1, z);
        const b = pt(k, x1, y0, z);
        return {
            x: a.x,
            y: a.y,
            w: b.x - a.x,
            h: b.y - a.y
        };
    };
    const dark = cab[0] + cab[1] + cab[2] < 300;
    const reveal = (r)=>{
        ctx.strokeStyle = dark ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.28)';
        ctx.lineWidth = Math.max(1, 0.02 * s);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r.x + 1, r.y + r.h - 1);
        ctx.lineTo(r.x + 1, r.y + 1);
        ctx.lineTo(r.x + r.w - 1, r.y + 1);
        ctx.stroke();
    };
    const shaker = (x0, y0, x1, y1)=>{
        const r = R(x0 + 0.02, y0 + 0.02, x1 - 0.02, y1 - 0.02);
        reveal(r);
        if (v.kind === 'floating') return r;
        const rail = 0.2 * s;
        const inner = {
            x: r.x + rail,
            y: r.y + rail,
            w: r.w - rail * 2,
            h: r.h - rail * 2
        };
        if (inner.w > 4 && inner.h > 4) {
            ctx.fillStyle = 'rgba(0,0,0,0.05)';
            ctx.fillRect(inner.x, inner.y, inner.w, inner.h);
            ctx.fillStyle = dark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.2)';
            ctx.fillRect(inner.x, inner.y, inner.w, Math.max(1, 0.03 * s));
            ctx.fillRect(inner.x, inner.y, Math.max(1, 0.025 * s), inner.h);
            ctx.fillStyle = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.6)';
            ctx.fillRect(inner.x, inner.y + inner.h - Math.max(1, 0.02 * s), inner.w, Math.max(1, 0.02 * s));
            ctx.fillRect(inner.x + inner.w - Math.max(1, 0.02 * s), inner.y, Math.max(1, 0.02 * s), inner.h);
        }
        return r;
    };
    const pull = (cx, cy, vertical, len = 0.45)=>{
        const p = pt(k, cx, cy, z - 0.04);
        const l = len * s;
        const t = Math.max(2, 0.045 * s);
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 0.04 * s * k.dpx;
        ctx.shadowOffsetY = 0.02 * s * k.dpx;
        ctx.fillStyle = vertical ? linear(ctx, p.x - t / 2, 0, p.x + t / 2, 0, [
            [
                0,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(metal, -40)
            ],
            [
                0.5,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(metal, 55)
            ],
            [
                1,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(metal, -40)
            ]
        ]) : linear(ctx, 0, p.y - t / 2, 0, p.y + t / 2, [
            [
                0,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(metal, 55)
            ],
            [
                1,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(metal, -45)
            ]
        ]);
        ctx.beginPath();
        if (vertical) roundRect(ctx, p.x - t / 2, p.y - l / 2, t, l, t / 2);
        else roundRect(ctx, p.x - l / 2, p.y - t / 2, l, t, t / 2);
        ctx.fill();
        ctx.restore();
    };
    const y0 = v.bottom + (v.bottom === 0 ? 0.33 : 0);
    if (v.bottom === 0) {
        // Toe kick: a recess in the cabinet's own colour, in shadow under the doors, lighter where floor light bounces in.
        const tk = R(v.x0 + 0.05, 0, v.x1 - 0.05, 0.33);
        ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(cab, -70);
        ctx.fillRect(tk.x, tk.y, tk.w, tk.h);
        ctx.fillStyle = linear(ctx, 0, tk.y, 0, tk.y + tk.h, [
            [
                0,
                'rgba(8,6,4,0.7)'
            ],
            [
                0.55,
                'rgba(8,6,4,0.35)'
            ],
            [
                1,
                'rgba(255,245,230,0.08)'
            ]
        ]);
        ctx.fillRect(tk.x, tk.y, tk.w, tk.h);
    }
    if (v.kind === 'floating') {
        const mid = (y0 + bodyTop) / 2;
        const cols = v.x1 - v.x0 > 4.2 ? 2 : 1;
        for(let c = 0; c < cols; c++){
            const xa = v.x0 + (v.x1 - v.x0) * c / cols;
            const xb = v.x0 + (v.x1 - v.x0) * (c + 1) / cols;
            shaker(xa, mid, xb, bodyTop);
            shaker(xa, y0, xb, mid);
            pull((xa + xb) / 2, bodyTop - 0.18, false, Math.min(1.2, (xb - xa) * 0.4));
            pull((xa + xb) / 2, mid - 0.18, false, Math.min(1.2, (xb - xa) * 0.4));
        }
        return;
    }
    const drawerH = 0.55;
    const doors = (xa, xb)=>{
        shaker(xa, bodyTop - drawerH, xb, bodyTop);
        const mid = (xa + xb) / 2;
        shaker(xa, y0, mid, bodyTop - drawerH);
        shaker(mid, y0, xb, bodyTop - drawerH);
        pull(mid - 0.2, bodyTop - drawerH - 0.45, true);
        pull(mid + 0.2, bodyTop - drawerH - 0.45, true);
    };
    if (v.kind === 'double') {
        const w = v.x1 - v.x0;
        const a = v.x0 + w * 0.36;
        const b = v.x1 - w * 0.36;
        doors(v.x0, a);
        doors(b, v.x1);
        const rows = 3;
        for(let r = 0; r < rows; r++){
            const ya = y0 + (bodyTop - y0) * r / rows;
            const yb = y0 + (bodyTop - y0) * (r + 1) / rows;
            shaker(a, ya, b, yb);
            pull((a + b) / 2, (ya + yb) / 2 + 0.05, false, 0.5);
        }
    } else {
        doors(v.x0, v.x1);
    }
}
function sinkCut(ctx, k, cx, cy, P) {
    const rx = 0.68 * P;
    const ry = 0.5 * P;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fbfbf9';
    ctx.fill();
    ctx.clip();
    // Bowl shading: the far inner wall catches light, the near lip throws shadow.
    ctx.fillStyle = radial(ctx, cx, cy + ry * 0.35, rx * 1.1, [
        [
            0,
            '#f4f4f1'
        ],
        [
            0.6,
            '#e0dfdb'
        ],
        [
            1,
            '#a9a8a3'
        ]
    ]);
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    ctx.fillStyle = linear(ctx, 0, cy - ry, 0, cy + ry, [
        [
            0,
            'rgba(0,0,0,0)'
        ],
        [
            0.7,
            'rgba(0,0,0,0.02)'
        ],
        [
            1,
            'rgba(0,0,0,0.3)'
        ]
    ]);
    ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
    ctx.restore();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 0.025 * P;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.15, 0.07 * P, 0.05 * P, 0, 0, Math.PI * 2);
    ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(k.metalRgb, -30);
    ctx.fill();
}
function faucet(ctx, k, x, y, z) {
    const id = `faucet_${k.spec.metal && __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_METAL_COLORS"][k.spec.metal] ? k.spec.metal : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_DEFAULT_METAL"]}`;
    const sprite = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spriteImage"])(id);
    const s = k.cam.f / z;
    if (sprite) {
        const e = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITES"][id];
        const b = pt(k, x, y, z);
        ctx.drawImage(sprite, b.x - e.widthFt * s / 2, b.y - e.heightFt * s, e.widthFt * s, e.heightFt * s);
        return;
    }
    const m = k.metalRgb;
    const base = pt(k, x, y, z);
    const topP = pt(k, x, y + 0.95, z);
    const tip = pt(k, x, y + 0.72, z - 0.55);
    const metalGrad = linear(ctx, base.x - 0.06 * s, 0, base.x + 0.06 * s, 0, [
        [
            0,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, -45)
        ],
        [
            0.45,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, 60)
        ],
        [
            1,
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, -45)
        ]
    ]);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 0.05 * s * k.dpx;
    ctx.shadowOffsetX = 0.03 * s * k.dpx;
    ctx.strokeStyle = metalGrad;
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.1 * s;
    ctx.beginPath();
    ctx.moveTo(base.x, base.y);
    ctx.lineTo(topP.x, topP.y + 0.1 * s);
    ctx.quadraticCurveTo(topP.x, topP.y - 0.06 * s, tip.x, tip.y);
    ctx.stroke();
    ctx.restore();
    // Spout end and escutcheon.
    ctx.fillStyle = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(m, -50);
    ctx.beginPath();
    ctx.ellipse(tip.x, tip.y + 0.02 * s, 0.05 * s, 0.025 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = metalGrad;
    ctx.beginPath();
    ctx.ellipse(base.x, base.y, 0.11 * s, 0.035 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // Two lever handles (widespread).
    for (const dx of [
        -0.42,
        0.42
    ]){
        const h = pt(k, x + dx, y, z);
        ctx.fillStyle = metalGrad;
        ctx.beginPath();
        roundRect(ctx, h.x - 0.04 * s, h.y - 0.22 * s, 0.08 * s, 0.22 * s, 0.03 * s);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(h.x, h.y, 0.08 * s, 0.025 * s, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}
function plant(ctx, k) {
    const p = k.L.plant;
    const s = k.cam.f / p.z;
    const base = pt(k, p.x, 0, p.z);
    const sprite = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["spriteImage"])('plant');
    if (sprite) {
        const e = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SPRITES"].plant;
        ctx.drawImage(sprite, base.x - e.widthFt * s / 2, base.y - e.heightFt * s, e.widthFt * s, e.heightFt * s);
        return;
    }
    const potW = 0.85 * s;
    const potH = 0.85 * s;
    // Snake plant: tall sword leaves.
    const rand = (()=>{
        let a = 41;
        return ()=>(a = a * 16807 % 2147483647) / 2147483647;
    })();
    for(let i = 0; i < 13; i++){
        const t = i / 12;
        const lx = base.x - potW * 0.32 + potW * 0.64 * t + (rand() - 0.5) * 6;
        const h = (1.5 + rand() * 1.3) * s;
        const lean = (t - 0.5) * 0.6 * s + (rand() - 0.5) * 0.25 * s;
        const w = (0.12 + rand() * 0.06) * s;
        const g = rand();
        const col = [
            44 + g * 30,
            86 + g * 40,
            52 + g * 20
        ];
        ctx.beginPath();
        ctx.moveTo(lx - w / 2, base.y - potH + 2);
        ctx.quadraticCurveTo(lx - w / 2 + lean * 0.3, base.y - potH - h * 0.6, lx + lean, base.y - potH - h);
        ctx.quadraticCurveTo(lx + w / 2 + lean * 0.3, base.y - potH - h * 0.6, lx + w / 2, base.y - potH + 2);
        ctx.closePath();
        ctx.fillStyle = linear(ctx, lx - w / 2, 0, lx + w / 2, 0, [
            [
                0,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(col, -25)
            ],
            [
                0.5,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(col, 15)
            ],
            [
                1,
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["shade"])(col, -35)
            ]
        ]);
        ctx.fill();
        ctx.strokeStyle = 'rgba(210,200,120,0.5)';
        ctx.lineWidth = 0.8;
        ctx.stroke();
    }
    // Pot: matte ceramic.
    ctx.beginPath();
    ctx.moveTo(base.x - potW / 2, base.y - potH);
    ctx.lineTo(base.x + potW / 2, base.y - potH);
    ctx.lineTo(base.x + potW * 0.4, base.y);
    ctx.lineTo(base.x - potW * 0.4, base.y);
    ctx.closePath();
    ctx.fillStyle = linear(ctx, base.x - potW / 2, 0, base.x + potW / 2, 0, [
        [
            0,
            '#8f8a82'
        ],
        [
            0.35,
            '#d9d4cb'
        ],
        [
            0.6,
            '#cbc5bb'
        ],
        [
            1,
            '#77726b'
        ]
    ]);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(base.x, base.y - potH, potW / 2, 0.08 * s, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5b4a3a';
    ctx.fill();
}
// ---------------------------------------------------------------------------
// Light and grade
// ---------------------------------------------------------------------------
let lightCanvas = null;
function drawLight(ctx, k) {
    const { cam, L } = k;
    const t = ctx.getTransform();
    const cw = ctx.canvas.width;
    const ch = ctx.canvas.height;
    // Light is smooth: a quarter-resolution map, upscaled, costs a fraction of a full-frame pass.
    const LQ = 4;
    const lw = Math.ceil(cw / LQ);
    const lh = Math.ceil(ch / LQ);
    if (!lightCanvas || lightCanvas.width !== lw || lightCanvas.height !== lh) lightCanvas = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["makeCanvas"])(lw, lh);
    const lc = lightCanvas.getContext('2d');
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, lw, lh);
    lc.setTransform(t.a / LQ, t.b / LQ, t.c / LQ, t.d / LQ, t.e / LQ, t.f / LQ);
    const zb = cam.zBack;
    const win = L.window.wall === 'right' ? pt(k, cam.roomW, (L.window.y0 + L.window.y1) / 2, (L.window.z0 + L.window.z1) / 2) : pt(k, (L.window.rect.x0 + L.window.rect.x1) / 2, (L.window.rect.y0 + L.window.rect.y1) / 2, zb);
    if (!k.dark) {
        // Daylight: bright by the window, falling off into the far corners.
        lc.fillStyle = '#ffffff';
        lc.fillRect(-50, -50, FW + 100, FH + 100);
        lc.fillStyle = radial(lc, win.x, win.y, 1150, [
            [
                0,
                'rgba(255,255,255,0)'
            ],
            [
                0.5,
                'rgba(236,230,222,0.6)'
            ],
            [
                1,
                'rgba(196,188,178,1)'
            ]
        ]);
        lc.fillRect(-50, -50, FW + 100, FH + 100);
    // Under the counter overhang and inside the toe kick it is darker.
    } else {
        lc.fillStyle = '#4c4a5c';
        lc.fillRect(-50, -50, FW + 100, FH + 100);
        lc.globalCompositeOperation = 'lighter';
        const glow = (x, y, rx, ry, colour, a)=>{
            lc.save();
            lc.translate(x, y);
            lc.scale(rx, ry);
            lc.fillStyle = radial(lc, 0, 0, 1, [
                [
                    0,
                    colour.replace('A', String(a))
                ],
                [
                    0.45,
                    colour.replace('A', String(a * 0.45))
                ],
                [
                    1,
                    colour.replace('A', '0')
                ]
            ]);
            lc.fillRect(-1, -1, 2, 2);
            lc.restore();
        };
        const warm = 'rgba(255,196,128,A)';
        const s = cam.f / zb;
        // General warm fill from the vanity lights.
        const v = L.vanity;
        const vc = pt(k, (v.x0 + v.x1) / 2, v.top + 1.8, zb - 0.3);
        glow(vc.x, vc.y, (v.x1 - v.x0 + 5) * s, 5.5 * s, warm, 0.5);
        for (const sc of L.sconces){
            const p = pt(k, sc.x, sc.y, zb);
            glow(p.x, p.y, 1.3 * s, 2.6 * s, 'rgba(255,214,160,A)', 0.85);
        }
        if (k.spec.extras.ledMirror) {
            for (const m of L.mirrors){
                const p = pt(k, (m.x0 + m.x1) / 2, (m.y0 + m.y1) / 2, zb);
                glow(p.x, p.y, (m.x1 - m.x0) * 0.95 * s, (m.y1 - m.y0) * 0.85 * s, 'rgba(255,226,184,A)', 0.7);
            }
        }
        // Can lights: pools on the floor and a scallop down the back wall.
        for (const can of L.cans){
            const f = pt(k, can.x, 0, can.z);
            const rx = 2.2 * cam.f / can.z;
            const ry = Math.abs(pt(k, can.x, 0, can.z - 1.6).y - pt(k, can.x, 0, Math.min(zb - 0.1, can.z + 1.6)).y) / 2;
            glow(f.x, f.y, rx, Math.max(ry, 8), 'rgba(255,200,140,A)', 0.45);
            const w = pt(k, can.x, 5.5, zb);
            glow(w.x, w.y, 1.2 * s, 3.2 * s, 'rgba(255,205,150,A)', 0.4);
        }
        if (L.niche) {
            const n = L.niche;
            const p = pt(k, (n.x0 + n.x1) / 2, (n.y0 + n.y1) / 2, zb);
            glow(p.x, p.y, (n.x1 - n.x0 + 1.2) * s, (n.y1 - n.y0 + 1.6) * s, 'rgba(255,214,160,A)', 0.75);
        }
        if (v.bottom > 0) {
            const p = pt(k, (v.x0 + v.x1) / 2, 0, zb - v.depth * 0.5);
            glow(p.x, p.y, (v.x1 - v.x0) * 0.65 * s, 0.9 * s, 'rgba(255,200,140,A)', 0.8);
        }
        // Heated floor: a low, even warmth across the tile.
        if (k.spec.extras.heatedFloor) {
            const p = pt(k, cam.roomW / 2, 0, zb - cam.roomD * 0.45);
            glow(p.x, p.y, cam.roomW * 0.7 * s, Math.max(40, (FH - p.y) * 0.9), 'rgba(255,168,112,A)', 0.3);
        }
        lc.globalCompositeOperation = 'source-over';
    }
    // Grade folded into the same map: a warm cast and a soft vignette (frame space, unzoomed).
    const sc = cw / FW / LQ;
    lc.setTransform(sc, 0, 0, sc, 0, 0);
    lc.globalCompositeOperation = 'multiply';
    lc.fillStyle = k.dark ? '#fff0dc' : '#fff8ef';
    lc.fillRect(0, 0, FW, FH);
    lc.fillStyle = radial(lc, FW / 2, FH * 0.46, FW * 0.75, [
        [
            0,
            '#ffffff'
        ],
        [
            0.55,
            '#faf7f2'
        ],
        [
            1,
            k.dark ? '#7a706e' : '#c8c0b8'
        ]
    ]);
    lc.fillRect(0, 0, FW, FH);
    lc.globalCompositeOperation = 'source-over';
    // Multiply the frame by the light map.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(lightCanvas, 0, 0, cw, ch);
    ctx.restore();
    // Emissive glows on top.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const s = cam.f / zb;
    const bloom = (x, y, r, colour)=>{
        ctx.fillStyle = radial(ctx, x, y, r, [
            [
                0,
                colour
            ],
            [
                1,
                'rgba(0,0,0,0)'
            ]
        ]);
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    if (!k.dark) {
        bloom(win.x, win.y, 3.2 * s, 'rgba(255,252,240,0.35)');
    } else {
        for (const sc of L.sconces){
            const p = pt(k, sc.x, sc.y, zb);
            bloom(p.x, p.y, 0.9 * s, 'rgba(255,220,170,0.7)');
        }
        if (k.spec.extras.ledMirror) {
            for (const m of L.mirrors){
                const a = pt(k, m.x0, m.y1, zb);
                const b = pt(k, m.x1, m.y0, zb);
                ctx.save();
                ctx.shadowColor = 'rgba(255,220,170,0.9)';
                ctx.shadowBlur = 0.6 * s * k.dpx;
                ctx.strokeStyle = 'rgba(255,236,205,0.55)';
                ctx.lineWidth = 0.08 * s;
                ctx.beginPath();
                roundRect(ctx, a.x + 0.16 * s, a.y + 0.16 * s, b.x - a.x - 0.32 * s, b.y - a.y - 0.32 * s, 0.1 * s);
                ctx.stroke();
                ctx.restore();
            }
        }
        if (L.niche) {
            const n = L.niche;
            const a = pt(k, n.x0, n.y1, zb);
            const b = pt(k, n.x1, n.y1, zb);
            ctx.fillStyle = linear(ctx, 0, a.y, 0, a.y + 0.35 * s, [
                [
                    0,
                    'rgba(255,220,170,0.75)'
                ],
                [
                    1,
                    'rgba(255,220,170,0)'
                ]
            ]);
            ctx.fillRect(a.x, a.y, b.x - a.x, 0.35 * s);
        }
        for (const can of L.cans){
            const p = pt(k, can.x, C, can.z);
            bloom(p.x, p.y, 0.9 * cam.f / can.z, 'rgba(255,236,200,0.7)');
        }
        if (L.window.wall === 'right' || L.window.wall === 'back') bloom(win.x, win.y, 1.6 * s, 'rgba(70,90,140,0.25)');
    }
    ctx.restore();
}
function grade(ctx, k) {
    // Film grain (the warm cast and vignette are in the light map).
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = k.dark ? 0.22 : 0.16;
    const pat = ctx.createPattern((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$procedural$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["grain"])(), 'repeat');
    if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(0, 0, FW, FH);
    }
    ctx.restore();
}
}),
"[project]/components/estimator/scene/bath/bath-scene.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BATH_FADE_MS",
    ()=>BATH_FADE_MS,
    "BathScene",
    ()=>BathScene,
    "bathCanvasScale",
    ()=>bathCanvasScale
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$rasterize$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/rasterize.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/textures.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/bath/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/bath/assets.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$paint$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/bath/paint.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
const BATH_FADE_MS = 250;
/** Device pixels per frame unit are capped here (2x is sharp on every phone). */ const MAX_SCALE = 2;
/** Two sharp paints in a row slower than this (no GPU canvas) drop the next ones to 1x. */ const SLOW_PAINT_MS = 90;
/** A pick paints a fast draft at once; the sharp frame follows once picks pause this long. */ const SETTLE_MS = 180;
const CSS = `
:where(.bs-root){position:relative;display:block;overflow:hidden}
:where(.bs-root.bs-sized){width:100%;aspect-ratio:3/2}
.bs-root>canvas{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
.bs-root>.bs-prev{opacity:0;pointer-events:none}
.bs-root>.bs-prev.bs-fading{transition:opacity ${BATH_FADE_MS}ms ease-out}
@media (prefers-reduced-motion:reduce){.bs-root>.bs-prev{display:none}}
`;
function reducedMotion() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch  {
        return false;
    }
}
function bathCanvasScale(cssWidth, dpr, cap = MAX_SCALE) {
    const w = Number.isFinite(cssWidth) && cssWidth > 0 ? cssWidth : __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SCENE"].width;
    const raw = w * (Number.isFinite(dpr) && dpr > 0 ? dpr : 1) / __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SCENE"].width;
    // Quarter steps, so a resize by a few px does not repaint at a new size.
    return Math.min(cap, Math.max(0.5, Math.ceil(raw * 4) / 4));
}
/** Mounted scenes: the shared texture caches and scratch canvases are released when the last one goes. */ let mountedScenes = 0;
function BathScene({ scene, mood = 'day', label, className, onCanvas, focus = 'overview', target, still = false, decorative = false }) {
    const rootRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const canvasRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const prevRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [scale, setScale] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(1);
    const [cap, setCap] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(MAX_SCALE);
    const latest = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])({
        scene,
        mood,
        focus,
        target,
        scale
    });
    latest.current = {
        scene,
        mood,
        focus,
        target,
        scale
    };
    const painted = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    /** Files the last paint used (a file arriving repaints only when it is one of these). */ const used = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(new Set());
    const settleTimer = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const assetFrame = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const slowPaints = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(0);
    /** Paint the latest props onto the visible canvas. Never throws (the wall colour stays). */ const paint = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])((draft)=>{
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return 0;
        const now = latest.current;
        const t0 = performance.now();
        try {
            used.current = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["recordBathAssets"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$paint$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["paintBathScene"])(ctx, now.scene, {
                    scale: now.scale,
                    mood: now.mood,
                    focus: now.focus,
                    target: now.target,
                    draft
                }));
        } catch  {
        // A drawing failure must never break the flow.
        }
        return performance.now() - t0;
    }, []);
    /** A sharp paint; two slow ones in a row (once files have settled) drop the picture to 1x. */ const sharp = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>{
        const ms = paint(false);
        if ((0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["bathAssetsLoading"])()) return;
        slowPaints.current = ms > SLOW_PAINT_MS ? slowPaints.current + 1 : 0;
        if (slowPaints.current >= 2 && latest.current.scale > 1) setCap(1);
    }, [
        paint
    ]);
    // Size the backing store to the element (and the screen), and follow resizes.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useLayoutEffect"])(()=>{
        const el = rootRef.current;
        if (!el) return;
        const update = ()=>setScale(bathCanvasScale(el.clientWidth, window.devicePixelRatio || 1, cap));
        update();
        if (typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return ()=>ro.disconnect();
    }, [
        cap
    ]);
    // Files: the rest preload when idle; one arriving that this picture uses repaints it (once per frame).
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        mountedScenes++;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["preloadBathAssetsWhenIdle"])();
        const off = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["onBathAssetLoad"])((url)=>{
            if (!used.current.has(url) || assetFrame.current !== null) return;
            assetFrame.current = requestAnimationFrame(()=>{
                assetFrame.current = null;
                // A pending settle paints sharp anyway.
                if (!settleTimer.current) paint(false);
            });
        });
        const prev = prevRef.current;
        // The old frame's copy is only needed while it fades: give its memory back afterwards.
        const shrink = ()=>{
            if (prev && prev.style.opacity === '0') prev.width = prev.height = 1;
        };
        prev?.addEventListener('transitionend', shrink);
        return ()=>{
            off();
            prev?.removeEventListener('transitionend', shrink);
            if (assetFrame.current !== null) cancelAnimationFrame(assetFrame.current);
            if (settleTimer.current) clearTimeout(settleTimer.current);
            settleTimer.current = null;
            if (--mountedScenes === 0) (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$paint$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["releaseBathCanvases"])();
        };
    }, [
        paint
    ]);
    const key = `${JSON.stringify(scene)}|${mood}|${focus}|${target ?? ''}`;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useLayoutEffect"])(()=>{
        const canvas = canvasRef.current;
        if (!canvas) return;
        const w = Math.round(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SCENE"].width * scale);
        const h = Math.round(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SCENE"].height * scale);
        const changed = painted.current !== null && painted.current !== key;
        const animate = changed && !still && !reducedMotion();
        // Keep the old frame on top and fade it out over the new one.
        const prev = prevRef.current;
        if (animate && prev && canvas.width > 1) {
            prev.width = canvas.width;
            prev.height = canvas.height;
            prev.getContext('2d')?.drawImage(canvas, 0, 0);
            prev.classList.remove('bs-fading');
            prev.style.opacity = '1';
            // Commit the opaque state, then let the transition run to transparent.
            void prev.offsetWidth;
            prev.classList.add('bs-fading');
            prev.style.opacity = '0';
        }
        const resized = canvas.width !== w || canvas.height !== h;
        if (resized) {
            canvas.width = w;
            canvas.height = h;
        }
        painted.current = key;
        if (settleTimer.current) clearTimeout(settleTimer.current);
        settleTimer.current = null;
        if (changed && !still) {
            // Instant response: a draft now, the sharp frame when the picks pause.
            paint(true);
            settleTimer.current = setTimeout(()=>{
                settleTimer.current = null;
                sharp();
            }, SETTLE_MS);
        } else {
            sharp();
        }
    // `key` stands for scene / mood / focus (a new but equal spec object does not repaint).
    }, [
        key,
        scale,
        still,
        paint,
        sharp
    ]);
    // Hand the canvas out, and register a painter so exports are sharp and settled.
    const painter = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(async (width, height)=>{
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$assets$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["preloadBathAssets"])();
        const out = document.createElement('canvas');
        out.width = width;
        out.height = height;
        const ctx = out.getContext('2d');
        if (!ctx) throw new Error('This browser cannot draw the design.');
        const { scene: s, mood: m } = latest.current;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$paint$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["paintBathScene"])(ctx, s, {
            scale: width / __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_SCENE"].width,
            mood: m,
            focus: 'overview'
        });
        return out;
    }, []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const canvas = canvasRef.current;
        if (!canvas) return;
        const off = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$rasterize$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["registerBathPainter"])(canvas, painter);
        onCanvas?.(canvas);
        return ()=>{
            off();
            onCanvas?.(null);
        };
    }, [
        onCanvas,
        painter
    ]);
    const wall = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$bath$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BATH_TEXTURES"][(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$bath$2f$paint$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["materialTexture"])('paint', scene.paint)].fallback;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        ref: rootRef,
        className: [
            'bs-root',
            className ? '' : 'bs-sized',
            className ?? ''
        ].filter(Boolean).join(' '),
        role: decorative ? undefined : 'img',
        "aria-label": decorative ? undefined : label,
        "aria-hidden": decorative ? true : undefined,
        "data-bath-scene": "",
        "data-mood": mood,
        style: {
            backgroundColor: wall
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: CSS
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/bath/bath-scene.tsx",
                lineNumber: 231,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
                ref: canvasRef,
                width: 1,
                height: 1,
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/bath/bath-scene.tsx",
                lineNumber: 232,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("canvas", {
                ref: prevRef,
                className: "bs-prev",
                width: 1,
                height: 1,
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/bath/bath-scene.tsx",
                lineNumber: 233,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/bath/bath-scene.tsx",
        lineNumber: 221,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/scene/materials.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "copingTexture",
    ()=>copingTexture,
    "deckTexture",
    ()=>deckTexture,
    "materialKeys",
    ()=>materialKeys,
    "optionMaterial",
    ()=>optionMaterial,
    "tileTexture",
    ()=>tileTexture,
    "waterLook",
    ()=>waterLook
]);
const WATER = {
    // Bright white plaster under clear water: the classic bright turquoise (drive/031).
    plaster: {
        floor: 'floor_plaster',
        tint: '#5fd0e0',
        deep: '#1fa3c4',
        tintOpacity: 0.68
    },
    // Quartz: a clear azure blue.
    quartz: {
        floor: 'floor_quartz',
        tint: '#3aa6d0',
        deep: '#16729f',
        tintOpacity: 0.72
    },
    // Pebble: deep teal-grey, the stones read through (drive/024).
    pebble: {
        floor: 'floor_pebble',
        tint: '#2f7f95',
        deep: '#174f60',
        tintOpacity: 0.6
    },
    colored: {
        floor: 'floor_quartz',
        tint: '#2a8fbf',
        deep: '#155f8f',
        tintOpacity: 0.76
    },
    // Not chosen yet: an existing plaster pool, a little less bright than new plaster.
    default: {
        floor: 'floor_plaster',
        tint: '#4cc4d8',
        deep: '#1a98ba',
        tintOpacity: 0.7
    }
};
function waterLook(surface) {
    switch(surface){
        case 'plaster':
            return WATER.plaster;
        case 'colored_plaster':
            return WATER.colored;
        case 'quartz':
        case 'glass_bead':
        case 'full_tile':
            return WATER.quartz;
        case 'pebble':
        case 'mini_pebble':
        case 'polished_pebble':
            return WATER.pebble;
        default:
            return WATER.default;
    }
}
function tileTexture(tile) {
    if (tile === 'glass' || tile === 'glass_mosaic') return 'tile_glass';
    if (tile === 'stone' || tile === 'natural_stone') return 'tile_stone';
    return 'tile_porcelain';
}
function copingTexture(coping) {
    if (coping === 'travertine' || coping === 'porcelain') return 'coping_travertine';
    if (coping === 'stone' || coping === 'bluestone_limestone' || coping === 'brick') return 'coping_stone';
    return 'coping_concrete';
}
function deckTexture(deck) {
    switch(deck){
        case 'pavers':
        case 'flagstone':
        case 'stepping_stones_turf':
            return 'deck_pavers';
        case 'porcelain':
            return 'deck_porcelain';
        case 'resurface':
            return 'deck_resurface';
        case 'decomposed_granite':
            return 'gravel_dg';
        case 'wood_composite':
            return 'wood_slats';
        default:
            return 'deck_concrete';
    }
}
function materialKeys(scene) {
    return {
        water: scene.surface ?? 'default',
        tile: tileTexture(scene.tile),
        coping: copingTexture(scene.coping),
        deck: scene.deck ? deckTexture(scene.deck) : 'existing',
        ground: scene.extras.turfPlanting ? 'turf' : 'grass'
    };
}
/** How much of the material one option tile shows (feet across). */ const VIEW_FT = {
    surface: 4,
    tile: 3,
    coping: 5.5,
    deck: 11
};
/**
 * Option ids whose look the scene really has a texture for. Deliberately
 * strict: a catalog option only drawn as the "closest look" in the scene (brick
 * coping as stone, stamped concrete as plain concrete) keeps its swatch or no
 * picture, so a tile never shows a material the homeowner did not pick.
 */ const OPTION_TEXTURES = {
    surface: {
        plaster: 'floor_plaster',
        quartz: 'floor_quartz',
        pebble: 'floor_pebble',
        mini_pebble: 'floor_pebble',
        polished_pebble: 'floor_pebble'
    },
    tile: {
        porcelain: 'tile_porcelain',
        ceramic: 'tile_porcelain',
        italian_porcelain: 'tile_porcelain',
        glass: 'tile_glass',
        glass_mosaic: 'tile_glass',
        stone: 'tile_stone',
        natural_stone: 'tile_stone'
    },
    coping: {
        concrete: 'coping_concrete',
        precast: 'coping_concrete',
        poured_in_place: 'coping_concrete',
        travertine: 'coping_travertine',
        stone: 'coping_stone',
        bluestone_limestone: 'coping_stone'
    },
    deck: {
        pavers: 'deck_pavers',
        concrete: 'deck_concrete',
        salt_finish: 'deck_concrete',
        porcelain: 'deck_porcelain',
        resurface: 'deck_resurface',
        decomposed_granite: 'gravel_dg',
        wood_composite: 'wood_slats'
    }
};
function isMaterialQuestion(id) {
    return id === 'surface' || id === 'tile' || id === 'coping' || id === 'deck';
}
function optionMaterial(questionId, optionId) {
    if (!isMaterialQuestion(questionId)) return null;
    const texture = OPTION_TEXTURES[questionId][optionId];
    if (!texture) return null;
    return {
        texture,
        water: questionId === 'surface' ? waterLook(optionId) : null,
        viewFt: VIEW_FT[questionId]
    };
}
}),
"[project]/components/estimator/scene/hero-images.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/**
 * Hero assets, made once: a <PoolScene> of a Signature-look design rendered to
 * PNG, and the photoreal render of that same picture from the production
 * kie.ai model and prompt (lib/estimator/render.ts). 1200 x 800 WebP (the
 * builder frame's 3:2), no metadata. A plain module (not 'use client') so the
 * server page can use the paths for its share preview.
 */ __turbopack_context__.s([
    "BATH_EXAMPLE_IMAGES",
    ()=>BATH_EXAMPLE_IMAGES,
    "BATH_HERO_VIDEO",
    ()=>BATH_HERO_VIDEO,
    "HERO_IMAGES",
    ()=>HERO_IMAGES
]);
const HERO_IMAGES = {
    illustration: '/estimator/hero/pool-design-illustration.webp',
    photo: '/estimator/hero/pool-design-photo.webp'
};
const BATH_EXAMPLE_IMAGES = {
    illustration: '/estimator/hero/bath-example-design.webp',
    photo: '/estimator/hero/bath-example-photo.webp'
};
const BATH_HERO_VIDEO = {
    mp4: '/estimator/hero/bath-hero.mp4',
    webm: '/estimator/hero/bath-hero.webm',
    poster: '/estimator/hero/bath-hero.webp',
    alt: 'AI-rendered example of a remodeled bathroom with a glass walk-in shower, a floating oak vanity and a freestanding tub'
};
}),
"[project]/components/estimator/scene/crossfade.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Crossfade",
    ()=>Crossfade,
    "FADE_MS",
    ()=>FADE_MS,
    "useFadeKeys",
    ()=>useFadeKeys
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
;
;
const FADE_MS = 420;
function useFadeKeys(key) {
    const [keys, setKeys] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])([
        key
    ]);
    let current = keys;
    if (keys[keys.length - 1] !== key) {
        // Derived state from the previous render (React's documented pattern).
        current = [
            ...keys.filter((k)=>k !== key).slice(-1),
            key
        ];
        setKeys(current);
    }
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (keys.length < 2) return;
        const t = setTimeout(()=>setKeys((ks)=>ks.slice(-1)), FADE_MS + 80);
        return ()=>clearTimeout(t);
    }, [
        keys
    ]);
    return current;
}
function Crossfade({ k, children }) {
    const keys = useFadeKeys(k);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: keys.map((key, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                className: keys.length > 1 && i === keys.length - 1 ? 'ps-fade' : undefined,
                children: children(key)
            }, key, false, {
                fileName: "[project]/components/estimator/scene/crossfade.tsx",
                lineNumber: 33,
                columnNumber: 9
            }, this))
    }, void 0, false);
}
}),
"[project]/components/estimator/scene/textures.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "TexturePattern",
    ()=>TexturePattern,
    "rng",
    ()=>rng,
    "tileSize",
    ()=>tileSize
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/textures.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/types.ts [app-ssr] (ecmascript)");
;
;
;
/**
 * Texture <pattern>s for the live pool scene. Each tile is the fallback colour,
 * then a light procedural drawing of the material (joints, speckle, boards),
 * then the generated image when TEXTURES[id].src is set (it covers the
 * drawing once loaded). So the scene looks finished before any image exists
 * and while images load. Tiles are TEXTURES[id].realFt feet square in scene
 * units, so materials keep a believable scale at every pool size.
 */ const FT = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].pxPerFt;
function rng(seed) {
    let a = seed >>> 0;
    return ()=>{
        a = a + 0x6d2b79f5 >>> 0;
        let t = a;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
const r1 = (n)=>Math.round(n * 10) / 10;
function tileSize(id) {
    return __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TEXTURES"][id].realFt * FT;
}
/** Dots scattered over a tile, wrapped so the tile stays seamless. */ function speckle(size, count, colors, rMin, rMax, seed, opacity = 1) {
    const rand = rng(seed);
    const out = [];
    for(let i = 0; i < count; i++){
        const x = rand() * size;
        const y = rand() * size;
        const r = rMin + rand() * (rMax - rMin);
        const fill = colors[Math.floor(rand() * colors.length)];
        out.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
            cx: r1(x),
            cy: r1(y),
            r: r1(r),
            fill: fill
        }, i, false, {
            fileName: "[project]/components/estimator/scene/textures.tsx",
            lineNumber: 43,
            columnNumber: 14
        }, this));
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        opacity: opacity,
        children: out
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/textures.tsx",
        lineNumber: 45,
        columnNumber: 10
    }, this);
}
/** Rectangular units in a running bond with tone variation and joints. */ function bond(size, uw, uh, tones, joint, seed, jointW = 0.9) {
    const rand = rng(seed);
    const rows = Math.round(size / uh);
    const cols = Math.round(size / uw);
    const out = [];
    for(let r = 0; r < rows; r++){
        const off = r % 2 ? uw / 2 : 0;
        for(let c = -1; c < cols; c++){
            const x = c * uw + off;
            out.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: r1(x),
                y: r1(r * uh),
                width: r1(uw),
                height: r1(uh),
                fill: tones[Math.floor(rand() * tones.length)],
                stroke: joint,
                strokeWidth: jointW
            }, `${r}-${c}`, false, {
                fileName: "[project]/components/estimator/scene/textures.tsx",
                lineNumber: 59,
                columnNumber: 9
            }, this));
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: out
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/textures.tsx",
        lineNumber: 63,
        columnNumber: 10
    }, this);
}
/** Soft blotches (mottling) for stone and plaster. */ function blotches(size, count, colors, rMin, rMax, seed, opacity) {
    const rand = rng(seed);
    const out = [];
    for(let i = 0; i < count; i++){
        const x = rand() * size;
        const y = rand() * size;
        const rx = rMin + rand() * (rMax - rMin);
        const ry = rx * (0.5 + rand() * 0.6);
        const fill = colors[Math.floor(rand() * colors.length)];
        // Wrap copies keep the tile seamless.
        for (const [dx, dy] of [
            [
                0,
                0
            ],
            [
                -size,
                0
            ],
            [
                size,
                0
            ],
            [
                0,
                -size
            ],
            [
                0,
                size
            ]
        ]){
            out.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: r1(x + dx),
                cy: r1(y + dy),
                rx: r1(rx),
                ry: r1(ry),
                fill: fill
            }, `${i}-${dx}-${dy}`, false, {
                fileName: "[project]/components/estimator/scene/textures.tsx",
                lineNumber: 84,
                columnNumber: 16
            }, this));
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        opacity: opacity,
        children: out
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/textures.tsx",
        lineNumber: 87,
        columnNumber: 10
    }, this);
}
function grid(size, step, color, width, opacity = 1) {
    const lines = [];
    for(let v = 0; v <= size + 0.01; v += step)lines.push(`M${r1(v)} 0V${r1(size)}M0 ${r1(v)}H${r1(size)}`);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
        d: lines.join(''),
        stroke: color,
        strokeWidth: width,
        fill: "none",
        opacity: opacity
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/textures.tsx",
        lineNumber: 93,
        columnNumber: 10
    }, this);
}
const cache = new Map();
/** The procedural drawing for a texture (cached: it never changes). */ function detail(id) {
    const hit = cache.get(id);
    if (hit !== undefined) return hit;
    const s = tileSize(id);
    let node = null;
    switch(id){
        case 'floor_plaster':
            node = blotches(s, 18, [
                '#ffffff',
                '#dcebed',
                '#f3f9f9'
            ], 4, 14, 11, 0.55);
            break;
        case 'floor_quartz':
            node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    blotches(s, 12, [
                        '#e2f0f2',
                        '#bcd9de'
                    ], 5, 14, 12, 0.5),
                    speckle(s, 90, [
                        '#8fb7c0',
                        '#ffffff',
                        '#6f9dab'
                    ], 0.35, 0.9, 13)
                ]
            }, void 0, true);
            break;
        case 'floor_pebble':
            node = speckle(s, 260, [
                '#6a828c',
                '#91a7ae',
                '#566c76',
                '#a9b8bb',
                '#7a8e93'
            ], 0.7, 1.6, 14);
            break;
        case 'tile_porcelain':
            node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    blotches(s, 8, [
                        '#4a7d95',
                        '#36657c'
                    ], 3, 6, 15, 0.6),
                    grid(s, FT / 2, '#e8eef0', 0.5, 0.55)
                ]
            }, void 0, true);
            break;
        case 'tile_glass':
            {
                const rand = rng(16);
                const step = FT / 4;
                const cells = [];
                for(let y = 0; y < s; y += step){
                    for(let x = 0; x < s; x += step){
                        const fill = [
                            '#2f8fb0',
                            '#3aa6c6',
                            '#2380a4',
                            '#4cb6d3',
                            '#1f6f96'
                        ][Math.floor(rand() * 5)];
                        cells.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: r1(x),
                            y: r1(y),
                            width: r1(step - 0.35),
                            height: r1(step - 0.35),
                            fill: fill
                        }, `${x}-${y}`, false, {
                            fileName: "[project]/components/estimator/scene/textures.tsx",
                            lineNumber: 134,
                            columnNumber: 22
                        }, this));
                    }
                }
                node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: cells
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/textures.tsx",
                    lineNumber: 137,
                    columnNumber: 14
                }, this);
                break;
            }
        case 'tile_stone':
            node = bond(s, FT * 0.75, FT / 2, [
                '#8a8478',
                '#9a9284',
                '#7b7569',
                '#a59c8b'
            ], '#6c665c', 17, 0.5);
            break;
        case 'coping_concrete':
            node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    blotches(s, 10, [
                        '#e6e3dc',
                        '#cdc9c0'
                    ], 4, 12, 18, 0.5),
                    speckle(s, 70, [
                        '#b9b5ac',
                        '#f2f0eb'
                    ], 0.3, 0.7, 19)
                ]
            }, void 0, true);
            break;
        case 'coping_travertine':
            node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    blotches(s, 14, [
                        '#ecdfc8',
                        '#d6c6a8',
                        '#efe5d3'
                    ], 5, 16, 20, 0.6),
                    speckle(s, 40, [
                        '#b7a587',
                        '#c9b796'
                    ], 0.4, 1.1, 21, 0.7)
                ]
            }, void 0, true);
            break;
        case 'coping_stone':
            node = blotches(s, 16, [
                '#c9c2b3',
                '#aaa395',
                '#b8b0a0',
                '#d2ccbe'
            ], 5, 15, 22, 0.65);
            break;
        case 'deck_pavers':
            node = bond(s, FT * 1.5, FT * 0.75, [
                '#d6c8ae',
                '#cbbb9e',
                '#dccfb8',
                '#c4b497',
                '#d1c2a5'
            ], '#a99a7f', 23, 0.8);
            break;
        case 'deck_concrete':
            node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    speckle(s, 160, [
                        '#bdb9b1',
                        '#e0ddd6',
                        '#c6c2ba'
                    ], 0.3, 0.8, 24),
                    blotches(s, 8, [
                        '#d8d5ce',
                        '#c3bfb7'
                    ], 10, 24, 25, 0.35),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: `M0 0H${s}M0 0V${s}`,
                        stroke: "#aaa59c",
                        strokeWidth: 1.3
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/textures.tsx",
                        lineNumber: 170,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true);
            break;
        case 'deck_porcelain':
            {
                const rand = rng(26);
                const tw = FT * 4;
                const th = FT * 2;
                const tiles = [];
                for(let y = 0; y < s; y += th){
                    const off = y / th % 2 ? tw / 2 : 0;
                    for(let x = -tw; x < s; x += tw){
                        const fill = [
                            '#e4e0d8',
                            '#dedad1',
                            '#e8e4dd',
                            '#dad5cb'
                        ][Math.floor(rand() * 4)];
                        tiles.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: r1(x + off),
                            y: r1(y),
                            width: tw,
                            height: th,
                            fill: fill,
                            stroke: "#c3bdb1",
                            strokeWidth: 0.7
                        }, `${x}-${y}`, false, {
                            fileName: "[project]/components/estimator/scene/textures.tsx",
                            lineNumber: 183,
                            columnNumber: 22
                        }, this));
                    }
                }
                node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            children: tiles
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/textures.tsx",
                            lineNumber: 188,
                            columnNumber: 11
                        }, this),
                        blotches(s, 10, [
                            '#f1eee8',
                            '#d4cfc4'
                        ], 6, 18, 27, 0.35)
                    ]
                }, void 0, true);
                break;
            }
        case 'deck_resurface':
            node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    blotches(s, 40, [
                        '#e9e1d2',
                        '#d3c8b4',
                        '#e4dccd'
                    ], 2, 7, 28, 0.75),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: `M0 0H${s}M0 0V${s}`,
                        stroke: "#bfb3a0",
                        strokeWidth: 1.2
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/textures.tsx",
                        lineNumber: 198,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true);
            break;
        case 'lawn_grass':
            node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        width: s,
                        height: s / 2,
                        fill: "#7aa955",
                        opacity: 0.55
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/textures.tsx",
                        lineNumber: 205,
                        columnNumber: 11
                    }, this),
                    speckle(s, 220, [
                        '#5d8a3e',
                        '#86b25f',
                        '#668f45',
                        '#7ea457'
                    ], 0.4, 1.1, 29, 0.8)
                ]
            }, void 0, true);
            break;
        case 'lawn_turf':
            node = speckle(s, 240, [
                '#4f8c32',
                '#6bab49',
                '#579a39',
                '#74b250'
            ], 0.35, 0.8, 30, 0.85);
            break;
        case 'planting_bed':
            node = speckle(s, 160, [
                '#5a4a37',
                '#7c6851',
                '#4a3d2e',
                '#8a765c'
            ], 0.5, 1.4, 31);
            break;
        case 'gravel_dg':
            node = speckle(s, 220, [
                '#b9a47e',
                '#d6c5a2',
                '#a8936d',
                '#e0d2b4'
            ], 0.4, 1.1, 32);
            break;
        case 'roof_shingle':
            {
                const row = FT * 0.85;
                const rand = rng(33);
                const parts = [];
                for(let y = 0, i = 0; y < s; y += row, i++){
                    parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        x: 0,
                        y: r1(y),
                        width: s,
                        height: r1(row),
                        fill: [
                            '#5b5f66',
                            '#575b62',
                            '#60646b'
                        ][i % 3]
                    }, `r${i}`, false, {
                        fileName: "[project]/components/estimator/scene/textures.tsx",
                        lineNumber: 224,
                        columnNumber: 20
                    }, this));
                    parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: `M0 ${r1(y + row)}H${s}`,
                        stroke: "#3f4248",
                        strokeWidth: 0.9
                    }, `l${i}`, false, {
                        fileName: "[project]/components/estimator/scene/textures.tsx",
                        lineNumber: 225,
                        columnNumber: 20
                    }, this));
                    for(let x = i % 2 * FT * 0.7; x < s; x += FT * 1.4){
                        parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: `M${r1(x)} ${r1(y)}v${r1(row)}`,
                            stroke: "#45484e",
                            strokeWidth: 0.6,
                            opacity: 0.6 + rand() * 0.4
                        }, `t${i}-${x}`, false, {
                            fileName: "[project]/components/estimator/scene/textures.tsx",
                            lineNumber: 227,
                            columnNumber: 22
                        }, this));
                    }
                }
                node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: parts
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/textures.tsx",
                    lineNumber: 230,
                    columnNumber: 14
                }, this);
                break;
            }
        case 'wood_slats':
            {
                const board = FT * 0.45;
                const rand = rng(34);
                const parts = [];
                for(let y = 0, i = 0; y < s; y += board, i++){
                    const fill = [
                        '#9a6b42',
                        '#8a5a34',
                        '#a8764a',
                        '#93633b',
                        '#7f5130'
                    ][Math.floor(rand() * 5)];
                    parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        x: 0,
                        y: r1(y),
                        width: s,
                        height: r1(board - 0.6),
                        fill: fill
                    }, `b${i}`, false, {
                        fileName: "[project]/components/estimator/scene/textures.tsx",
                        lineNumber: 239,
                        columnNumber: 20
                    }, this));
                    const joint = rand() * s;
                    parts.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: `M${r1(joint)} ${r1(y)}v${r1(board)}`,
                        stroke: "#5e3b20",
                        strokeWidth: 0.6
                    }, `j${i}`, false, {
                        fileName: "[project]/components/estimator/scene/textures.tsx",
                        lineNumber: 241,
                        columnNumber: 20
                    }, this));
                }
                node = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            width: s,
                            height: s,
                            fill: "#5e3b20"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/textures.tsx",
                            lineNumber: 245,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            children: parts
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/textures.tsx",
                            lineNumber: 246,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true);
                break;
            }
        case 'counter_stone':
            node = blotches(s, 12, [
                '#ece9e3',
                '#c8c3ba',
                '#e2ded6'
            ], 4, 14, 35, 0.6);
            break;
        case 'firepit_stone':
            node = bond(s, FT * 0.9, FT * 0.45, [
                '#8f8a82',
                '#7d786f',
                '#a29d94',
                '#6f6a62'
            ], '#55514b', 36, 0.6);
            break;
        case 'water_caustics':
            node = causticNet(s);
            break;
    }
    cache.set(id, node);
    return node;
}
/** A seamless caustic web: wobbly closed cells around jittered points, white on transparent. */ function causticNet(s) {
    const rand = rng(37);
    const n = 4;
    const cell = s / n;
    const paths = [];
    for(let gy = 0; gy < n; gy++){
        for(let gx = 0; gx < n; gx++){
            const cx = (gx + 0.5 + (rand() - 0.5) * 0.5) * cell;
            const cy = (gy + 0.5 + (rand() - 0.5) * 0.5) * cell;
            const k = 6;
            const pts = [];
            for(let i = 0; i < k; i++){
                const a = i / k * Math.PI * 2 + rand() * 0.4;
                const rr = cell * (0.42 + rand() * 0.16);
                pts.push([
                    cx + Math.cos(a) * rr,
                    cy + Math.sin(a) * rr
                ]);
            }
            for (const [dx, dy] of [
                [
                    0,
                    0
                ],
                [
                    -s,
                    0
                ],
                [
                    s,
                    0
                ],
                [
                    0,
                    -s
                ],
                [
                    0,
                    s
                ]
            ]){
                const p = pts.map(([x, y])=>[
                        x + dx,
                        y + dy
                    ]);
                // Smooth closed curve through midpoints.
                const mid = (a, b)=>[
                        (a[0] + b[0]) / 2,
                        (a[1] + b[1]) / 2
                    ];
                const m0 = mid(p[k - 1], p[0]);
                let d = `M${r1(m0[0])} ${r1(m0[1])}`;
                for(let i = 0; i < k; i++){
                    const m = mid(p[i], p[(i + 1) % k]);
                    d += `Q${r1(p[i][0])} ${r1(p[i][1])} ${r1(m[0])} ${r1(m[1])}`;
                }
                paths.push(d + 'Z');
            }
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
        d: paths.join(''),
        fill: "none",
        stroke: "#ffffff",
        strokeWidth: 1.3,
        strokeLinejoin: "round"
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/textures.tsx",
        lineNumber: 302,
        columnNumber: 10
    }, this);
}
function TexturePattern({ id, texture, transform, tone }) {
    const t = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TEXTURES"][texture];
    const s = tileSize(texture);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("pattern", {
        id: id,
        patternUnits: "userSpaceOnUse",
        width: s,
        height: s,
        patternTransform: transform,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: s,
                height: s,
                fill: t.fallback === 'transparent' ? 'none' : t.fallback
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/textures.tsx",
                lineNumber: 314,
                columnNumber: 7
            }, this),
            t.src ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("image", {
                href: t.src,
                width: s,
                height: s,
                preserveAspectRatio: "none"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/textures.tsx",
                lineNumber: 315,
                columnNumber: 16
            }, this) : detail(texture),
            tone ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: s,
                height: s,
                fill: tone.color,
                opacity: tone.opacity
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/textures.tsx",
                lineNumber: 316,
                columnNumber: 15
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/textures.tsx",
        lineNumber: 313,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/scene/sprites.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Bed",
    ()=>Bed,
    "FireBowl",
    ()=>FireBowl,
    "FirePit",
    ()=>FirePit,
    "Flame",
    ()=>Flame,
    "Kitchen",
    ()=>Kitchen,
    "Lounger",
    ()=>Lounger,
    "OliveTree",
    ()=>OliveTree,
    "PatioCover",
    ()=>PatioCover,
    "PatioCoverShadow",
    ()=>PatioCoverShadow,
    "ShelfLounger",
    ()=>ShelfLounger,
    "SpriteImage",
    ()=>SpriteImage,
    "Umbrella",
    ()=>Umbrella,
    "WaterBowl",
    ()=>WaterBowl,
    "cast",
    ()=>cast,
    "circlePath",
    ()=>circlePath,
    "treeShadowPath",
    ()=>treeShadowPath
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/textures.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/textures.tsx [app-ssr] (ecmascript)");
;
;
;
;
/**
 * Top-down objects for the live pool scene. Each one is drawn in local
 * coordinates (0,0 = top-left of its box) so the caller can move it with a
 * transform (and the move can animate). When SPRITES[id].src is set the image
 * is used instead of the vector drawing. Shadows are drawn separately
 * (ObjectShadow), in one pass under every object, offset away from a sun high
 * in the upper left, like the drone photos.
 */ const FT = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].pxPerFt;
const r1 = (n)=>Math.round(n * 10) / 10;
function cast(heightFt) {
    return {
        dx: r1(heightFt * 3.4),
        dy: r1(heightFt * 2.7)
    };
}
function circlePath(cx, cy, r) {
    return `M${r1(cx - r)} ${r1(cy)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(2 * r)} 0a${r1(r)} ${r1(r)} 0 1 0 ${r1(-2 * r)} 0`;
}
function SpriteImage({ id, w, h, rotate = 0, filter }) {
    const src = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"][id].src;
    if (!src) return null;
    if (rotate === 90) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
            transform: `translate(${r1(w)} 0) rotate(90)`,
            filter: filter,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("image", {
                href: src,
                width: h,
                height: w,
                preserveAspectRatio: "xMidYMid meet"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 35,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/estimator/scene/sprites.tsx",
            lineNumber: 34,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("image", {
        href: src,
        width: w,
        height: h,
        preserveAspectRatio: "xMidYMid meet",
        filter: filter
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 39,
        columnNumber: 10
    }, this);
}
function Lounger({ w, h }) {
    const back = h * 0.36;
    const weave = [];
    for(let y = 3; y < h - 2; y += 2.2)weave.push(`M1 ${r1(y)}h${r1(w - 2)}`);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: w,
                height: h,
                rx: 3.5,
                fill: "#b89a74"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: weave.join(''),
                stroke: "#8f7352",
                strokeOpacity: 0.35,
                strokeWidth: 0.6
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 2.4,
                y: 2.6,
                width: w - 4.8,
                height: back - 3.4,
                rx: 3,
                fill: "#f6f2ea"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 2.4,
                y: back + 0.8,
                width: w - 4.8,
                height: h - back - 3.4,
                rx: 3,
                fill: "#ece6da"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 54,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 2.4,
                y: 2.6,
                width: w - 4.8,
                height: back * 0.4,
                rx: 3,
                fill: "#ffffff",
                opacity: 0.7
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 55,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M2.4 ${r1(back - 0.4)}H${r1(w - 2.4)}`,
                stroke: "#5a4630",
                strokeOpacity: 0.35,
                strokeWidth: 1.3
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${r1(w * 0.33)} ${r1(back + 4)}V${r1(h - 5)}M${r1(w * 0.67)} ${r1(back + 4)}V${r1(h - 5)}`,
                stroke: "#000",
                strokeOpacity: 0.05,
                strokeWidth: 0.8
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 57,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 3.5,
                y: h * 0.6,
                width: w - 7,
                height: h * 0.17,
                rx: 1.5,
                fill: "#3f6f9a",
                opacity: 0.85
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M3.5 ${r1(h * 0.63)}h${r1(w - 7)}M3.5 ${r1(h * 0.74)}h${r1(w - 7)}`,
                stroke: "#fff",
                strokeOpacity: 0.6,
                strokeWidth: 0.8
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
function ShelfLounger({ w, h }) {
    if (__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].lounger.src) {
        // The sprite stands upright with the back at the top: turn it to lie along x, back on the left.
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
            transform: `translate(0 ${r1(h)}) rotate(-90)`,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("image", {
                href: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].lounger.src,
                width: h,
                height: w,
                preserveAspectRatio: "xMidYMid meet"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 70,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/estimator/scene/sprites.tsx",
            lineNumber: 69,
            columnNumber: 7
        }, this);
    }
    const d = `M${r1(w * 0.06)} ${r1(h * 0.12)}C${r1(w * 0.25)} ${r1(-h * 0.02)} ${r1(w * 0.55)} ${r1(h * 0.16)} ${r1(w * 0.75)} ${r1(h * 0.1)}C${r1(w * 0.92)} ${r1(h * 0.05)} ${r1(w)} ${r1(h * 0.25)} ${r1(w)} ${r1(h * 0.5)}C${r1(w)} ${r1(h * 0.75)} ${r1(w * 0.92)} ${r1(h * 0.95)} ${r1(w * 0.75)} ${r1(h * 0.9)}C${r1(w * 0.55)} ${r1(h * 0.84)} ${r1(w * 0.25)} ${r1(h * 1.02)} ${r1(w * 0.06)} ${r1(h * 0.88)}C${r1(-w * 0.02)} ${r1(h * 0.8)} ${r1(-w * 0.02)} ${r1(h * 0.2)} ${r1(w * 0.06)} ${r1(h * 0.12)}Z`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: d,
                fill: "#f7f9f9"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 77,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${r1(w * 0.36)} ${r1(h * 0.2)}C${r1(w * 0.33)} ${r1(h * 0.45)} ${r1(w * 0.33)} ${r1(h * 0.55)} ${r1(w * 0.36)} ${r1(h * 0.8)}`,
                stroke: "#9fb9be",
                strokeWidth: 1.2,
                fill: "none",
                opacity: 0.6
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 78,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: d,
                fill: "none",
                stroke: "#c9d6d8",
                strokeWidth: 0.8
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 79,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: w * 0.17,
                cy: h / 2,
                rx: w * 0.09,
                ry: h * 0.3,
                fill: "#fff"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 80,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 76,
        columnNumber: 5
    }, this);
}
function Umbrella({ d, color = '#2e5a92' }) {
    if (__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].umbrella.src) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SpriteImage, {
        id: "umbrella",
        w: d,
        h: d
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 88,
        columnNumber: 36
    }, this);
    const r = d / 2;
    const n = 8;
    const pts = Array.from({
        length: n
    }, (_, i)=>{
        const a = i / n * Math.PI * 2 - Math.PI / 2 + Math.PI / n;
        return [
            r + Math.cos(a) * r,
            r + Math.sin(a) * r
        ];
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            pts.map((p, i)=>{
                const q = pts[(i + 1) % n];
                // Panels facing the sun (upper left) are lighter.
                const mid = Math.atan2((p[1] + q[1]) / 2 - r, (p[0] + q[0]) / 2 - r);
                const lit = Math.cos(mid - -Math.PI * 3 / 4);
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: `M${r1(r)} ${r1(r)}L${r1(p[0])} ${r1(p[1])}L${r1(q[0])} ${r1(q[1])}Z`,
                    fill: color,
                    opacity: 0.82 + lit * 0.18
                }, i, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 102,
                    columnNumber: 16
                }, this);
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${pts.map((p)=>`${r1(p[0])} ${r1(p[1])}`).join('L')}Z`,
                fill: "none",
                stroke: "#000",
                strokeOpacity: 0.18,
                strokeWidth: 1.2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 104,
                columnNumber: 7
            }, this),
            pts.map((p, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: `M${r1(r)} ${r1(r)}L${r1(p[0])} ${r1(p[1])}`,
                    stroke: "#fff",
                    strokeOpacity: 0.22,
                    strokeWidth: 0.8
                }, `rib${i}`, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 106,
                    columnNumber: 9
                }, this)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: r,
                cy: r,
                r: 2.6,
                fill: "#f3f1ec"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 108,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 96,
        columnNumber: 5
    }, this);
}
function blobs(seed, count, spread, rMin, rMax, ox = 0, oy = 0) {
    const rand = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rng"])(seed);
    return Array.from({
        length: count
    }, ()=>{
        const a = rand() * Math.PI * 2;
        const dist = Math.sqrt(rand()) * spread;
        return {
            x: Math.cos(a) * dist + ox,
            y: Math.sin(a) * dist + oy,
            r: rMin + rand() * (rMax - rMin)
        };
    });
}
const blobPath = (list, cx, cy)=>list.map((b)=>circlePath(cx + b.x, cy + b.y, b.r)).join('');
function OliveTree({ d, seed }) {
    if (__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].olive_tree.src) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SpriteImage, {
        id: "olive_tree",
        w: d,
        h: d
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 130,
        columnNumber: 38
    }, this);
    const c = d / 2;
    const base = blobs(seed, 13, d * 0.28, d * 0.12, d * 0.2);
    const mid = blobs(seed + 1, 26, d * 0.32, d * 0.06, d * 0.11, -d * 0.03, -d * 0.03);
    const hi = blobs(seed + 2, 24, d * 0.3, d * 0.03, d * 0.065, -d * 0.07, -d * 0.07);
    const dark = blobs(seed + 3, 10, d * 0.3, d * 0.02, d * 0.035, d * 0.04, d * 0.05);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: blobPath(base, c, c),
                fill: "#56653f"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 138,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: blobPath(mid, c, c),
                fill: "#77885a"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 139,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: blobPath(hi, c, c),
                fill: "#a4b285"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 140,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: blobPath(hi.slice(0, 9), c - d * 0.02, c - d * 0.02),
                fill: "#c3cda6",
                opacity: 0.7
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 141,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: blobPath(dark, c, c),
                fill: "#3e4a2e",
                opacity: 0.65
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 142,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 137,
        columnNumber: 5
    }, this);
}
function treeShadowPath(d, seed, x, y) {
    return blobPath(blobs(seed, 13, d * 0.28, d * 0.12, d * 0.2), x + d / 2, y + d / 2);
}
/** Ornamental grass clump (blue fescue / feather grass) as a starburst. */ function grassPath(cx, cy, r, seed) {
    const rand = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rng"])(seed);
    const n = 14;
    let d = '';
    for(let i = 0; i < n; i++){
        const a = i / n * Math.PI * 2 + rand() * 0.4;
        const len = r * (0.6 + rand() * 0.45);
        d += `M${r1(cx)} ${r1(cy)}L${r1(cx + Math.cos(a) * len)} ${r1(cy + Math.sin(a) * len)}`;
    }
    return d;
}
function Bed({ x, y, w, h, kind, seed, bedFill }) {
    const vertical = h > w;
    const len = vertical ? h : w;
    const thick = vertical ? w : h;
    const at = (t, across)=>vertical ? {
            x: x + across,
            y: y + t
        } : {
            x: x + t,
            y: y + across
        };
    const rand = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rng"])(seed);
    const shrubSrc = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].shrub.src;
    if (kind === 'hedge') {
        // A clipped hedge: overlapping shrubs on a dark base, casting a short shadow.
        const sh = cast(5);
        const base = [];
        const tops = [];
        for(let t = thick * 0.35; t < len - thick * 0.25; t += thick * 0.5){
            const p = at(t, thick * (0.48 + (rand() - 0.5) * 0.12));
            const r = thick * (0.56 + rand() * 0.1);
            base.push(circlePath(p.x, p.y, r * 0.92));
            tops.push({
                x: p.x,
                y: p.y,
                r
            });
        }
        const shadow = vertical ? {
            x: x + sh.dx * 0.6,
            y,
            w,
            h
        } : {
            x,
            y: y + sh.dy * 0.6,
            w,
            h
        };
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    x: shadow.x,
                    y: shadow.y,
                    width: shadow.w,
                    height: shadow.h,
                    fill: "#0b1c22",
                    opacity: 0.22
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 190,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: base.join(''),
                    fill: "#35592a"
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 191,
                    columnNumber: 9
                }, this),
                shrubSrc ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    opacity: 0.88,
                    children: tops.map((p, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("image", {
                            href: shrubSrc,
                            x: r1(p.x - p.r),
                            y: r1(p.y - p.r),
                            width: r1(2 * p.r),
                            height: r1(2 * p.r)
                        }, i, false, {
                            fileName: "[project]/components/estimator/scene/sprites.tsx",
                            lineNumber: 195,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 193,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: tops.map((p)=>circlePath(p.x - p.r * 0.15, p.y - p.r * 0.15, p.r * 0.7)).join(''),
                            fill: "#4f7f37"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/sprites.tsx",
                            lineNumber: 200,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: tops.map((p)=>circlePath(p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.32)).join(''),
                            fill: "#6f9c4c",
                            opacity: 0.85
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/sprites.tsx",
                            lineNumber: 201,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true)
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/scene/sprites.tsx",
            lineNumber: 189,
            columnNumber: 7
        }, this);
    }
    const grasses = [];
    const shrubs = [];
    const step = FT * 2.3;
    let i = 0;
    for(let t = step * 0.6; t < len - step * 0.4; t += step, i++){
        const p = at(t + (rand() - 0.5) * 6, thick * (0.5 + (rand() - 0.5) * 0.25));
        if (i % 3 === 1) shrubs.push({
            x: p.x,
            y: p.y,
            r: thick * (0.38 + rand() * 0.08)
        });
        else grasses.push(grassPath(p.x, p.y, thick * 0.4, seed + i));
    }
    const sh = cast(2.5);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: x,
                y: y,
                width: w,
                height: h,
                fill: bedFill
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 219,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: shrubs.map((p)=>circlePath(p.x + sh.dx, p.y + sh.dy, p.r * 0.9)).join(''),
                fill: "#0b1c22",
                opacity: 0.25
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 220,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: grasses.join(''),
                stroke: "#5f7a68",
                strokeWidth: 1.4,
                strokeLinecap: "round",
                transform: "translate(1 1)",
                opacity: 0.6
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 221,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: grasses.join(''),
                stroke: "#a9bfae",
                strokeWidth: 1.1,
                strokeLinecap: "round"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 222,
                columnNumber: 7
            }, this),
            shrubSrc ? shrubs.map((p, j)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("image", {
                    href: shrubSrc,
                    x: r1(p.x - p.r),
                    y: r1(p.y - p.r),
                    width: r1(2 * p.r),
                    height: r1(2 * p.r)
                }, j, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 224,
                    columnNumber: 30
                }, this)) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: shrubs.map((p)=>circlePath(p.x, p.y, p.r)).join(''),
                        fill: "#4d7a3a"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/sprites.tsx",
                        lineNumber: 227,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: shrubs.map((p)=>circlePath(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.5)).join(''),
                        fill: "#77a157"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/sprites.tsx",
                        lineNumber: 228,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 218,
        columnNumber: 5
    }, this);
}
/* ------------------------------ kitchen ------------------------------ */ /** Bar stools seen from above: round seats with a lit edge. */ function Stools({ points }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: points.map((p, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: r1(p.x),
                        cy: r1(p.y),
                        r: FT * 0.62,
                        fill: "#3b3a38"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/sprites.tsx",
                        lineNumber: 243,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: r1(p.x - 1),
                        cy: r1(p.y - 1),
                        r: FT * 0.45,
                        fill: "#5b5753"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/sprites.tsx",
                        lineNumber: 244,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: r1(p.x - 1.6),
                        cy: r1(p.y - 1.6),
                        r: FT * 0.18,
                        fill: "#77736e"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/sprites.tsx",
                        lineNumber: 245,
                        columnNumber: 11
                    }, this)
                ]
            }, i, true, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 242,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 240,
        columnNumber: 5
    }, this);
}
function Kitchen({ w, h, side, counterFill, padFill }) {
    if (side === 'house') {
        const depth = 4.2 * FT;
        const stoolY = depth + 1.15 * FT;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    width: w,
                    height: h,
                    fill: padFill
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 263,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    width: w,
                    height: h,
                    fill: "none",
                    stroke: "#3a3328",
                    strokeOpacity: 0.18,
                    strokeWidth: 1.2
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 264,
                    columnNumber: 9
                }, this),
                __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].outdoor_kitchen.src ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SpriteImage, {
                    id: "outdoor_kitchen",
                    w: w,
                    h: depth
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 266,
                    columnNumber: 11
                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            width: w,
                            height: depth * 0.8,
                            rx: 2,
                            fill: counterFill
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/sprites.tsx",
                            lineNumber: 269,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: w * 0.2,
                            y: depth * 0.15,
                            width: FT * 3.2,
                            height: depth * 0.5,
                            rx: 3,
                            fill: "#a6acb2"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/sprites.tsx",
                            lineNumber: 270,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: w * 0.62,
                            y: depth * 0.2,
                            width: FT * 1.6,
                            height: depth * 0.4,
                            rx: 3,
                            fill: "#b6bec3"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/sprites.tsx",
                            lineNumber: 271,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 268,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Stools, {
                    points: [
                        0.2,
                        0.4,
                        0.6,
                        0.8
                    ].map((t)=>({
                            x: w * t,
                            y: stoolY
                        }))
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 274,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/components/estimator/scene/sprites.tsx",
            lineNumber: 262,
            columnNumber: 7
        }, this);
    }
    const depth = 3 * FT;
    const cx = w - depth; // counter starts here when it backs onto the right wall
    const body = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].outdoor_kitchen.src ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        transform: `translate(${r1(cx)} 0)`,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SpriteImage, {
            id: "outdoor_kitchen",
            w: depth,
            h: h,
            rotate: 90
        }, void 0, false, {
            fileName: "[project]/components/estimator/scene/sprites.tsx",
            lineNumber: 282,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 281,
        columnNumber: 5
    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: cx,
                y: 0,
                width: depth,
                height: h,
                rx: 2,
                fill: counterFill
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 286,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: cx,
                y: 0,
                width: depth,
                height: h,
                rx: 2,
                fill: "none",
                stroke: "#000",
                strokeOpacity: 0.18,
                strokeWidth: 1.2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 287,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${r1(cx + 1)} 2V${r1(h - 2)}`,
                stroke: "#fff",
                strokeOpacity: 0.5,
                strokeWidth: 1.2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 288,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: cx + 5,
                y: h * 0.14,
                width: depth - 10,
                height: FT * 3.2,
                rx: 3,
                fill: "#a6acb2"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 290,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: cx + 7,
                y: h * 0.14 + 2,
                width: depth - 14,
                height: FT * 3.2 - 4,
                rx: 2,
                fill: "#c7ccd0"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 291,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${r1(cx + 7)} ${r1(h * 0.14 + FT * 1.6)}H${r1(cx + depth - 7)}`,
                stroke: "#7b8187",
                strokeWidth: 1.2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 292,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${r1(cx + 6)} ${r1(h * 0.14 + 4)}v${r1(FT * 3.2 - 8)}`,
                stroke: "#5f656b",
                strokeWidth: 1.6,
                strokeLinecap: "round"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 293,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: cx + depth / 2,
                cy: h * 0.14 + FT * 4.3,
                r: 5,
                fill: "#3d4246"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 295,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: cx + depth / 2,
                cy: h * 0.14 + FT * 4.3,
                r: 2.6,
                fill: "#5c6267"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 296,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: cx + 9,
                y: h * 0.66,
                width: depth - 18,
                height: FT * 1.6,
                rx: 3,
                fill: "#8f989e"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 297,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: cx + 11,
                y: h * 0.66 + 2,
                width: depth - 22,
                height: FT * 1.6 - 4,
                rx: 2,
                fill: "#b6bec3"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 298,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: cx + depth - 7,
                cy: h * 0.66 + FT * 0.8,
                r: 1.8,
                fill: "#6d757b"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 299,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 285,
        columnNumber: 5
    }, this);
    const stools = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Stools, {
        points: [
            0.42,
            0.58,
            0.74,
            0.9
        ].map((t)=>({
                x: cx - FT * 0.85,
                y: h * t
            }))
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 302,
        columnNumber: 18
    }, this);
    const content = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            body,
            stools
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 304,
        columnNumber: 5
    }, this);
    return side === 'left' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        transform: `translate(${r1(w)} 0) scale(-1 1)`,
        children: content
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 309,
        columnNumber: 28
    }, this) : content;
}
function PatioCover({ w, h, padFill, night }) {
    const beam = 6;
    const slats = [];
    for(let y = beam + 4; y < h - beam - 2; y += FT * 0.9){
        slats.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
            x: beam,
            y: y,
            width: w - 2 * beam,
            height: FT * 0.42,
            fill: "#f3f2ef"
        }, y, false, {
            fileName: "[project]/components/estimator/scene/sprites.tsx",
            lineNumber: 323,
            columnNumber: 16
        }, this));
        slats.push(/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
            x: beam,
            y: y + FT * 0.32,
            width: w - 2 * beam,
            height: FT * 0.1,
            fill: "#000",
            opacity: 0.12
        }, `s${y}`, false, {
            fileName: "[project]/components/estimator/scene/sprites.tsx",
            lineNumber: 324,
            columnNumber: 16
        }, this));
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: w,
                height: h,
                fill: padFill
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 328,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(PatioSet, {
                w: w,
                h: h
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 329,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                opacity: night ? 0.6 : 0.95,
                children: slats
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 330,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: beam / 2,
                y: 0,
                width: w - beam,
                height: h - beam / 2,
                fill: "none",
                stroke: "#e7e5e0",
                strokeWidth: beam
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 331,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: beam / 2,
                y: 0,
                width: w - beam,
                height: h - beam / 2,
                fill: "none",
                stroke: "#000",
                strokeOpacity: 0.12,
                strokeWidth: 1
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 332,
                columnNumber: 7
            }, this),
            [
                [
                    0,
                    h - beam * 1.6
                ],
                [
                    w - beam * 1.6,
                    h - beam * 1.6
                ]
            ].map(([px, py], i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    x: px,
                    y: py,
                    width: beam * 1.6,
                    height: beam * 1.6,
                    fill: "#d9d6d0",
                    stroke: "#000",
                    strokeOpacity: 0.2,
                    strokeWidth: 0.8
                }, i, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 337,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 327,
        columnNumber: 5
    }, this);
}
/** Sectional sofa, coffee table and rug (under the patio cover). */ function PatioSet({ w, h }) {
    if (__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].patio_set.src) {
        const sw = Math.min(w * 0.8, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].patio_set.widthFt * FT);
        const sh = Math.min(h * 0.8, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].patio_set.heightFt * FT);
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
            transform: `translate(${r1((w - sw) / 2)} ${r1((h - sh) / 2)})`,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SpriteImage, {
                id: "patio_set",
                w: sw,
                h: sh
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 350,
                columnNumber: 9
            }, this)
        }, void 0, false, {
            fileName: "[project]/components/estimator/scene/sprites.tsx",
            lineNumber: 349,
            columnNumber: 7
        }, this);
    }
    const x0 = w * 0.14;
    const y0 = h * 0.18;
    const sw = w * 0.72;
    const sh = h * 0.62;
    const seat = FT * 2.6;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: x0 + seat * 0.6,
                y: y0 + seat * 0.6,
                width: sw - seat * 0.9,
                height: sh - seat * 0.9,
                rx: 3,
                fill: "#d9d0c0",
                opacity: 0.85
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 361,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: x0,
                y: y0,
                width: sw,
                height: seat,
                rx: 4,
                fill: "#8d8174"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 363,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: x0,
                y: y0,
                width: seat,
                height: sh,
                rx: 4,
                fill: "#8d8174"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 364,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: x0 + 4,
                y: y0 + 7,
                width: sw - 8,
                height: seat - 10,
                rx: 3,
                fill: "#efebe3"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 365,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: x0 + 7,
                y: y0 + 4,
                width: seat - 10,
                height: sh - 8,
                rx: 3,
                fill: "#efebe3"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 366,
                columnNumber: 7
            }, this),
            [
                0.3,
                0.55,
                0.8
            ].map((t)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                    d: `M${r1(x0 + sw * t)} ${r1(y0 + 8)}v${r1(seat - 12)}`,
                    stroke: "#000",
                    strokeOpacity: 0.1,
                    strokeWidth: 1
                }, t, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 368,
                    columnNumber: 9
                }, this)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: x0 + seat + FT * 1.4,
                y: y0 + seat + FT * 1.2,
                width: FT * 4,
                height: FT * 2.4,
                rx: 2,
                fill: "#8b6a49"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 370,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: x0 + seat + FT * 1.4,
                y: y0 + seat + FT * 1.2,
                width: FT * 4,
                height: FT * 0.6,
                rx: 2,
                fill: "#a17e5a"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 371,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: x0 + sw - FT * 1.4,
                cy: y0 + sh - FT * 1.2,
                r: FT * 1.1,
                fill: "#e8e2d6",
                stroke: "#8d8174",
                strokeWidth: 2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 372,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 360,
        columnNumber: 5
    }, this);
}
function PatioCoverShadow({ w, h }) {
    const { dx, dy } = cast(9);
    const stripes = [];
    for(let y = 10; y < h - 8; y += FT * 0.9)stripes.push(`M${r1(dx + 6)} ${r1(y + dy)}h${r1(w - 12)}v${r1(FT * 0.42)}h${r1(-(w - 12))}Z`);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: stripes.join(''),
                fill: "#10202a",
                opacity: 0.2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 384,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: dx,
                y: dy,
                width: w,
                height: h,
                fill: "none",
                stroke: "#10202a",
                strokeOpacity: 0.22,
                strokeWidth: 6
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 385,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 383,
        columnNumber: 5
    }, this);
}
function FirePit({ d, gravelFill, stoneFill }) {
    const c = d / 2;
    const pitR = Math.min(2.4 * FT, d * 0.19);
    const chairs = [
        45,
        135,
        225,
        315
    ].map((deg, i)=>{
        const a = deg * Math.PI / 180;
        const dist = d * 0.34;
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
            transform: `translate(${r1(c + Math.cos(a) * dist)} ${r1(c + Math.sin(a) * dist)}) rotate(${deg + 90})`,
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(AdirondackChair, {}, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 400,
                columnNumber: 9
            }, this)
        }, i, false, {
            fileName: "[project]/components/estimator/scene/sprites.tsx",
            lineNumber: 399,
            columnNumber: 7
        }, this);
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: c,
                cy: c,
                r: c - 1,
                fill: gravelFill
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 406,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: c,
                cy: c,
                r: c - 1,
                fill: "none",
                stroke: "#5f5346",
                strokeWidth: 1.6,
                opacity: 0.7
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 407,
                columnNumber: 7
            }, this),
            chairs,
            __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].fire_pit.src ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                transform: `translate(${r1(c - pitR)} ${r1(c - pitR)})`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SpriteImage, {
                    id: "fire_pit",
                    w: pitR * 2,
                    h: pitR * 2
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/sprites.tsx",
                    lineNumber: 411,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 410,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: c,
                        cy: c,
                        r: pitR,
                        fill: stoneFill
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/sprites.tsx",
                        lineNumber: 415,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: c,
                        cy: c,
                        r: pitR,
                        fill: "none",
                        stroke: "#000",
                        strokeOpacity: 0.25,
                        strokeWidth: 1
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/sprites.tsx",
                        lineNumber: 416,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: c,
                        cy: c,
                        r: pitR * 0.66,
                        fill: "#2b2522"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/sprites.tsx",
                        lineNumber: 417,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Flame, {
                        cx: c,
                        cy: c,
                        r: pitR * 0.55
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/sprites.tsx",
                        lineNumber: 418,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 414,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 405,
        columnNumber: 5
    }, this);
}
/**
 * Teak Adirondack chair seen from above, drawn around its centre and facing
 * up (-y): fanned back slats at the bottom, slatted seat, wide flat arms.
 */ function AdirondackChair() {
    const w = 2.5 * FT;
    const h = 3 * FT;
    const top = -h / 2;
    const seatBack = top + h * 0.62;
    const slats = [];
    for(let i = 1; i < 6; i++)slats.push(`M${r1(-w * 0.34)} ${r1(top + h * 0.62 * i / 6)}h${r1(w * 0.68)}`);
    const back = [];
    for(let i = 0; i < 5; i++){
        const x = -w * 0.3 + w * 0.6 * i / 4;
        back.push(`M${r1(x * 0.75)} ${r1(seatBack)}L${r1(x)} ${r1(top + h)}`);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${r1(-w * 0.26)} ${r1(seatBack)}L${r1(-w * 0.4)} ${r1(top + h)}Q0 ${r1(top + h + 4)} ${r1(w * 0.4)} ${r1(top + h)}L${r1(w * 0.26)} ${r1(seatBack)}Z`,
                fill: "#9c7048"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 444,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: back.join(''),
                stroke: "#6e4b2c",
                strokeWidth: 0.8
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 445,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: -w * 0.36,
                y: top,
                width: w * 0.72,
                height: h * 0.64,
                rx: 2,
                fill: "#b0835a"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 447,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: slats.join(''),
                stroke: "#7d5735",
                strokeOpacity: 0.8,
                strokeWidth: 0.7
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 448,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: -w / 2,
                y: top + h * 0.14,
                width: w * 0.17,
                height: h * 0.6,
                rx: 2,
                fill: "#c09068"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 450,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: w / 2 - w * 0.17,
                y: top + h * 0.14,
                width: w * 0.17,
                height: h * 0.6,
                rx: 2,
                fill: "#c09068"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 451,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${r1(-w / 2 + 0.6)} ${r1(top + h * 0.15)}v${r1(h * 0.58)}`,
                stroke: "#e2bf98",
                strokeOpacity: 0.7,
                strokeWidth: 0.8
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 452,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 442,
        columnNumber: 5
    }, this);
}
function Flame({ cx, cy, r }) {
    const tongues = [
        0,
        1,
        2,
        3,
        4
    ].map((i)=>{
        const a = i / 5 * Math.PI * 2 + 0.3;
        return circlePath(cx + Math.cos(a) * r * 0.45, cy + Math.sin(a) * r * 0.45, r * 0.34);
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        className: "ps-flicker",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: tongues.join(''),
                fill: "#ff8a1f",
                opacity: 0.85
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 465,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: cx,
                cy: cy,
                r: r * 0.55,
                fill: "#ffc53d"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 466,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: cx - r * 0.1,
                cy: cy - r * 0.1,
                r: r * 0.28,
                fill: "#fff1b8"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 467,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 464,
        columnNumber: 5
    }, this);
}
function FireBowl({ r }) {
    if (__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].fire_bowl.src) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SpriteImage, {
        id: "fire_bowl",
        w: r * 2,
        h: r * 2
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 475,
        columnNumber: 37
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: r,
                cy: r,
                r: r,
                fill: "#cfcac1"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 478,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: r,
                cy: r,
                r: r,
                fill: "none",
                stroke: "#000",
                strokeOpacity: 0.22,
                strokeWidth: 1
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 479,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: r - r * 0.08,
                cy: r - r * 0.08,
                r: r * 0.92,
                fill: "none",
                stroke: "#fff",
                strokeOpacity: 0.5,
                strokeWidth: 1.2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 480,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: r,
                cy: r,
                r: r * 0.72,
                fill: "#3a332e"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 481,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Flame, {
                cx: r,
                cy: r,
                r: r * 0.58
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 482,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 477,
        columnNumber: 5
    }, this);
}
function WaterBowl({ r }) {
    if (__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SPRITES"].water_bowl.src) return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SpriteImage, {
        id: "water_bowl",
        w: r * 2,
        h: r * 2
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 488,
        columnNumber: 38
    }, this);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: r,
                cy: r,
                r: r,
                fill: "#9a5a33"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 491,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: r - r * 0.06,
                cy: r - r * 0.06,
                r: r * 0.93,
                fill: "#b8743f"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 492,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: r,
                cy: r,
                r: r * 0.76,
                fill: "#4fc0d2"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 493,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: r - r * 0.18,
                cy: r - r * 0.2,
                r: r * 0.36,
                fill: "#bff3f8",
                opacity: 0.55
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 494,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: r,
                cy: r,
                r: r * 0.76,
                fill: "none",
                stroke: "#fff",
                strokeOpacity: 0.6,
                strokeWidth: 1
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/sprites.tsx",
                lineNumber: 495,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/sprites.tsx",
        lineNumber: 490,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/scene/water.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CAUSTICS",
    ()=>CAUSTICS,
    "PoolLayer",
    ()=>PoolLayer,
    "deckPath",
    ()=>deckPath
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/geometry.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/textures.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/crossfade.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/materials.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/sprites.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/textures.tsx [app-ssr] (ecmascript)");
;
;
;
;
;
;
;
;
/**
 * The pool, back to front: deck (which also paves the walk along the house
 * when a new deck is picked, so it reads as one patio), coping (square-cornered
 * on rectangle and L pools), water (floor texture tinted by the finish, depth
 * gradient, wall shadow, caustics, ripples, sun glint), Baja shelf, waterline
 * tile, spa, lights and bowls on pedestals. Each material sits in its own
 * crossfading group keyed by the material, so a new pick fades in over the old.
 */ const FT = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].pxPerFt;
const r1 = (n)=>Math.round(n * 10) / 10;
const CAUSTICS = (()=>{
    const t = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["tileSize"])('water_caustics');
    const k = 1.45;
    const deg = 28;
    const a = deg * Math.PI / 180;
    return {
        t,
        k,
        deg,
        b: {
            x: r1(k * t * Math.cos(a)),
            y: r1(k * t * Math.sin(a))
        }
    };
})();
function deckPath(b, rx, open = false) {
    const r = Math.max(0, Math.min(rx, b.w / 2, b.h / 2));
    const x2 = b.x + b.w;
    const y2 = b.y + b.h;
    const body = `V${r1(y2 - r)}Q${r1(b.x)} ${r1(y2)} ${r1(b.x + r)} ${r1(y2)}H${r1(x2 - r)}Q${r1(x2)} ${r1(y2)} ${r1(x2)} ${r1(y2 - r)}V${r1(b.y)}`;
    return `M${r1(b.x)} ${r1(b.y)}${body}${open ? '' : 'Z'}`;
}
function PoolLayer({ uid, layout, scene, keys, night }) {
    const { pool, deck } = layout;
    const box = pool.box;
    const waterClip = `${uid}-water`;
    const c = pool.coping;
    const shadowShift = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["poolOutlinePath"])(pool, 1.1 * FT, 0.9 * FT);
    const pad = 2 * FT;
    const fillBox = {
        x: box.x - pad,
        y: box.y - pad,
        width: box.w + 2 * pad,
        height: box.h + 2 * pad
    };
    const deckD = deckPath(deck.box, deck.rx);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("clipPath", {
                        id: waterClip,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            className: "ps-morph",
                            d: pool.path
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 60,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 59,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("clipPath", {
                        id: `${uid}-deck`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            className: "ps-morph",
                            d: deckD
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 63,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 62,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("pattern", {
                        id: `${uid}-sawcut`,
                        patternUnits: "userSpaceOnUse",
                        width: 10 * FT,
                        height: 10 * FT,
                        patternTransform: `translate(${r1(deck.box.x)} ${r1(deck.box.y)})`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: `M0 0H${10 * FT}M0 0V${10 * FT}`,
                            stroke: "#7f796e",
                            strokeOpacity: 0.55,
                            strokeWidth: 1.3
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 67,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 66,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                className: "ps-deck",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Crossfade"], {
                        k: keys.deck,
                        children: (k)=>{
                            const existing = k === 'existing';
                            const tex = existing ? 'deck_concrete' : k;
                            const id = `${uid}-deck-${k}`;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                                            id: id,
                                            texture: tex,
                                            transform: `translate(${r1(deck.box.x)} ${r1(deck.box.y)})`,
                                            tone: existing ? {
                                                color: '#8f8676',
                                                opacity: 0.34
                                            } : undefined
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/water.tsx",
                                            lineNumber: 81,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 80,
                                        columnNumber: 17
                                    }, this),
                                    existing ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                        x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].x,
                                        y: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH,
                                        width: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].w,
                                        height: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].walkH,
                                        fill: `url(#${id})`
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 88,
                                        columnNumber: 36
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        className: "ps-morph",
                                        d: deckD,
                                        fill: `url(#${id})`
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 89,
                                        columnNumber: 17
                                    }, this),
                                    tex === 'deck_concrete' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        className: "ps-morph",
                                        d: deckD,
                                        fill: `url(#${uid}-sawcut)`,
                                        opacity: existing ? 0.6 : 1
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 91,
                                        columnNumber: 19
                                    }, this) : null,
                                    existing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(ExistingWear, {
                                        deck: deck.box,
                                        seed: Math.round(deck.box.w),
                                        clip: `${uid}-deck`
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 93,
                                        columnNumber: 29
                                    }, this) : null
                                ]
                            }, void 0, true);
                        }
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 73,
                        columnNumber: 9
                    }, this),
                    deck.turfBands.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                        clipPath: `url(#${uid}-deck)`,
                        children: deck.turfBands.map((b, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                        x: b.x,
                                        y: b.y,
                                        width: b.w,
                                        height: b.h,
                                        fill: `url(#${uid}-turf)`
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 102,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                        x: b.x + b.w - 0.8,
                                        y: b.y,
                                        width: 0.8,
                                        height: b.h,
                                        fill: "#000",
                                        opacity: 0.15
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 103,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, i, true, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 101,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 99,
                        columnNumber: 11
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        className: "ps-morph",
                        d: deckPath(deck.box, deck.rx, true),
                        fill: "none",
                        stroke: "#3a3328",
                        strokeOpacity: 0.2,
                        strokeWidth: 1.6
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 108,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 72,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                className: "ps-pool",
                children: [
                    pool.copingPath ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                className: "ps-morph",
                                d: pool.copingPath,
                                fill: "#0e1c20",
                                opacity: 0.16,
                                transform: "translate(2.2 2.6)"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 117,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                className: "ps-morph",
                                d: pool.copingPath,
                                fill: "none",
                                stroke: "#1d2a2c",
                                strokeOpacity: 0.3,
                                strokeWidth: 2.4,
                                strokeLinejoin: "miter"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 118,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        className: "ps-morph",
                        d: pool.path,
                        fill: "none",
                        stroke: "#1d2a2c",
                        strokeOpacity: 0.28,
                        strokeWidth: 2 * c + 3,
                        strokeLinejoin: "round"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 121,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Crossfade"], {
                        k: keys.coping,
                        children: (k)=>{
                            const id = `${uid}-coping-${k}`;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                                            id: id,
                                            texture: k
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/water.tsx",
                                            lineNumber: 129,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 128,
                                        columnNumber: 17
                                    }, this),
                                    pool.copingPath ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        className: "ps-morph",
                                        d: pool.copingPath,
                                        fill: `url(#${id})`
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 132,
                                        columnNumber: 19
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                        className: "ps-morph",
                                        d: pool.path,
                                        fill: "none",
                                        stroke: `url(#${id})`,
                                        strokeWidth: 2 * c,
                                        strokeLinejoin: "round"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 134,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true);
                        }
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 123,
                        columnNumber: 9
                    }, this),
                    pool.copingJoints ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        className: "ps-morph",
                        d: pool.copingJoints,
                        fill: "none",
                        stroke: "#5d584f",
                        strokeOpacity: 0.4,
                        strokeWidth: 0.9
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 141,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        className: "ps-morph",
                        d: pool.path,
                        fill: "none",
                        stroke: "#5d584f",
                        strokeOpacity: 0.35,
                        strokeWidth: 2 * c,
                        strokeDasharray: `0.9 ${r1(2 * FT - 0.9)}`,
                        strokeLinejoin: "round"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 143,
                        columnNumber: 11
                    }, this),
                    pool.copingPath ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        className: "ps-morph",
                        d: pool.copingPath,
                        fill: "none",
                        stroke: "#ffffff",
                        strokeOpacity: 0.35,
                        strokeWidth: 1
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 155,
                        columnNumber: 28
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                        clipPath: `url(#${waterClip})`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Crossfade"], {
                                k: keys.water,
                                children: (k)=>{
                                    const look = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["waterLook"])(k === 'default' ? null : k);
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Water, {
                                        uid: uid,
                                        k: k,
                                        look: look,
                                        fillBox: fillBox,
                                        box: box
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/water.tsx",
                                        lineNumber: 162,
                                        columnNumber: 22
                                    }, this);
                                }
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 159,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                className: "ps-morph",
                                d: `${pool.path}${shadowShift}`,
                                fillRule: "evenodd",
                                fill: "#04374a",
                                opacity: 0.26
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 166,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                className: "ps-morph",
                                d: pool.path,
                                fill: "none",
                                stroke: "#06485e",
                                strokeOpacity: 0.12,
                                strokeWidth: 30
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 167,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                className: "ps-morph",
                                d: pool.path,
                                fill: "none",
                                stroke: "#06485e",
                                strokeOpacity: 0.14,
                                strokeWidth: 12
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 168,
                                columnNumber: 11
                            }, this),
                            layout.baja ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(BajaShelf, {
                                uid: uid,
                                layout: layout
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 169,
                                columnNumber: 26
                            }, this) : null,
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Caustics, {
                                uid: uid,
                                box: box,
                                night: night
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 170,
                                columnNumber: 11
                            }, this),
                            night ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Surface, {
                                uid: uid,
                                box: box
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 171,
                                columnNumber: 27
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 158,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                        clipPath: `url(#${waterClip})`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                className: "ps-morph",
                                d: pool.path,
                                fill: "none",
                                stroke: "#062c38",
                                strokeOpacity: 0.35,
                                strokeWidth: 2 * pool.tile + 3.5
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 176,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Crossfade"], {
                                k: keys.tile,
                                children: (k)=>{
                                    const id = `${uid}-tile-${k}`;
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                                                    id: id,
                                                    texture: k
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/scene/water.tsx",
                                                    lineNumber: 183,
                                                    columnNumber: 21
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/scene/water.tsx",
                                                lineNumber: 182,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                className: "ps-morph",
                                                d: pool.path,
                                                fill: "none",
                                                stroke: `url(#${id})`,
                                                strokeWidth: 2 * pool.tile
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/scene/water.tsx",
                                                lineNumber: 185,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true);
                                }
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 177,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 175,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        className: "ps-morph",
                        d: pool.path,
                        fill: "none",
                        stroke: "#ffffff",
                        strokeOpacity: 0.55,
                        strokeWidth: 1.2
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 191,
                        columnNumber: 9
                    }, this),
                    layout.spa ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Spa, {
                        uid: uid,
                        spa: layout.spa,
                        scene: scene,
                        night: night
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 193,
                        columnNumber: 23
                    }, this) : null,
                    layout.lights.map((p, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: p.x,
                                    cy: p.y,
                                    r: 3.6,
                                    fill: "#e9f3f4",
                                    stroke: "#7d9aa1",
                                    strokeWidth: 1
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/water.tsx",
                                    lineNumber: 197,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: p.x,
                                    cy: p.y,
                                    r: 1.8,
                                    fill: night ? '#ffffff' : '#c6e4ea'
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/water.tsx",
                                    lineNumber: 198,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, i, true, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 196,
                            columnNumber: 11
                        }, this)),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Bowls, {
                        uid: uid,
                        layout: layout
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 202,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 112,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/water.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
/** Floor texture, finish tint and depth gradient for one finish. */ function Water({ uid, k, look, fillBox, box }) {
    const floor = `${uid}-floor-${k}`;
    const depth = `${uid}-depth-${k}`;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                        id: floor,
                        texture: look.floor
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 215,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                        id: depth,
                        gradientUnits: "userSpaceOnUse",
                        x1: box.x,
                        y1: box.y,
                        x2: box.x + box.w,
                        y2: box.y + box.h * 0.3,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffffff",
                                stopOpacity: 0.2
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 217,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.32",
                                stopColor: "#ffffff",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 218,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.62",
                                stopColor: look.deep,
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 219,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: look.deep,
                                stopOpacity: 0.5
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 220,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 216,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 214,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                ...fillBox,
                fill: `url(#${floor})`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 223,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                ...fillBox,
                fill: look.tint,
                opacity: look.tintOpacity
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 224,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                ...fillBox,
                fill: `url(#${depth})`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 225,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
/**
 * Two caustic layers drifting slowly in different directions (CSS; paused
 * off screen and while typing, one layer only on touch screens, off under
 * reduced motion). The texture is white light in its alpha channel, so it
 * needs no blend mode (blend modes make every frame far more expensive to paint).
 */ function Caustics({ uid, box, night }) {
    const t = CAUSTICS.t;
    const pad = 2 * t;
    const rect = {
        x: box.x - pad,
        y: box.y - pad,
        width: box.w + 2 * pad,
        height: box.h + 2 * pad
    };
    const image = !!__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$textures$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TEXTURES"].water_caustics.src;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        opacity: night ? 0.16 : image ? 0.5 : 0.3,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                        id: `${uid}-ca`,
                        texture: "water_caustics"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 244,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                        id: `${uid}-cb`,
                        texture: "water_caustics",
                        transform: `rotate(${CAUSTICS.deg}) scale(${CAUSTICS.k})`
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 245,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 243,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                className: "ps-caustic-a",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    ...rect,
                    fill: `url(#${uid}-ca)`
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 248,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 247,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                className: "ps-caustic-b",
                opacity: 0.55,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    ...rect,
                    fill: `url(#${uid}-cb)`
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 251,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 250,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/water.tsx",
        lineNumber: 242,
        columnNumber: 5
    }, this);
}
/** Surface: sky reflection, wind ripples and a sun glint (daytime only). */ function Surface({ uid, box }) {
    const rand = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rng"])(Math.round(box.w * 7 + box.h));
    const n = Math.round(Math.min(46, Math.max(14, box.w * box.h / 1500)));
    const light = [];
    const dark = [];
    for(let i = 0; i < n; i++){
        const x = box.x + rand() * box.w;
        const y = box.y + rand() * box.h;
        const len = 6 + rand() * 12;
        light.push(`M${r1(x)} ${r1(y)}q${r1(len / 2)} ${r1(-2 - rand() * 2)} ${r1(len)} 0`);
        dark.push(`M${r1(x + 1)} ${r1(y + 2)}q${r1(len / 2)} -1.5 ${r1(len)} 0`);
    }
    const gx = box.x + box.w * 0.74;
    const gy = box.y + box.h * 0.3;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-sky`,
                        gradientUnits: "userSpaceOnUse",
                        cx: box.x + box.w * 0.25,
                        cy: box.y + box.h * 0.2,
                        r: Math.max(box.w, box.h) * 0.7,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffffff",
                                stopOpacity: 0.16
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 276,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#ffffff",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 277,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 275,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-glint`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffffff",
                                stopOpacity: 0.55
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 280,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#ffffff",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 281,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 279,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 274,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: box.x,
                y: box.y,
                width: box.w,
                height: box.h,
                fill: `url(#${uid}-sky)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 284,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: dark.join(''),
                stroke: "#05465a",
                strokeOpacity: 0.12,
                strokeWidth: 1.2,
                fill: "none",
                strokeLinecap: "round"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 285,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: light.join(''),
                stroke: "#ffffff",
                strokeOpacity: 0.32,
                strokeWidth: 1.1,
                fill: "none",
                strokeLinecap: "round"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 286,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: gx,
                cy: gy,
                rx: 22,
                ry: 12,
                fill: `url(#${uid}-glint)`,
                transform: `rotate(-18 ${r1(gx)} ${r1(gy)})`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 287,
                columnNumber: 7
            }, this),
            [
                0,
                1,
                2,
                3,
                4
            ].map((i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                    cx: gx - 10 + i * 5,
                    cy: gy + Math.sin(i * 1.7) * 4,
                    rx: 2.6,
                    ry: 0.9,
                    fill: "#ffffff",
                    opacity: 0.75,
                    transform: `rotate(-18 ${r1(gx)} ${r1(gy)})`
                }, i, false, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 289,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/water.tsx",
        lineNumber: 273,
        columnNumber: 5
    }, this);
}
function BajaShelf({ uid, layout }) {
    const baja = layout.baja;
    const b = baja.box;
    const sh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cast"])(0.8);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                    id: `${uid}-baja`,
                    gradientUnits: "userSpaceOnUse",
                    x1: b.x,
                    y1: 0,
                    x2: baja.edgeX,
                    y2: 0,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                            offset: "0",
                            stopColor: "#ffffff",
                            stopOpacity: 0.36
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 303,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                            offset: "1",
                            stopColor: "#ffffff",
                            stopOpacity: 0.22
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 304,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 302,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 301,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                className: "ps-morph",
                x: b.x - 30,
                y: b.y - 30,
                width: b.w + 30,
                height: b.h + 60,
                fill: `url(#${uid}-baja)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 307,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                className: "ps-morph",
                x: baja.edgeX,
                y: b.y - 30,
                width: 7,
                height: b.h + 60,
                fill: "#043a4d",
                opacity: 0.2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 309,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                className: "ps-morph",
                x: baja.edgeX - 1.6,
                y: b.y - 30,
                width: 1.6,
                height: b.h + 60,
                fill: "#ffffff",
                opacity: 0.55
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 310,
                columnNumber: 7
            }, this),
            baja.loungers.map((l, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: l.x + sh.dx,
                            y: l.y + sh.dy,
                            width: l.w,
                            height: l.h,
                            rx: l.h / 2,
                            fill: "#04394b",
                            opacity: 0.25
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 313,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            className: "ps-move",
                            style: {
                                transform: `translate(${r1(l.x)}px, ${r1(l.y)}px)`
                            },
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["ShelfLounger"], {
                                w: l.w,
                                h: l.h
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 315,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 314,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: l.x,
                            y: l.y + l.h * 0.15,
                            width: l.w,
                            height: l.h * 0.7,
                            rx: l.h / 3,
                            fill: "#5fd6e4",
                            opacity: 0.12
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 318,
                            columnNumber: 11
                        }, this)
                    ]
                }, i, true, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 312,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/water.tsx",
        lineNumber: 300,
        columnNumber: 5
    }, this);
}
function Spa({ uid, spa, scene, night }) {
    const b = spa.box;
    const rim = Math.max(5, Math.min(b.w * 0.13, 1.1 * FT));
    const look = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["waterLook"])(scene.surface);
    const sh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cast"])(1.6);
    const floor = `${uid}-spa-floor`;
    const tile = `${uid}-spa-tile`;
    const cap = `${uid}-spa-cap`;
    const round = spa.shape === 'round';
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const R = b.w / 2;
    const inner = {
        x: b.x + rim,
        y: b.y + rim,
        w: b.w - 2 * rim,
        h: b.h - 2 * rim
    };
    const shape = (inset, props)=>round ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
            cx: cx,
            cy: cy,
            r: Math.max(1, R - inset),
            ...props
        }, void 0, false, {
            fileName: "[project]/components/estimator/scene/water.tsx",
            lineNumber: 340,
            columnNumber: 7
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
            x: b.x + inset,
            y: b.y + inset,
            width: Math.max(1, b.w - 2 * inset),
            height: Math.max(1, b.h - 2 * inset),
            rx: Math.max(1.5, 3 - inset * 0.1),
            ...props
        }, void 0, false, {
            fileName: "[project]/components/estimator/scene/water.tsx",
            lineNumber: 342,
            columnNumber: 7
        }, this);
    const rand = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rng"])(Math.round(b.x + b.y));
    const jets = Array.from({
        length: 9
    }, ()=>{
        const a = rand() * Math.PI * 2;
        const d = Math.min(inner.w, inner.h) / 2 * (0.55 + rand() * 0.3);
        return {
            x: cx + Math.cos(a) * d,
            y: cy + Math.sin(a) * d,
            r: 1 + rand() * 2
        };
    });
    const s = spa.spill;
    const sheet = 1.3 * FT;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                        id: floor,
                        texture: look.floor
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 355,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                        id: tile,
                        texture: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["tileTexture"])(scene.tile)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 356,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                        id: cap,
                        texture: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["copingTexture"])(scene.coping)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 357,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-spa-glow`,
                        gradientUnits: "userSpaceOnUse",
                        cx: cx - R * 0.2,
                        cy: cy - R * 0.2,
                        r: R,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffffff",
                                stopOpacity: night ? 0 : 0.28
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 359,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#ffffff",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 360,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 358,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 354,
                columnNumber: 7
            }, this),
            round ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: cx + sh.dx,
                cy: cy + sh.dy,
                r: R,
                fill: "#062f3c",
                opacity: 0.3
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 365,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: b.x + sh.dx,
                y: b.y + sh.dy,
                width: b.w,
                height: b.h,
                rx: 3,
                fill: "#062f3c",
                opacity: 0.3
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 367,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SpillSheet, {
                uid: uid,
                spa: spa,
                len: sheet
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 370,
                columnNumber: 7
            }, this),
            shape(0, {
                fill: `url(#${cap})`
            }),
            shape(0, {
                fill: 'none',
                stroke: '#ffffff',
                strokeOpacity: 0.4,
                strokeWidth: 1
            }),
            shape(rim * 0.58, {
                fill: '#2b363c'
            }),
            shape(rim * 0.8, {
                fill: '#3a464c',
                opacity: 0.9
            }),
            shape(rim, {
                fill: `url(#${floor})`
            }),
            shape(rim, {
                fill: look.tint,
                opacity: look.tintOpacity * 0.85
            }),
            shape(rim, {
                fill: 'none',
                stroke: `url(#${tile})`,
                strokeWidth: 5
            }),
            shape(rim + 0.95 * FT, {
                fill: 'none',
                stroke: '#ffffff',
                strokeOpacity: 0.14,
                strokeWidth: 0.9 * FT
            }),
            shape(rim, {
                fill: `url(#${uid}-spa-glow)`
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                fill: "#ffffff",
                opacity: 0.6,
                children: jets.map((j, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: r1(j.x),
                        cy: r1(j.y),
                        r: r1(j.r)
                    }, i, false, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 383,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 381,
                columnNumber: 7
            }, this),
            s.side === 'left' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: b.x - 0.5,
                y: s.y1,
                width: rim + 1,
                height: s.y2 - s.y1,
                fill: "#d8d3c8"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 388,
                columnNumber: 9
            }, this) : round ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${r1(s.x1)} ${r1(s.y1)}Q${r1(cx)} ${r1(b.y + b.h + 2)} ${r1(s.x2)} ${r1(s.y2)}`,
                stroke: "#d8d3c8",
                strokeWidth: rim * 0.9,
                fill: "none"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 390,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: s.x1,
                y: b.y + b.h - rim - 0.5,
                width: s.x2 - s.x1,
                height: rim + 1,
                fill: "#d8d3c8"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 392,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/water.tsx",
        lineNumber: 353,
        columnNumber: 5
    }, this);
}
function SpillSheet({ uid, spa, len }) {
    const s = spa.spill;
    const id = `${uid}-spill`;
    const left = s.side === 'left';
    const x = left ? s.x1 - len : s.x1;
    const y = left ? s.y1 : spa.shape === 'round' ? s.y1 - 2 : s.y1;
    const w = left ? len : s.x2 - s.x1;
    const h = left ? s.y2 - s.y1 : len;
    const streaks = [];
    for(let i = 1; i < 6; i++){
        streaks.push(left ? `M${r1(x + len)} ${r1(y + h * i / 6)}h${r1(-len * 0.8)}` : `M${r1(x + w * i / 6)} ${r1(y)}v${r1(len * 0.8)}`);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                    id: id,
                    x1: left ? 1 : 0,
                    y1: 0,
                    x2: 0,
                    y2: left ? 0 : 1,
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                            offset: "0",
                            stopColor: "#ffffff",
                            stopOpacity: 0.85
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 414,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                            offset: "0.5",
                            stopColor: "#e6fbff",
                            stopOpacity: 0.45
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 415,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                            offset: "1",
                            stopColor: "#ffffff",
                            stopOpacity: 0
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 416,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 413,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 412,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: x,
                y: y,
                width: w,
                height: h,
                fill: `url(#${id})`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 419,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: streaks.join(''),
                stroke: "#ffffff",
                strokeOpacity: 0.5,
                strokeWidth: 0.8
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 420,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/water.tsx",
        lineNumber: 411,
        columnNumber: 5
    }, this);
}
/** An existing, weathered slab: a few stains and hairline cracks, so a new deck visibly upgrades it. */ function ExistingWear({ deck, seed, clip }) {
    const rand = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rng"])(seed);
    const stains = Array.from({
        length: 7
    }, ()=>({
            x: deck.x + rand() * deck.w,
            y: deck.y + rand() * deck.h,
            rx: 2 * FT + rand() * 4 * FT,
            ry: 1.5 * FT + rand() * 3 * FT
        }));
    const cracks = [];
    for(let i = 0; i < 4; i++){
        let x = deck.x + rand() * deck.w;
        let y = deck.y + rand() * deck.h;
        let d = `M${r1(x)} ${r1(y)}`;
        for(let j = 0; j < 5; j++){
            x += (rand() - 0.3) * 1.6 * FT;
            y += (rand() - 0.5) * 1.2 * FT;
            d += `L${r1(x)} ${r1(y)}`;
        }
        cracks.push(d);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        clipPath: `url(#${clip})`,
        children: [
            stains.map((st, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                    cx: r1(st.x),
                    cy: r1(st.y),
                    rx: r1(st.rx),
                    ry: r1(st.ry),
                    fill: "#5f574a",
                    opacity: 0.07
                }, i, false, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 449,
                    columnNumber: 9
                }, this)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: cracks.join(''),
                fill: "none",
                stroke: "#4a443b",
                strokeOpacity: 0.3,
                strokeWidth: 0.7
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 451,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/water.tsx",
        lineNumber: 447,
        columnNumber: 5
    }, this);
}
/**
 * Fire and water bowls standing on square stucco pedestals at the pool's edge
 * (like the Pool Masters jobs), each casting a shadow down and to the right.
 * Water bowls pour a sheet into the pool; fire bowls warm the coping around them.
 */ function Bowls({ uid, layout }) {
    if (!layout.bowls.length) return null;
    const sh = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cast"])(3.2);
    const side = (b)=>b.r * 2.12;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                        id: `${uid}-sheet`,
                        x1: "0",
                        y1: "0",
                        x2: "0",
                        y2: "1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffffff",
                                stopOpacity: 0.95
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 469,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.55",
                                stopColor: "#e9fbff",
                                stopOpacity: 0.7
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 470,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#ffffff",
                                stopOpacity: 0.25
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 471,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 468,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-firewarm`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffb35c",
                                stopOpacity: 0.22
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 474,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#ffb35c",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 475,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/water.tsx",
                        lineNumber: 473,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/water.tsx",
                lineNumber: 467,
                columnNumber: 7
            }, this),
            layout.bowls.map((b, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    x: b.cx - side(b) / 2 + sh.dx,
                    y: b.cy - side(b) / 2 + sh.dy,
                    width: side(b),
                    height: side(b),
                    rx: 1.5,
                    fill: "#0b2129",
                    opacity: 0.28
                }, `s${i}`, false, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 479,
                    columnNumber: 9
                }, this)),
            layout.bowls.map((b, i)=>b.kind === 'fire' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: b.cx,
                    cy: b.cy,
                    r: b.r * 2.4,
                    fill: `url(#${uid}-firewarm)`
                }, `f${i}`, false, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 482,
                    columnNumber: 29
                }, this) : null),
            layout.bowls.map((b, i)=>{
                if (!b.spillTo) return null;
                const top = b.cy + b.r * 0.7;
                const lip = b.r * 0.28;
                const foot = b.r * 0.42;
                const { x, y } = b.spillTo;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: `M${r1(b.cx - lip)} ${r1(top)}L${r1(b.cx + lip)} ${r1(top)}L${r1(x + foot)} ${r1(y)}L${r1(x - foot)} ${r1(y)}Z`,
                            fill: `url(#${uid}-sheet)`
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 492,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: `M${r1(b.cx)} ${r1(top)}L${r1(x)} ${r1(y)}`,
                            stroke: "#bdf1f7",
                            strokeOpacity: 0.8,
                            strokeWidth: 1.1
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 493,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                            cx: x,
                            cy: y,
                            rx: foot * 1.4,
                            ry: foot * 0.8,
                            fill: "#ffffff",
                            opacity: 0.55
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 494,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                            cx: x,
                            cy: y + 1,
                            rx: foot * 2.4,
                            ry: foot * 1.4,
                            fill: "none",
                            stroke: "#ffffff",
                            strokeOpacity: 0.4,
                            strokeWidth: 1.2
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 495,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                            cx: x,
                            cy: y + 2,
                            rx: foot * 3.6,
                            ry: foot * 2.1,
                            fill: "none",
                            stroke: "#ffffff",
                            strokeOpacity: 0.18,
                            strokeWidth: 1
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 496,
                            columnNumber: 13
                        }, this)
                    ]
                }, `w${i}`, true, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 491,
                    columnNumber: 11
                }, this);
            }),
            layout.bowls.map((b, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    className: "ps-move",
                    style: {
                        transform: `translate(${r1(b.cx - b.r)}px, ${r1(b.cy - b.r)}px)`
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: b.r - side(b) / 2,
                            y: b.r - side(b) / 2,
                            width: side(b),
                            height: side(b),
                            rx: 1.5,
                            fill: "#d8d2c6"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 503,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: `M${r1(b.r - side(b) / 2 + 0.8)} ${r1(b.r + side(b) / 2 - 1)}V${r1(b.r - side(b) / 2 + 0.8)}H${r1(b.r + side(b) / 2 - 1)}`,
                            fill: "none",
                            stroke: "#ffffff",
                            strokeOpacity: 0.7,
                            strokeWidth: 1.2
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 504,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: b.r - side(b) / 2,
                            y: b.r - side(b) / 2,
                            width: side(b),
                            height: side(b),
                            rx: 1.5,
                            fill: "none",
                            stroke: "#3a3328",
                            strokeOpacity: 0.3,
                            strokeWidth: 0.9
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 505,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            transform: `translate(${r1(b.r * 0.06)} ${r1(b.r * 0.06)}) scale(0.94)`,
                            children: b.kind === 'fire' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FireBowl"], {
                                r: b.r
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 506,
                                columnNumber: 108
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WaterBowl"], {
                                r: b.r
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/water.tsx",
                                lineNumber: 506,
                                columnNumber: 131
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/water.tsx",
                            lineNumber: 506,
                            columnNumber: 11
                        }, this)
                    ]
                }, `b${i}`, true, {
                    fileName: "[project]/components/estimator/scene/water.tsx",
                    lineNumber: 501,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/water.tsx",
        lineNumber: 466,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/scene/highlights.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "HIGHLIGHT_CSS",
    ()=>HIGHLIGHT_CSS,
    "SceneHighlights",
    ()=>SceneHighlights
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$highlights$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/highlights.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$water$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/water.tsx [app-ssr] (ecmascript)");
;
;
;
;
const HIGHLIGHT_CSS = `
.ps-hl *{transform-box:fill-box;transform-origin:center}
.ps-hl-wash{opacity:0;animation:ps-hl-wash 520ms ease-out both}
@keyframes ps-hl-wash{0%{opacity:0}30%{opacity:.32}100%{opacity:0}}
.ps-hl-sweep{opacity:0;animation:ps-hl-sweep 520ms cubic-bezier(.45,.05,.35,1) both}
@keyframes ps-hl-sweep{0%{opacity:0;transform:translateX(0)}18%{opacity:1}82%{opacity:1}100%{opacity:0;transform:translateX(200%)}}
.ps-hl-ring{opacity:0;animation:ps-hl-ring 560ms cubic-bezier(.22,.8,.24,1) both}
@keyframes ps-hl-ring{0%{opacity:.9;transform:scale(.1)}100%{opacity:0;transform:none}}
.ps-hl-edge{opacity:0;animation:ps-hl-edge 520ms ease-out both}
@keyframes ps-hl-edge{0%{opacity:0}30%{opacity:1}100%{opacity:0}}
.ps-hl-glow{opacity:0;animation:ps-hl-glow 520ms ease-out both}
@keyframes ps-hl-glow{0%{opacity:0;transform:scale(.3)}35%{opacity:.85}100%{opacity:0;transform:scale(1.25)}}
.ps-hl-star{opacity:0;animation:ps-hl-star 480ms cubic-bezier(.22,.8,.24,1) both}
@keyframes ps-hl-star{0%{opacity:0;transform:scale(0) rotate(0deg)}40%{opacity:1;transform:scale(1.1) rotate(25deg)}100%{opacity:0;transform:scale(.4) rotate(70deg)}}
.ps-hl-ping{opacity:0;animation:ps-hl-ping 560ms cubic-bezier(.22,.8,.24,1) both}
@keyframes ps-hl-ping{0%{opacity:0;transform:scale(.55)}20%{opacity:1}100%{opacity:0;transform:scale(1.5)}}
@media (prefers-reduced-motion:reduce){.ps-hl{display:none}}
`;
const r1 = (n)=>Math.round(n * 10) / 10;
/** Start offsets stay small so every highlight ends inside HIGHLIGHT_MS (the longest runs 560 ms). */ const delay = (ms)=>({
        animationDelay: `${Math.min(ms, 130)}ms`
    });
/** Four-pointed glint, centred on 0,0. */ function starPath(r) {
    const k = r * 0.16;
    return `M0 ${-r}C${k} ${-k} ${k} ${-k} ${r} 0C${k} ${k} ${k} ${k} 0 ${r}C${-k} ${k} ${-k} ${k} ${-r} 0C${-k} ${-k} ${-k} ${-k} 0 ${-r}Z`;
}
/** A quick lift of the whole area, plus a band of light crossing it (draw inside the area's mask). */ function Sweep({ id, box, at }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                className: "ps-hl-wash",
                style: delay(at),
                x: r1(box.x),
                y: r1(box.y),
                width: r1(box.w),
                height: r1(box.h),
                fill: "#fff"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/highlights.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                className: "ps-hl-sweep",
                style: delay(at),
                x: r1(box.x - box.w),
                y: r1(box.y),
                width: r1(box.w),
                height: r1(box.h),
                fill: `url(#${id})`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/highlights.tsx",
                lineNumber: 54,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
function SceneHighlights({ uid, layout, items }) {
    if (items.length === 0) return null;
    const { pool, deck } = layout;
    const band = `${uid}-hl-band`;
    const ringR = Math.max(pool.box.w, pool.box.h) * 0.42;
    const cx = pool.box.x + pool.box.w / 2;
    const cy = pool.box.y + pool.box.h / 2;
    // The coping as a shape: the slab outline (or the band around a freeform pool) minus the water.
    const copingShape = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            pool.copingPath ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: pool.copingPath,
                fill: "#fff"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/highlights.tsx",
                lineNumber: 70,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: pool.path,
                fill: "#fff",
                stroke: "#fff",
                strokeWidth: 2 * pool.coping,
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/highlights.tsx",
                lineNumber: 72,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: pool.path,
                fill: "#000"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/highlights.tsx",
                lineNumber: 74,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        className: "ps-hl",
        pointerEvents: "none",
        "data-highlights": items.map((h)=>h.kind === 'sparkle' ? h.target : h.kind).join(' '),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                        id: band,
                        x1: "0",
                        y1: "0",
                        x2: "1",
                        y2: "0.35",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.28",
                                stopColor: "#fff",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                lineNumber: 81,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.5",
                                stopColor: "#fff",
                                stopOpacity: 0.95
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                lineNumber: 82,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.72",
                                stopColor: "#fff",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                lineNumber: 83,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/highlights.tsx",
                        lineNumber: 80,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-hl-glow`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#fff",
                                stopOpacity: 0.9
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                lineNumber: 86,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.45",
                                stopColor: "#fff8e6",
                                stopOpacity: 0.35
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                lineNumber: 87,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#fff",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                lineNumber: 88,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/highlights.tsx",
                        lineNumber: 85,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/highlights.tsx",
                lineNumber: 79,
                columnNumber: 7
            }, this),
            items.map((h, i)=>{
                const at = i * 40;
                switch(h.kind){
                    case 'coping':
                        {
                            const mask = `${uid}-hl-coping`;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("mask", {
                                        id: mask,
                                        maskUnits: "userSpaceOnUse",
                                        x: 0,
                                        y: 0,
                                        width: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].width,
                                        height: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].height,
                                        children: copingShape
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/highlights.tsx",
                                        lineNumber: 98,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                        mask: `url(#${mask})`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Sweep, {
                                            id: band,
                                            box: layout.core,
                                            at: at
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                                            lineNumber: 100,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/highlights.tsx",
                                        lineNumber: 99,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, "coping", true, {
                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                lineNumber: 97,
                                columnNumber: 15
                            }, this);
                        }
                    case 'tile':
                        {
                            const mask = `${uid}-hl-tile`;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                clipPath: `url(#${uid}-water)`,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("mask", {
                                        id: mask,
                                        maskUnits: "userSpaceOnUse",
                                        x: 0,
                                        y: 0,
                                        width: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].width,
                                        height: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].height,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            d: pool.path,
                                            fill: "none",
                                            stroke: "#fff",
                                            strokeWidth: 2 * pool.tile + 2
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                                            lineNumber: 110,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/highlights.tsx",
                                        lineNumber: 109,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                        mask: `url(#${mask})`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Sweep, {
                                            id: band,
                                            box: layout.core,
                                            at: at
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                                            lineNumber: 113,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/highlights.tsx",
                                        lineNumber: 112,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, "tile", true, {
                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                lineNumber: 108,
                                columnNumber: 15
                            }, this);
                        }
                    case 'deck':
                        {
                            const mask = `${uid}-hl-deck`;
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("mask", {
                                        id: mask,
                                        maskUnits: "userSpaceOnUse",
                                        x: 0,
                                        y: 0,
                                        width: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].width,
                                        height: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].height,
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$water$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deckPath"])(deck.box, deck.rx),
                                                fill: "#fff"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                                lineNumber: 123,
                                                columnNumber: 19
                                            }, this),
                                            pool.copingPath ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: pool.copingPath,
                                                fill: "#000"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                                lineNumber: 125,
                                                columnNumber: 21
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: pool.path,
                                                fill: "#000",
                                                stroke: "#000",
                                                strokeWidth: 2 * pool.coping
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                                lineNumber: 127,
                                                columnNumber: 21
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/scene/highlights.tsx",
                                        lineNumber: 122,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                        mask: `url(#${mask})`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Sweep, {
                                            id: band,
                                            box: deck.box,
                                            at: at
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                                            lineNumber: 131,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/highlights.tsx",
                                        lineNumber: 130,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                        className: "ps-hl-edge",
                                        style: delay(at),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$water$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deckPath"])(deck.box, deck.rx, true),
                                                fill: "none",
                                                stroke: "#fff",
                                                strokeOpacity: 0.35,
                                                strokeWidth: 10,
                                                strokeLinejoin: "round"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                                lineNumber: 135,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                d: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$water$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["deckPath"])(deck.box, deck.rx, true),
                                                fill: "none",
                                                stroke: "#fff",
                                                strokeOpacity: 0.95,
                                                strokeWidth: 2.5,
                                                strokeLinejoin: "round"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                                lineNumber: 136,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/components/estimator/scene/highlights.tsx",
                                        lineNumber: 134,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, "deck", true, {
                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                lineNumber: 121,
                                columnNumber: 15
                            }, this);
                        }
                    case 'water':
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            clipPath: `url(#${uid}-water)`,
                            children: [
                                0,
                                1,
                                2
                            ].map((j)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    className: "ps-hl-ring",
                                    style: delay(at + j * 60),
                                    cx: r1(cx),
                                    cy: r1(cy),
                                    r: r1(ringR * (1 - j * 0.18)),
                                    fill: "none",
                                    stroke: "#fff",
                                    strokeOpacity: 0.85,
                                    strokeWidth: 2.5,
                                    // Screen pixels: the ring stays a crisp line while it grows, at any camera zoom.
                                    vectorEffect: "non-scaling-stroke"
                                }, j, false, {
                                    fileName: "[project]/components/estimator/scene/highlights.tsx",
                                    lineNumber: 145,
                                    columnNumber: 19
                                }, this))
                        }, "water", false, {
                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                            lineNumber: 143,
                            columnNumber: 15
                        }, this);
                    case 'pool':
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            className: "ps-hl-edge",
                            style: delay(at),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: pool.path,
                                    fill: "none",
                                    stroke: "#fff",
                                    strokeOpacity: 0.35,
                                    strokeWidth: 10,
                                    strokeLinejoin: "round"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/highlights.tsx",
                                    lineNumber: 165,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                    d: pool.path,
                                    fill: "none",
                                    stroke: "#fff",
                                    strokeOpacity: 0.95,
                                    strokeWidth: 2.5,
                                    strokeLinejoin: "round"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/highlights.tsx",
                                    lineNumber: 166,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, "pool", true, {
                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                            lineNumber: 164,
                            columnNumber: 15
                        }, this);
                    case 'sparkle':
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$highlights$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sparkleSpots"])(layout, h.target).map((p, j)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                    transform: `translate(${r1(p.x)} ${r1(p.y)})`,
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                            className: "ps-hl-glow",
                                            style: delay(at + j * 50),
                                            r: 60,
                                            fill: `url(#${uid}-hl-glow)`
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                                            lineNumber: 174,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                            className: "ps-hl-ping",
                                            style: delay(at + j * 50),
                                            r: 46,
                                            fill: "none",
                                            stroke: "#fff",
                                            strokeOpacity: 0.95,
                                            strokeWidth: 3,
                                            vectorEffect: "non-scaling-stroke"
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                                            lineNumber: 176,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                            className: "ps-hl-star",
                                            style: delay(at + j * 50 + 40),
                                            d: starPath(30),
                                            fill: "#fff"
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                                            lineNumber: 186,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                            transform: "translate(26 -22)",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                className: "ps-hl-star",
                                                style: delay(at + j * 50 + 90),
                                                d: starPath(11),
                                                fill: "#fff"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                                lineNumber: 189,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                                            lineNumber: 188,
                                            columnNumber: 21
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                            transform: "translate(-24 18)",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                                                className: "ps-hl-star",
                                                style: delay(at + j * 50 + 120),
                                                d: starPath(8),
                                                fill: "#fff8e6"
                                            }, void 0, false, {
                                                fileName: "[project]/components/estimator/scene/highlights.tsx",
                                                lineNumber: 192,
                                                columnNumber: 23
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                                            lineNumber: 191,
                                            columnNumber: 21
                                        }, this)
                                    ]
                                }, j, true, {
                                    fileName: "[project]/components/estimator/scene/highlights.tsx",
                                    lineNumber: 173,
                                    columnNumber: 19
                                }, this))
                        }, `sparkle-${h.target}`, false, {
                            fileName: "[project]/components/estimator/scene/highlights.tsx",
                            lineNumber: 171,
                            columnNumber: 15
                        }, this);
                }
            })
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/highlights.tsx",
        lineNumber: 78,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/scene/night.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "NightLayer",
    ()=>NightLayer
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/geometry.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/sprites.tsx [app-ssr] (ecmascript)");
;
;
;
;
/**
 * Dusk: a deep blue wash over the yard, lighter around the pool (its glow
 * lifts the deck, like the night drone photos) and darkest at the walls, then
 * everything that gives off light drawn on top of it: glowing pool water
 * (brighter, with a violet edge, when LED lights are picked), the spa, water
 * bowls lit from below, fire bowls and the fire pit with warm 2700K light
 * pooling on the deck, warm window spill from the house, eave and path
 * lights, and uplit trees. Gradients only, no filters, so it stays cheap.
 */ const FT = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].pxPerFt;
const W = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].width;
const H = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].height;
const r1 = (n)=>Math.round(n * 10) / 10;
function NightLayer({ uid, layout, scene }) {
    const { pool, spa } = layout;
    const box = pool.box;
    const lit = scene.features.lights;
    const glow = lit ? '#5fe6ff' : '#3fb6cc';
    const g = (id)=>`url(#${uid}-n-${id})`;
    const eave = [];
    for(let x = 70; x < W; x += 14 * FT)eave.push(x);
    const fires = layout.bowls.filter((b)=>b.kind === 'fire');
    const pit = layout.objects.find((o)=>o.kind === 'fire_pit');
    const cover = layout.objects.find((o)=>o.kind === 'patio_cover');
    const kitchen = layout.objects.find((o)=>o.kind === 'kitchen');
    const trees = layout.objects.filter((o)=>o.kind === 'olive_tree');
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        pointerEvents: "none",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-n-water`,
                        cx: "0.5",
                        cy: "0.5",
                        r: "0.62",
                        children: lit ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "0",
                                    stopColor: "#c8fdff"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/night.tsx",
                                    lineNumber: 40,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "0.45",
                                    stopColor: "#52def3"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/night.tsx",
                                    lineNumber: 41,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "0.82",
                                    stopColor: "#3b86ef"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/night.tsx",
                                    lineNumber: 42,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "1",
                                    stopColor: "#5a47d4"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/night.tsx",
                                    lineNumber: 43,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "0",
                                    stopColor: "#62d4e2"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/night.tsx",
                                    lineNumber: 47,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "0.6",
                                    stopColor: "#2391b3"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/night.tsx",
                                    lineNumber: 48,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                    offset: "1",
                                    stopColor: "#163f7a"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/night.tsx",
                                    lineNumber: 49,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 37,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-n-led`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffffff",
                                stopOpacity: 0.95
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 54,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.25",
                                stopColor: "#bff8ff",
                                stopOpacity: 0.7
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 55,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#5fe6ff",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 56,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-n-spa`,
                        cx: "0.45",
                        cy: "0.45",
                        r: "0.6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#d4fbff"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 59,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.4",
                                stopColor: lit ? '#7fe3fa' : '#5cc4d8'
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 60,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: lit ? '#3f8fe8' : '#2a86a8'
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 61,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 58,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-n-warm`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffbf5e",
                                stopOpacity: 0.6
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 64,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.45",
                                stopColor: "#ff9a3c",
                                stopOpacity: 0.22
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 65,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#ff9a3c",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 66,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 63,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-n-soft`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffe2a6",
                                stopOpacity: 0.5
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 69,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#ffe2a6",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 70,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 68,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-n-uplight`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffe6b0",
                                stopOpacity: 0.3
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 73,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.5",
                                stopColor: "#ffd890",
                                stopOpacity: 0.1
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 74,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#ffd890",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 75,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 72,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-n-window`,
                        cx: "0.5",
                        cy: "0",
                        r: "1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffcf86",
                                stopOpacity: 0.75
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 78,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.55",
                                stopColor: "#ffcf86",
                                stopOpacity: 0.22
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 79,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#ffcf86",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 80,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 77,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-n-sky`,
                        gradientUnits: "userSpaceOnUse",
                        cx: box.x + box.w / 2,
                        cy: box.y + box.h / 2,
                        r: Math.max(box.w, box.h) * 0.6 + 26 * FT,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#0d1f48",
                                stopOpacity: 0.58
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 83,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.45",
                                stopColor: "#0b1a3d",
                                stopOpacity: 0.7
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 84,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#050c22",
                                stopOpacity: 0.86
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 85,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 82,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-n-hearth`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffb35c",
                                stopOpacity: 0.5
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 88,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.35",
                                stopColor: "#ffb35c",
                                stopOpacity: 0.3
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 89,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#ff9a3c",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 90,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 87,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-n-spill`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#b8f6ff",
                                stopOpacity: 0.75
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 93,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#5fe6ff",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 94,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 92,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 36,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: W,
                height: H,
                fill: g('sky')
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 99,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("clipPath", {
                id: `${uid}-n-yard`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                    x: 0,
                    y: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH,
                    width: W,
                    height: H - __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/night.tsx",
                    lineNumber: 103,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 102,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                clipPath: `url(#${uid}-n-yard)`,
                children: layout.windows.map((w, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                        cx: w.x + w.w / 2,
                        cy: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH,
                        rx: w.w * 0.75,
                        ry: 7 * FT,
                        fill: g('window')
                    }, i, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 107,
                        columnNumber: 11
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 105,
                columnNumber: 7
            }, this),
            eave.map((x)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: x,
                            cy: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH + 6,
                            r: 30,
                            fill: g('soft'),
                            opacity: 0.6
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 112,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: x,
                            cy: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH + 3,
                            r: 1.8,
                            fill: "#fff4d8"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 113,
                            columnNumber: 11
                        }, this)
                    ]
                }, x, true, {
                    fileName: "[project]/components/estimator/scene/night.tsx",
                    lineNumber: 111,
                    columnNumber: 9
                }, this)),
            trees.map((t, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: t.box.x + t.box.w * 0.5,
                    cy: t.box.y + t.box.h * 0.55,
                    r: t.box.w * 0.48,
                    fill: g('uplight')
                }, i, false, {
                    fileName: "[project]/components/estimator/scene/night.tsx",
                    lineNumber: 118,
                    columnNumber: 9
                }, this)),
            cover ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                        cx: cover.box.x + cover.box.w / 2,
                        cy: cover.box.y + cover.box.h / 2,
                        rx: cover.box.w * 0.8,
                        ry: cover.box.h * 0.8,
                        fill: g('hearth'),
                        opacity: 0.8
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 123,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                        cx: cover.box.x + cover.box.w / 2,
                        cy: cover.box.y + cover.box.h / 2,
                        rx: cover.box.w * 0.62,
                        ry: cover.box.h * 0.62,
                        fill: g('soft')
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 124,
                        columnNumber: 11
                    }, this),
                    Array.from({
                        length: 4
                    }, (_, row)=>Array.from({
                            length: 6
                        }, (_, col)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                cx: cover.box.x + cover.box.w * (col + 0.5) / 6,
                                cy: cover.box.y + cover.box.h * (row + 0.5) / 4,
                                r: 1.6,
                                fill: "#fff0c4"
                            }, `${row}-${col}`, false, {
                                fileName: "[project]/components/estimator/scene/night.tsx",
                                lineNumber: 127,
                                columnNumber: 15
                            }, this)))
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 122,
                columnNumber: 9
            }, this) : null,
            kitchen ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                cx: kitchen.variant === 'left' ? kitchen.box.x + kitchen.box.w * 0.6 : kitchen.variant === 'house' ? kitchen.box.x + kitchen.box.w / 2 : kitchen.box.x + kitchen.box.w * 0.4,
                cy: kitchen.box.y + kitchen.box.h / 2,
                rx: kitchen.box.w * 0.9,
                ry: kitchen.box.h * 0.6,
                fill: g('soft'),
                opacity: 0.8
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 139,
                columnNumber: 9
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                className: "ps-morph",
                d: pool.path,
                fill: "none",
                stroke: glow,
                strokeOpacity: lit ? 0.06 : 0.04,
                strokeWidth: 96,
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 150,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                className: "ps-morph",
                d: pool.path,
                fill: "none",
                stroke: glow,
                strokeOpacity: lit ? 0.09 : 0.06,
                strokeWidth: 58,
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 151,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                className: "ps-morph",
                d: pool.path,
                fill: "none",
                stroke: glow,
                strokeOpacity: lit ? 0.14 : 0.09,
                strokeWidth: 30,
                strokeLinejoin: "round"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 152,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                clipPath: `url(#${uid}-water)`,
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        className: "ps-morph",
                        d: pool.path,
                        fill: g('water'),
                        opacity: lit ? 0.92 : 0.8
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 154,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        x: box.x,
                        y: box.y,
                        width: box.w,
                        height: box.h,
                        fill: `url(#${uid}-ca)`,
                        opacity: lit ? 0.22 : 0.12
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 155,
                        columnNumber: 9
                    }, this),
                    layout.baja ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        x: layout.baja.box.x,
                        y: box.y,
                        width: layout.baja.box.w,
                        height: box.h,
                        fill: "#e8feff",
                        opacity: 0.16
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 156,
                        columnNumber: 24
                    }, this) : null,
                    layout.baja?.loungers.map((l, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: l.x,
                            y: l.y,
                            width: l.w,
                            height: l.h,
                            rx: l.h / 2,
                            fill: "#eafcff",
                            opacity: 0.3
                        }, i, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 157,
                            columnNumber: 46
                        }, this)),
                    layout.lights.map((p, i)=>{
                        const r = Math.min(box.h * 0.6, 7 * FT);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                            cx: p.x,
                            cy: p.y - r * 0.25,
                            rx: r,
                            ry: r * 0.8,
                            fill: g('led')
                        }, i, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 160,
                            columnNumber: 18
                        }, this);
                    }),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        className: "ps-morph",
                        d: pool.path,
                        fill: "none",
                        stroke: "#ffffff",
                        strokeOpacity: lit ? 0.35 : 0.2,
                        strokeWidth: 3
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 162,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 153,
                columnNumber: 7
            }, this),
            spa ? spa.shape === 'round' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: spa.box.x + spa.box.w / 2,
                cy: spa.box.y + spa.box.h / 2,
                r: spa.box.w / 2 - Math.min(spa.box.w * 0.13, 1.1 * FT),
                fill: g('spa'),
                opacity: 0.82
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 166,
                columnNumber: 11
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: spa.box.x + Math.min(spa.box.w * 0.13, 1.1 * FT),
                y: spa.box.y + Math.min(spa.box.w * 0.13, 1.1 * FT),
                width: spa.box.w - 2 * Math.min(spa.box.w * 0.13, 1.1 * FT),
                height: spa.box.h - 2 * Math.min(spa.box.w * 0.13, 1.1 * FT),
                rx: 2,
                fill: g('spa'),
                opacity: 0.82
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 168,
                columnNumber: 11
            }, this) : null,
            layout.lights.map((p, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                    cx: p.x,
                    cy: p.y,
                    r: 2.4,
                    fill: "#ffffff"
                }, i, false, {
                    fileName: "[project]/components/estimator/scene/night.tsx",
                    lineNumber: 180,
                    columnNumber: 9
                }, this)),
            layout.bowls.map((b, i)=>b.spillTo ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: b.cx,
                            cy: b.cy,
                            r: b.r * 0.75,
                            fill: g('spill')
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 187,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                            cx: b.spillTo.x,
                            cy: b.spillTo.y,
                            rx: b.r * 1.3,
                            ry: b.r * 0.8,
                            fill: g('spill')
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 188,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: `M${r1(b.cx)} ${r1(b.cy + b.r * 0.7)}L${r1(b.spillTo.x)} ${r1(b.spillTo.y)}`,
                            stroke: "#c8fbff",
                            strokeOpacity: 0.7,
                            strokeWidth: b.r * 0.4,
                            strokeLinecap: "round"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 189,
                            columnNumber: 13
                        }, this)
                    ]
                }, `w${i}`, true, {
                    fileName: "[project]/components/estimator/scene/night.tsx",
                    lineNumber: 186,
                    columnNumber: 11
                }, this) : null),
            fires.map((b, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: b.cx,
                            cy: b.cy,
                            r: 7 * FT,
                            fill: g('hearth')
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 197,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: b.cx,
                            cy: b.cy,
                            r: 3 * FT,
                            fill: g('warm')
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 198,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Flame"], {
                            cx: b.cx,
                            cy: b.cy,
                            r: b.r * 0.58
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 199,
                            columnNumber: 11
                        }, this)
                    ]
                }, i, true, {
                    fileName: "[project]/components/estimator/scene/night.tsx",
                    lineNumber: 196,
                    columnNumber: 9
                }, this)),
            pit ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: pit.box.x + pit.box.w / 2,
                        cy: pit.box.y + pit.box.h / 2,
                        r: pit.box.w * 0.85,
                        fill: g('hearth')
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 204,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                        cx: pit.box.x + pit.box.w / 2,
                        cy: pit.box.y + pit.box.h / 2,
                        r: pit.box.w * 0.45,
                        fill: g('warm')
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 205,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Flame"], {
                        cx: pit.box.x + pit.box.w / 2,
                        cy: pit.box.y + pit.box.h / 2,
                        r: Math.min(2.4 * FT, pit.box.w * 0.19) * 0.55
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/night.tsx",
                        lineNumber: 206,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/night.tsx",
                lineNumber: 203,
                columnNumber: 9
            }, this) : null,
            layout.pathLights.map((p, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: r1(p.x),
                            cy: r1(p.y),
                            r: 16,
                            fill: g('soft')
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 213,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: r1(p.x),
                            cy: r1(p.y),
                            r: 1.8,
                            fill: "#fff6dc"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/night.tsx",
                            lineNumber: 214,
                            columnNumber: 11
                        }, this)
                    ]
                }, i, true, {
                    fileName: "[project]/components/estimator/scene/night.tsx",
                    lineNumber: 212,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/night.tsx",
        lineNumber: 35,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/scene/yard.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DaylightPass",
    ()=>DaylightPass,
    "Ground",
    ()=>Ground,
    "GroundDefs",
    ()=>GroundDefs,
    "House",
    ()=>House,
    "Objects",
    ()=>Objects,
    "Shadows",
    ()=>Shadows
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/geometry.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/crossfade.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/sprites.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/textures.tsx [app-ssr] (ecmascript)");
;
;
;
;
;
;
/**
 * The yard around the pool: neighbours' ground, lawn or turf, landscape strips,
 * the block wall, the walk along the house and the path to the deck (Ground);
 * object shadows (Shadows); free-standing objects (Objects); the house roof
 * (House); and the final light pass that makes it read like a drone photo.
 */ const FT = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].pxPerFt;
const W = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].width;
const H = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].height;
const r1 = (n)=>Math.round(n * 10) / 10;
const right = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].x + __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].w;
const bottom = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].y + __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].h;
function Ground({ uid, layout, scene, groundKey }) {
    const turf = scene.extras.turfPlanting;
    const walkBottom = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH + __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].walkH;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: W,
                height: H,
                fill: `url(#${uid}-neighbour)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 41,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Crossfade"], {
                k: groundKey,
                children: (k)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                        x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].x,
                        y: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].y,
                        width: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].w,
                        height: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].h,
                        fill: `url(#${uid}-${k === 'turf' ? 'turf' : 'grass'})`
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/yard.tsx",
                        lineNumber: 43,
                        columnNumber: 17
                    }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 42,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(LawnVariation, {
                uid: uid
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 45,
                columnNumber: 7
            }, this),
            layout.beds.map((b, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Bed"], {
                    x: b.x,
                    y: b.y,
                    w: b.w,
                    h: b.h,
                    kind: turf ? 'planted' : 'hedge',
                    seed: i * 31 + 7,
                    bedFill: `url(#${uid}-bed)`
                }, `${i}-${turf}`, false, {
                    fileName: "[project]/components/estimator/scene/yard.tsx",
                    lineNumber: 47,
                    columnNumber: 9
                }, this)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].x,
                y: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH,
                width: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].w,
                height: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].walkH,
                fill: `url(#${uid}-walk)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 50,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].x,
                y: walkBottom - 1.2,
                width: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].w,
                height: 1.2,
                fill: "#000",
                opacity: 0.12
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this),
            layout.path ? layout.path.rects.map((r, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: r.x + 1.5,
                            y: r.y + 1.5,
                            width: r.w,
                            height: r.h,
                            fill: "#000",
                            opacity: 0.12
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/yard.tsx",
                            lineNumber: 55,
                            columnNumber: 15
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: r.x,
                            y: r.y,
                            width: r.w,
                            height: r.h,
                            fill: layout.path.kind === 'pavers' ? `url(#${uid}-paver)` : `url(#${uid}-walk)`
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/yard.tsx",
                            lineNumber: 56,
                            columnNumber: 15
                        }, this)
                    ]
                }, i, true, {
                    fileName: "[project]/components/estimator/scene/yard.tsx",
                    lineNumber: 54,
                    columnNumber: 13
                }, this)) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].x,
                y: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH,
                width: 1.6 * FT,
                height: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].h,
                fill: "#0d1d22",
                opacity: 0.2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 61,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].edge,
                y: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH,
                width: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].wall,
                height: H - __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH - __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].edge,
                fill: "#d7ccb6"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 62,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: right,
                y: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH,
                width: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].wall,
                height: H - __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH - __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].edge,
                fill: "#d7ccb6"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 63,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].edge,
                y: bottom,
                width: W - 2 * __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].edge,
                height: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].wall,
                fill: "#d7ccb6"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 64,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: right + __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].wall,
                y: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH,
                width: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].edge,
                height: H,
                fill: "#0d1d22",
                opacity: 0.18
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 65,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 0,
                y: bottom + __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].wall,
                width: W,
                height: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].edge,
                fill: "#0d1d22",
                opacity: 0.18
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 66,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].edge + 0.5} ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH}V${bottom + __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].wall - 0.5}H${right + __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].wall - 0.5}V${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH}M${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].x - 0.5} ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH}V${bottom + 0.5}H${right + 0.5}V${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH}`,
                fill: "none",
                stroke: "#8f826b",
                strokeOpacity: 0.5,
                strokeWidth: 1
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 67,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/yard.tsx",
        lineNumber: 39,
        columnNumber: 5
    }, this);
}
/**
 * Breaks up the tiled lawn with a few big soft light and dark patches. No
 * mowing stripes: those read as a golf course, not a backyard.
 */ function LawnVariation({ uid }) {
    const rand = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["rng"])(91);
    const patches = Array.from({
        length: 12
    }, ()=>({
            x: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].x + rand() * __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].w,
            y: __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].y + rand() * __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].h,
            rx: 60 + rand() * 140,
            ry: 40 + rand() * 90,
            dark: rand() > 0.5
        }));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        pointerEvents: "none",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-lawn-dark`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#1f3a12",
                                stopOpacity: 0.16
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 95,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#1f3a12",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 96,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/yard.tsx",
                        lineNumber: 94,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-lawn-light`,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#e8f0b0",
                                stopOpacity: 0.12
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 99,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#e8f0b0",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 100,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/yard.tsx",
                        lineNumber: 98,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 93,
                columnNumber: 7
            }, this),
            patches.map((p, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ellipse", {
                    cx: r1(p.x),
                    cy: r1(p.y),
                    rx: r1(p.rx),
                    ry: r1(p.ry),
                    fill: `url(#${uid}-lawn-${p.dark ? 'dark' : 'light'})`
                }, i, false, {
                    fileName: "[project]/components/estimator/scene/yard.tsx",
                    lineNumber: 104,
                    columnNumber: 9
                }, this))
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/yard.tsx",
        lineNumber: 92,
        columnNumber: 5
    }, this);
}
function GroundDefs({ uid, scene }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-grass`,
                texture: "lawn_grass"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 114,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-turf`,
                texture: "lawn_turf"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 115,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-bed`,
                texture: "planting_bed"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 116,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-gravel`,
                texture: "gravel_dg"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-walk`,
                texture: "deck_concrete",
                transform: `translate(${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["YARD"].x} ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH})`,
                tone: {
                    color: '#efe9de',
                    opacity: 0.15
                }
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 118,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-paver`,
                texture: "deck_porcelain"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 119,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-roof`,
                texture: "roof_shingle"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 120,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-counter`,
                texture: "counter_stone"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 121,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-firestone`,
                texture: "firepit_stone"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 122,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-neighbour`,
                texture: "lawn_grass",
                tone: {
                    color: '#a9a07f',
                    opacity: 0.7
                }
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 123,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$textures$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TexturePattern"], {
                id: `${uid}-pad`,
                texture: scene.deck === 'pavers' ? 'deck_pavers' : 'deck_porcelain'
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 124,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true);
}
/* ------------------------------ objects ------------------------------ */ const LOUNGER = {
    w: 2.4 * FT,
    h: 6.5 * FT,
    gap: 1.4 * FT
};
const UMBRELLA_D = 7 * FT;
/** Where the loungers and umbrella of a lounge set sit, in the set's local coordinates. */ function loungeParts(o) {
    const { w, h } = o.box;
    if (o.variant === 'lawn') {
        // Loungers lying sideways, stacked, with the umbrella below.
        return {
            loungers: [
                0,
                1
            ].map((i)=>({
                    x: 3,
                    y: 2 + i * (LOUNGER.w + LOUNGER.gap),
                    rotate: true
                })),
            umbrella: {
                x: (w - UMBRELLA_D) / 2,
                y: h - UMBRELLA_D
            }
        };
    }
    return {
        loungers: [
            0,
            1
        ].map((i)=>({
                x: 2 + i * (LOUNGER.w + LOUNGER.gap),
                y: (h - LOUNGER.h) / 2,
                rotate: false
            })),
        umbrella: {
            x: w - UMBRELLA_D,
            y: (h - UMBRELLA_D) / 2
        }
    };
}
function Shadows({ layout }) {
    const tree = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cast"])(9);
    const umbrella = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cast"])(7.5);
    const lounger = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cast"])(1.3);
    const kitchen = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cast"])(3);
    const chair = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cast"])(2.2);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        fill: "#0b1c22",
        children: layout.objects.map((o, i)=>{
            const { x, y, w, h } = o.box;
            switch(o.kind){
                case 'olive_tree':
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                        d: (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["treeShadowPath"])(w, i * 17 + 3, x + tree.dx, y + tree.dy),
                        opacity: 0.26
                    }, i, false, {
                        fileName: "[project]/components/estimator/scene/yard.tsx",
                        lineNumber: 162,
                        columnNumber: 20
                    }, this);
                case 'lounge_set':
                    {
                        const p = loungeParts(o);
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            opacity: 0.24,
                            children: [
                                p.loungers.map((l, j)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                                        x: x + l.x + lounger.dx,
                                        y: y + l.y + lounger.dy,
                                        width: l.rotate ? LOUNGER.h : LOUNGER.w,
                                        height: l.rotate ? LOUNGER.w : LOUNGER.h,
                                        rx: 3
                                    }, j, false, {
                                        fileName: "[project]/components/estimator/scene/yard.tsx",
                                        lineNumber: 168,
                                        columnNumber: 19
                                    }, this)),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                                    cx: x + p.umbrella.x + UMBRELLA_D / 2 + umbrella.dx,
                                    cy: y + p.umbrella.y + UMBRELLA_D / 2 + umbrella.dy,
                                    r: UMBRELLA_D / 2
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/yard.tsx",
                                    lineNumber: 170,
                                    columnNumber: 17
                                }, this)
                            ]
                        }, i, true, {
                            fileName: "[project]/components/estimator/scene/yard.tsx",
                            lineNumber: 166,
                            columnNumber: 15
                        }, this);
                    }
                case 'kitchen':
                    {
                        if (o.variant === 'house') return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: x + kitchen.dx,
                            y: y + kitchen.dy,
                            width: w,
                            height: 4.2 * FT,
                            opacity: 0.24
                        }, i, false, {
                            fileName: "[project]/components/estimator/scene/yard.tsx",
                            lineNumber: 175,
                            columnNumber: 47
                        }, this);
                        const depth = 3 * FT;
                        const cx = o.variant === 'left' ? x : x + w - depth;
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                            x: cx + kitchen.dx,
                            y: y + kitchen.dy,
                            width: depth,
                            height: h,
                            opacity: 0.26
                        }, i, false, {
                            fileName: "[project]/components/estimator/scene/yard.tsx",
                            lineNumber: 178,
                            columnNumber: 20
                        }, this);
                    }
                case 'patio_cover':
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                        transform: `translate(${r1(x)} ${r1(y)})`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PatioCoverShadow"], {
                            w: w,
                            h: h
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/yard.tsx",
                            lineNumber: 183,
                            columnNumber: 17
                        }, this)
                    }, i, false, {
                        fileName: "[project]/components/estimator/scene/yard.tsx",
                        lineNumber: 182,
                        columnNumber: 15
                    }, this);
                case 'fire_pit':
                    {
                        const c = w / 2;
                        const d = [
                            45,
                            135,
                            225,
                            315
                        ].map((deg)=>{
                            const a = deg * Math.PI / 180;
                            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["circlePath"])(x + c + Math.cos(a) * w * 0.33 + chair.dx, y + c + Math.sin(a) * w * 0.33 + chair.dy, FT * 1.35);
                        }).join('');
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                            d: d,
                            opacity: 0.22
                        }, i, false, {
                            fileName: "[project]/components/estimator/scene/yard.tsx",
                            lineNumber: 194,
                            columnNumber: 20
                        }, this);
                    }
                default:
                    return null;
            }
        })
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/yard.tsx",
        lineNumber: 157,
        columnNumber: 5
    }, this);
}
function Objects({ uid, layout, night }) {
    // Trees last, so their canopies sit over anything they overhang.
    const ordered = [
        ...layout.objects.map((o, i)=>({
                o,
                i
            }))
    ].sort((a, b)=>Number(a.o.kind === 'olive_tree') - Number(b.o.kind === 'olive_tree'));
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: ordered.map(({ o, i })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                className: "ps-move",
                style: {
                    transform: `translate(${r1(o.box.x)}px, ${r1(o.box.y)}px)`
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(SceneObjectView, {
                    uid: uid,
                    o: o,
                    seed: i * 17 + 3,
                    night: night
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/yard.tsx",
                    lineNumber: 211,
                    columnNumber: 11
                }, this)
            }, `${o.kind}-${i}`, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 210,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/components/estimator/scene/yard.tsx",
        lineNumber: 208,
        columnNumber: 5
    }, this);
}
function SceneObjectView({ uid, o, seed, night }) {
    const { w, h } = o.box;
    switch(o.kind){
        case 'olive_tree':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["OliveTree"], {
                d: w,
                seed: seed
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 222,
                columnNumber: 14
            }, this);
        case 'kitchen':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Kitchen"], {
                w: w,
                h: h,
                side: o.variant,
                counterFill: `url(#${uid}-counter)`,
                padFill: `url(#${uid}-pad)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 224,
                columnNumber: 14
            }, this);
        case 'patio_cover':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PatioCover"], {
                w: w,
                h: h,
                padFill: `url(#${uid}-pad)`,
                night: night
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 226,
                columnNumber: 14
            }, this);
        case 'fire_pit':
            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FirePit"], {
                d: w,
                gravelFill: `url(#${uid}-gravel)`,
                stoneFill: `url(#${uid}-firestone)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 228,
                columnNumber: 14
            }, this);
        case 'lounge_set':
            {
                const p = loungeParts(o);
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                    children: [
                        p.loungers.map((l, j)=>l.rotate ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                transform: `translate(${r1(l.x + LOUNGER.h)} ${r1(l.y)}) rotate(90)`,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Lounger"], {
                                    w: LOUNGER.w,
                                    h: LOUNGER.h
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/yard.tsx",
                                    lineNumber: 236,
                                    columnNumber: 17
                                }, this)
                            }, j, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 235,
                                columnNumber: 15
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                transform: `translate(${r1(l.x)} ${r1(l.y)})`,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Lounger"], {
                                    w: LOUNGER.w,
                                    h: LOUNGER.h
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/yard.tsx",
                                    lineNumber: 240,
                                    columnNumber: 17
                                }, this)
                            }, j, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 239,
                                columnNumber: 15
                            }, this)),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                            cx: o.variant === 'lawn' ? LOUNGER.h / 2 + 3 : 2 + LOUNGER.w + LOUNGER.gap / 2,
                            cy: o.variant === 'lawn' ? 2 + LOUNGER.w + LOUNGER.gap / 2 : h / 2 - LOUNGER.h * 0.28,
                            r: 5.5,
                            fill: "#c9b79c",
                            stroke: "#8b7558",
                            strokeWidth: 1
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/yard.tsx",
                            lineNumber: 244,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            transform: `translate(${r1(p.umbrella.x)} ${r1(p.umbrella.y)})`,
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$sprites$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Umbrella"], {
                                d: UMBRELLA_D
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 253,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/yard.tsx",
                            lineNumber: 252,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/components/estimator/scene/yard.tsx",
                    lineNumber: 232,
                    columnNumber: 9
                }, this);
            }
        default:
            return null;
    }
}
function House({ uid }) {
    const y = __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FRAME"].roofH;
    const facet = {
        l: 360,
        r: 840,
        top: 46
    };
    const panels = [];
    const cells = [];
    for(let i = 0; i < 6; i++){
        for(let j = 0; j < 2; j++){
            const px = 872 + i * 42;
            const py = 14 + j * 34;
            panels.push(`M${px} ${py}h39v31h-39Z`);
            for(let c = 1; c < 4; c++)cells.push(`M${px + c * 9.75} ${py}v31`);
            for(let c = 1; c < 6; c++)cells.push(`M${px} ${r1(py + c * 5.17)}h39`);
        }
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                        id: `${uid}-roofshade`,
                        x1: "0",
                        y1: "0",
                        x2: "0",
                        y2: "1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#ffffff",
                                stopOpacity: 0.1
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 284,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#000000",
                                stopOpacity: 0.14
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 285,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/yard.tsx",
                        lineNumber: 283,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                        id: `${uid}-panelsky`,
                        x1: "0",
                        y1: "0",
                        x2: "1",
                        y2: "1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#c9dcf0",
                                stopOpacity: 0.28
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 288,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.5",
                                stopColor: "#c9dcf0",
                                stopOpacity: 0.04
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 289,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#c9dcf0",
                                stopOpacity: 0.14
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 290,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/yard.tsx",
                        lineNumber: 287,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 282,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 0,
                y: y,
                width: W,
                height: 1.3 * FT,
                fill: "#0b1a22",
                opacity: 0.26
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 294,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 0,
                y: y,
                width: W,
                height: 0.5 * FT,
                fill: "#0b1a22",
                opacity: 0.14
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 295,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: W,
                height: y,
                fill: `url(#${uid}-roof)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 296,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: W,
                height: y,
                fill: `url(#${uid}-roofshade)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 297,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${facet.l} ${y}L${facet.l + 60} ${facet.top}H${facet.r - 60}L${facet.r} ${y}Z`,
                fill: "#000",
                opacity: 0.07
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 299,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M${facet.l} ${y}L${facet.l + 60} ${facet.top}H${facet.r - 60}L${facet.r} ${y}`,
                fill: "none",
                stroke: "#d9dadc",
                strokeOpacity: 0.35,
                strokeWidth: 2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 300,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: `M0 ${facet.top}H${facet.l + 60}M${facet.r - 60} ${facet.top}H${W}`,
                stroke: "#d9dadc",
                strokeOpacity: 0.22,
                strokeWidth: 2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 301,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: panels.join(''),
                fill: "#1d2a3d",
                stroke: "#8fa2b8",
                strokeOpacity: 0.55,
                strokeWidth: 0.8
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 303,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("path", {
                d: cells.join(''),
                stroke: "#8fa2b8",
                strokeOpacity: 0.28,
                strokeWidth: 0.6
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 304,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 872,
                y: 14,
                width: 249,
                height: 65,
                fill: `url(#${uid}-panelsky)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 305,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: 220,
                cy: 70,
                r: 5,
                fill: "#7d8187",
                stroke: "#2f3236",
                strokeWidth: 1
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 306,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("circle", {
                cx: 640,
                cy: 28,
                r: 4,
                fill: "#7d8187",
                stroke: "#2f3236",
                strokeWidth: 1
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 307,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 150,
                y: 22,
                width: 30,
                height: 22,
                rx: 2,
                fill: "#aab8c2",
                stroke: "#e6e8ea",
                strokeWidth: 2
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 308,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 0,
                y: y - 5,
                width: W,
                height: 5,
                fill: "#eceae5"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 310,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                x: 0,
                y: y - 1,
                width: W,
                height: 1,
                fill: "#000",
                opacity: 0.25
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 311,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/yard.tsx",
        lineNumber: 281,
        columnNumber: 5
    }, this);
}
function DaylightPass({ uid }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
        pointerEvents: "none",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("linearGradient", {
                        id: `${uid}-sun`,
                        x1: "0",
                        y1: "0",
                        x2: "1",
                        y2: "1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0",
                                stopColor: "#fff4d6",
                                stopOpacity: 0.14
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 322,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.5",
                                stopColor: "#fff4d6",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 323,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#0d2f3f",
                                stopOpacity: 0.1
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 324,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/yard.tsx",
                        lineNumber: 321,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("radialGradient", {
                        id: `${uid}-vignette`,
                        cx: "0.5",
                        cy: "0.55",
                        r: "0.75",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "0.62",
                                stopColor: "#000",
                                stopOpacity: 0
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 327,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("stop", {
                                offset: "1",
                                stopColor: "#000",
                                stopOpacity: 0.22
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/yard.tsx",
                                lineNumber: 328,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/yard.tsx",
                        lineNumber: 326,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 320,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: W,
                height: H,
                fill: `url(#${uid}-sun)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 331,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("rect", {
                width: W,
                height: H,
                fill: `url(#${uid}-vignette)`
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/yard.tsx",
                lineNumber: 332,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/yard.tsx",
        lineNumber: 319,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/scene/pool-scene.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "PoolScene",
    ()=>PoolScene
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/geometry.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/types.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/crossfade.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$highlights$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/highlights.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/materials.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$night$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/night.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$water$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/water.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$yard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/yard.tsx [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
;
;
const EASE = 'cubic-bezier(.22,.8,.24,1)';
/**
 * Scene-wide CSS. Class names are prefixed `ps-`; every instance carries the
 * same rules, so duplicates are harmless. All motion stops under
 * prefers-reduced-motion.
 */ const CSS = `
.ps-fade{animation:ps-fade ${__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FADE_MS"]}ms ease-out both}
.ps-fade-out{animation:ps-fade ${__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["FADE_MS"]}ms ease-in reverse both}
@keyframes ps-fade{from{opacity:0}to{opacity:1}}
.ps-move{transition:transform .5s ${EASE}}
.ps-cam{transition:transform .8s ${EASE}}
.ps-morph{transition:d .5s ${EASE},x .5s ${EASE},y .5s ${EASE},width .5s ${EASE},height .5s ${EASE}}
.ps-caustic-a{animation:ps-ca 26s linear infinite}
.ps-caustic-b{animation:ps-cb 41s linear infinite}
@keyframes ps-ca{from{transform:translate(0,0)}to{transform:translate(${__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$water$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CAUSTICS"].t}px,${__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$water$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CAUSTICS"].t}px)}}
@keyframes ps-cb{from{transform:translate(0,0)}to{transform:translate(${-__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$water$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CAUSTICS"].b.x}px,${-__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$water$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CAUSTICS"].b.y}px)}}
.ps-flicker{transform-box:fill-box;transform-origin:center;animation:ps-flicker 1.7s ease-in-out infinite alternate}
@keyframes ps-flicker{0%{opacity:.86;transform:scale(.93)}55%{opacity:1;transform:scale(1.05)}100%{opacity:.92;transform:scale(.97)}}
@media (pointer:coarse){.ps-caustic-b{animation:none}}
.ps-intro .ps-drone{animation:ps-drone 1.2s cubic-bezier(.22,.8,.24,1) both;transform-origin:${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].width / 2}px ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].height / 2}px}
@keyframes ps-drone{from{transform:scale(1.06)}to{transform:none}}
.ps-intro .ps-yard{animation:ps-fade .4s ease-out both}
.ps-intro .ps-pool{animation:ps-pool .5s ${EASE} .28s both;transform-box:fill-box;transform-origin:center}
@keyframes ps-pool{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}
.ps-intro .ps-deck,.ps-intro .ps-things{animation:ps-fade .45s ease-out .68s both}
.ps-leave{animation:ps-fade .4s ease-out reverse both}
${__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$highlights$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HIGHLIGHT_CSS"]}
.ps-root[data-paused] :not(.ps-hl,.ps-hl *){animation-play-state:paused!important}
@media (prefers-reduced-motion:reduce){.ps-root *{animation:none!important;transition:none!important}}
@media (prefers-reduced-motion:reduce){.ps-leave{animation:none;opacity:0}}
`;
/** Text fields: while one has focus (the phone keyboard is up) the water stops moving. */ const TYPING = 'input:not([type=radio]):not([type=checkbox]):not([type=range]),textarea,select';
/**
 * Pause the water and fire whenever nobody is watching them: the picture is
 * scrolled off screen, the tab is hidden, or a text field has focus. The
 * animations repaint the whole SVG, which costs battery and typing smoothness
 * on phones, where the picture is pinned on screen.
 */ function usePausedWhenIdle(ref, enabled = true) {
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const el = ref.current;
        if (!el || !enabled) return;
        let offscreen = false;
        const update = ()=>{
            const typing = document.activeElement instanceof Element && document.activeElement.matches(TYPING);
            const paused = offscreen || document.visibilityState === 'hidden' || typing;
            if (paused) el.setAttribute('data-paused', '');
            else el.removeAttribute('data-paused');
        };
        const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries)=>{
            offscreen = !entries.some((e)=>e.isIntersecting);
            update();
        });
        observer?.observe(el);
        document.addEventListener('visibilitychange', update);
        document.addEventListener('focusin', update);
        document.addEventListener('focusout', update);
        update();
        return ()=>{
            observer?.disconnect();
            document.removeEventListener('visibilitychange', update);
            document.removeEventListener('focusin', update);
            document.removeEventListener('focusout', update);
        };
    }, [
        ref,
        enabled
    ]);
}
function PoolScene({ scene, night = false, label, focus = 'yard', intro = false, highlight, still = false, className }) {
    const uid = `ps${(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useId"])().replace(/[^a-zA-Z0-9]/g, '')}`;
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    usePausedWhenIdle(ref, !still);
    const specKey = JSON.stringify(scene);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the spec's content, not its identity
    const layout = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["layoutScene"])(scene), [
        specKey
    ]);
    const cam = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$geometry$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["sceneCamera"])(layout, focus);
    const zoom = Math.round(__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].width / cam.w * 10000) / 10000;
    // The same matrix as an attribute (any renderer) and as CSS (so the camera glides).
    const matrix = [
        zoom,
        0,
        0,
        zoom,
        Math.round(-cam.x * zoom * 100) / 100,
        Math.round(-cam.y * zoom * 100) / 100
    ];
    const keys = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$materials$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["materialKeys"])(scene);
    const dayNight = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$crossfade$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useFadeKeys"])(night ? 'night' : 'day');
    const showNight = dayNight.includes('night');
    const nightClass = dayNight.length > 1 ? night ? 'ps-fade' : 'ps-fade-out' : undefined;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("svg", {
        ref: ref,
        viewBox: `0 0 ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].width} ${__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$types$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SCENE"].height}`,
        role: "img",
        "aria-label": label,
        "data-paused": still ? '' : undefined,
        className: [
            'ps-root',
            intro ? 'ps-intro' : '',
            className ?? ''
        ].filter(Boolean).join(' '),
        xmlns: "http://www.w3.org/2000/svg",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: CSS
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                lineNumber: 151,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                "aria-hidden": "true",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                        className: "ps-drone",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                            className: "ps-cam",
                            transform: `matrix(${matrix.join(' ')})`,
                            style: {
                                transform: `matrix(${matrix.join(',')})`
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("defs", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$yard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["GroundDefs"], {
                                        uid: uid,
                                        scene: scene
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                        lineNumber: 156,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                    lineNumber: 155,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                    className: "ps-yard",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$yard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Ground"], {
                                        uid: uid,
                                        layout: layout,
                                        scene: scene,
                                        groundKey: keys.ground
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                        lineNumber: 159,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                    lineNumber: 158,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$water$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["PoolLayer"], {
                                    uid: uid,
                                    layout: layout,
                                    scene: scene,
                                    keys: keys,
                                    night: night
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                    lineNumber: 161,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                    className: "ps-things",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$yard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Shadows"], {
                                            layout: layout
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                            lineNumber: 163,
                                            columnNumber: 15
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$yard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Objects"], {
                                            uid: uid,
                                            layout: layout,
                                            night: night
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                            lineNumber: 164,
                                            columnNumber: 15
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                    lineNumber: 162,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                    className: "ps-yard",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$yard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["House"], {
                                        uid: uid
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                        lineNumber: 167,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                    lineNumber: 166,
                                    columnNumber: 13
                                }, this),
                                showNight ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("g", {
                                    className: nightClass,
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$night$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["NightLayer"], {
                                        uid: uid,
                                        layout: layout,
                                        scene: scene
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                        lineNumber: 171,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                    lineNumber: 170,
                                    columnNumber: 15
                                }, this) : null,
                                highlight?.items.length ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$highlights$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["SceneHighlights"], {
                                    uid: uid,
                                    layout: layout,
                                    items: highlight.items
                                }, highlight.key, false, {
                                    fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                                    lineNumber: 174,
                                    columnNumber: 40
                                }, this) : null
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                            lineNumber: 154,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                        lineNumber: 153,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$yard$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["DaylightPass"], {
                        uid: uid
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                        lineNumber: 178,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/pool-scene.tsx",
                lineNumber: 152,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/pool-scene.tsx",
        lineNumber: 142,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/scene/example-compare.tsx [app-ssr] (ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EXAMPLE_LABELS",
    ()=>EXAMPLE_LABELS,
    "EXAMPLE_VIDEO_LABEL",
    ()=>EXAMPLE_VIDEO_LABEL,
    "ExampleCompare",
    ()=>ExampleCompare,
    "ExampleVideo",
    ()=>ExampleVideo
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/image.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevrons$2d$left$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronsLeftRight$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevrons-left-right.js [app-ssr] (ecmascript) <export default as ChevronsLeftRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pause$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Pause$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/pause.js [app-ssr] (ecmascript) <export default as Pause>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/play.js [app-ssr] (ecmascript) <export default as Play>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/meta.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$hero$2d$images$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/scene/hero-images.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
;
const EXAMPLE_LABELS = {
    design: 'Example design',
    photo: 'Its realistic photo'
};
/** The pool's example pair (the default). */ const POOL_EXAMPLE = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["TRADE_META"].pool.exampleImages;
const EXAMPLE_VIDEO_LABEL = 'AI-rendered example';
/** Wait for the frame to be seen, then sweep once from the design to the middle. */ const SWEEP_DELAY_MS = 700;
const SWEEP_MS = 1400;
const CSS = `
.ec-glide .ec-before{transition:clip-path ${SWEEP_MS}ms cubic-bezier(.65,0,.35,1)}
.ec-glide .ec-handle{transition:transform ${SWEEP_MS}ms cubic-bezier(.65,0,.35,1)}
.ec-leave{animation:ec-leave .4s ease-out both}
@keyframes ec-leave{from{opacity:1}to{opacity:0}}
@media (prefers-reduced-motion:reduce){.ec-glide .ec-before,.ec-glide .ec-handle{transition:none}.ec-leave{animation:none;opacity:0}}
`;
function ExampleCompare({ leaving = false, images = POOL_EXAMPLE, onError, className }) {
    // Starts as all design (server and first client render agree); the photo then "develops" out of it.
    const [pos, setPos] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(100);
    const [glide, setGlide] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const touched = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (leaving) return;
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            setPos(50);
            return;
        }
        const timers = [
            setTimeout(()=>{
                if (touched.current) return;
                setGlide(true);
                setPos(50);
            }, SWEEP_DELAY_MS),
            setTimeout(()=>setGlide(false), SWEEP_DELAY_MS + SWEEP_MS + 80)
        ];
        return ()=>timers.forEach(clearTimeout);
    }, [
        leaving
    ]);
    const label = 'pointer-events-none absolute bottom-2.5 inline-flex h-7 items-center rounded-full bg-[#06122b]/80 px-2.5 text-[11px] font-semibold text-white sm:bottom-3 sm:h-8 sm:px-3 sm:text-xs';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-example-compare": "",
        "aria-hidden": leaving ? true : undefined,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('absolute inset-0 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-4 has-[input:focus-visible]:outline-white', glide && 'ec-glide', leaving && 'ec-leave pointer-events-none', className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: CSS
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 86,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                src: images.photo,
                alt: images.photoAlt,
                fill: true,
                priority: true,
                sizes: "(min-width: 1024px) 720px, 100vw",
                className: "object-cover",
                onError: onError
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 87,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "ec-before absolute inset-0",
                style: {
                    clipPath: `inset(0 ${100 - pos}% 0 0)`
                },
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$image$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                    src: images.illustration,
                    alt: images.designAlt,
                    fill: true,
                    priority: true,
                    sizes: "(min-width: 1024px) 720px, 100vw",
                    className: "object-cover",
                    onError: onError
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/example-compare.tsx",
                    lineNumber: 89,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 88,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                "aria-hidden": "true",
                className: "ec-handle pointer-events-none absolute inset-y-0 left-0 w-full",
                style: {
                    transform: `translateX(${pos}%)`
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute inset-y-0 left-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.45)]"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/example-compare.tsx",
                        lineNumber: 92,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                        className: "absolute top-1/2 left-0 grid size-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#06122b] shadow-[0_6px_18px_rgba(0,0,0,0.45)]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevrons$2d$left$2d$right$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronsLeftRight$3e$__["ChevronsLeftRight"], {
                            className: "size-5",
                            strokeWidth: 2.4
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/example-compare.tsx",
                            lineNumber: 94,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/example-compare.tsx",
                        lineNumber: 93,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 91,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-hidden": "true",
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(label, 'left-2.5 sm:left-3'),
                children: EXAMPLE_LABELS.design
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 97,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                "aria-hidden": "true",
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(label, 'right-2.5 sm:right-3'),
                children: images.photoLabel ?? EXAMPLE_LABELS.photo
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, this),
            leaving ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                type: "range",
                min: 0,
                max: 100,
                value: pos,
                onChange: (e)=>{
                    touched.current = true;
                    setGlide(false);
                    setPos(Number(e.target.value));
                },
                "aria-label": "Compare an example design with its realistic photo",
                "aria-valuetext": `${pos}% example design, ${100 - pos}% realistic photo`,
                // pan-y: a vertical swipe that starts on the picture still scrolls the page (iOS).
                className: "absolute inset-0 size-full cursor-ew-resize touch-pan-y opacity-0"
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 104,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/example-compare.tsx",
        lineNumber: 81,
        columnNumber: 5
    }, this);
}
function ExampleVideo({ video, leaving = false, onError, className }) {
    const ref = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(null);
    const hasClip = Boolean(video.mp4 || video.webm);
    // The homeowner's own pause wins over everything; reduced motion starts it paused.
    const [paused, setPaused] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const [reducedMotion, setReducedMotion] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
        const sync = ()=>setReducedMotion(Boolean(reduced?.matches));
        sync();
        reduced?.addEventListener?.('change', sync);
        return ()=>reduced?.removeEventListener?.('change', sync);
    }, []);
    const playing = hasClip && !leaving && !paused && !reducedMotion;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const el = ref.current;
        if (!el || !hasClip) return;
        if (playing) void el.play().catch(()=>{});
        else el.pause();
    }, [
        playing,
        hasClip
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-example-video": "",
        role: leaving ? undefined : 'img',
        "aria-label": leaving ? undefined : video.alt,
        "aria-hidden": leaving ? true : undefined,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('absolute inset-0 bg-[#d8d2c3]', leaving && 'ec-leave pointer-events-none', className),
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("style", {
                children: CSS
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 171,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("video", {
                ref: ref,
                muted: true,
                loop: true,
                playsInline: true,
                preload: "metadata",
                poster: video.poster,
                "aria-hidden": "true",
                onError: onError,
                className: "absolute inset-0 size-full object-cover",
                children: [
                    video.webm ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
                        src: video.webm,
                        type: "video/webm"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/example-compare.tsx",
                        lineNumber: 183,
                        columnNumber: 23
                    }, this) : null,
                    video.mp4 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("source", {
                        src: video.mp4,
                        type: "video/mp4"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/example-compare.tsx",
                        lineNumber: 184,
                        columnNumber: 22
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 172,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                className: "pointer-events-none absolute bottom-2.5 left-2.5 inline-flex h-7 items-center rounded-full bg-[#06122b]/80 px-2.5 text-[11px] font-semibold text-white sm:bottom-3 sm:left-3 sm:h-8 sm:px-3 sm:text-xs",
                children: EXAMPLE_VIDEO_LABEL
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 186,
                columnNumber: 7
            }, this),
            hasClip && !leaving && !reducedMotion ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                type: "button",
                "aria-pressed": paused,
                "aria-label": paused ? 'Play the example clip' : 'Pause the example clip',
                onClick: ()=>setPaused((p)=>!p),
                className: "absolute bottom-1.5 right-1.5 grid size-11 place-items-center rounded-full text-white focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-white sm:bottom-2 sm:right-2",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                    className: "grid size-8 place-items-center rounded-full bg-[#06122b]/80",
                    children: paused ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__["Play"], {
                        className: "size-3.5",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/example-compare.tsx",
                        lineNumber: 198,
                        columnNumber: 23
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pause$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Pause$3e$__["Pause"], {
                        className: "size-3.5",
                        "aria-hidden": "true"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/example-compare.tsx",
                        lineNumber: 198,
                        columnNumber: 74
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/components/estimator/scene/example-compare.tsx",
                    lineNumber: 197,
                    columnNumber: 11
                }, this)
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/example-compare.tsx",
                lineNumber: 190,
                columnNumber: 9
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/example-compare.tsx",
        lineNumber: 164,
        columnNumber: 5
    }, this);
}
}),
"[project]/components/estimator/scene/scene-panel.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "EXAMPLE_CAPTION",
    ()=>EXAMPLE_CAPTION,
    "EXAMPLE_PHOTO_CAPTION",
    ()=>EXAMPLE_PHOTO_CAPTION,
    "EXAMPLE_VIDEO_CAPTION",
    ()=>EXAMPLE_VIDEO_CAPTION,
    "SCENE_CAPTION",
    ()=>SCENE_CAPTION,
    "ScenePanel",
    ()=>ScenePanel,
    "builderFor",
    ()=>builderFor
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-ssr] (ecmascript) <export default as Check>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-down.js [app-ssr] (ecmascript) <export default as ChevronDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevron-up.js [app-ssr] (ecmascript) <export default as ChevronUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/eye.js [app-ssr] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/moon.js [app-ssr] (ecmascript) <export default as Moon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-ssr] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sun$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Sun$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/sun.js [app-ssr] (ecmascript) <export default as Sun>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/engine.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$example$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/example.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$highlights$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/estimator/scene/highlights.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/utils.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/estimator/builder.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/estimator/builders/index.ts [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/meta.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$pool$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/builders/pool.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$motion$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/components/estimator/motion.tsx [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$example$2d$compare$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/components/estimator/scene/example-compare.tsx [app-ssr] (ecmascript) <locals>");
'use client';
;
;
;
;
;
;
;
;
;
;
;
;
const SCENE_CAPTION = __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$pool$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["POOL_COPY"].sceneCaption;
const EXAMPLE_PHOTO_CAPTION = 'Example: a design made here, and the realistic photo made from it';
const EXAMPLE_VIDEO_CAPTION = 'Example: an AI-rendered photo, not a real job. Your picks build your own design.';
const EXAMPLE_CAPTION = 'Example — your picks will change it';
/** How long the first-look build-up runs (keep in sync with the ps-intro CSS in pool-scene). */ const INTRO_MS = 1200;
/** The example fades out over the homeowner's own picture for this long after their first answer. */ const LEAVE_MS = 400;
/** The build-up plays once per page visit, even if the builder remounts (client-side navigation). */ let introPlayed = false;
function builderFor(template) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$index$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getTradeBuilder"])(template.trade) ?? __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$pool$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["POOL_BUILDER"];
}
// Solid, not backdrop-blur: a blur is recomputed every time the animated picture under it repaints.
const pill = 'pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-[#06122b]/80 px-3 text-xs font-semibold text-white shadow-sm';
const ScenePanel = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["memo"])(function ScenePanel({ template, builder: builderProp, answers, dimensions, preview, night, onNightChange, variant = 'builder', focus = 'yard', focusOn, stepKey, frameRef, overlay, hideLighting, footer, examplePhoto = false, example: exampleProp, caption, className }) {
    const uid = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useId"])();
    const frameId = `${uid}-frame`;
    const builder = builderProp ?? builderFor(template);
    const { Scene, copy } = builder;
    const labeler = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["optionLabeler"])(template), [
        template
    ]);
    const scene = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>builder.buildSpec(template, {
            answers,
            dimensions
        }), [
        builder,
        template,
        answers,
        dimensions
    ]);
    const previewAnswers = preview?.answers;
    // A preview that would not change the picture (typed dimensions win over a size, "not sure") shows no ghost.
    const ghost = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>{
        if (!previewAnswers) return null;
        const next = builder.buildSpec(template, {
            answers: previewAnswers,
            dimensions
        });
        return JSON.stringify(next) === JSON.stringify(scene) ? null : next;
    }, [
        builder,
        template,
        previewAnswers,
        dimensions,
        scene
    ]);
    // Nothing answered yet: an example design (captioned as one) instead of a bare picture.
    const example = variant === 'builder' && !(0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$example$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["hasAnyPick"])(answers, Boolean(dimensions));
    const shown = ghost ?? (example ? builder.exampleSpec : scene);
    // The committed design as pills under the picture on desktop (fills the column and grows as they build).
    const items = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>variant === 'builder' ? builder.designSummary(scene, labeler) : [], [
        builder,
        variant,
        scene,
        labeler
    ]);
    const close = focus === 'pool' || focus === 'close';
    // The example the frame opens on with renders on (a design beside its photo, or a clip); a file that fails drops it.
    const [mediaFailed, setMediaFailed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const media = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useMemo"])(()=>exampleProp === undefined ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builders$2f$meta$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["resolveExampleMedia"])(builder) : exampleProp, [
        builder,
        exampleProp
    ]);
    const exampleMedia = examplePhoto && !mediaFailed ? media : null;
    const dropMedia = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useCallback"])(()=>setMediaFailed(true), []);
    const [ownNight, setOwnNight] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    const isNight = night ?? ownNight;
    const mode = builder.modes[isNight ? 1 : 0].id;
    const setNight = (value)=>onNightChange ? onNightChange(value) : setOwnNight(value);
    const [collapsed, setCollapsed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(false);
    // First look: build the picture up once (state, so server and first client render agree), then switch it off.
    const [intro, setIntro] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(()=>variant === 'builder' && !introPlayed);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!intro) return;
        introPlayed = true;
        const t = setTimeout(()=>setIntro(false), INTRO_MS + 150);
        return ()=>clearTimeout(t);
    }, [
        intro
    ]);
    // The first answer: the example fades away over their own picture instead of vanishing.
    const [leaving, setLeaving] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const wasExample = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])(example);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (wasExample.current && !example) setLeaving(Date.now());
        wasExample.current = example;
    }, [
        example
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (leaving === null) return;
        const t = setTimeout(()=>setLeaving(null), LEAVE_MS + 50);
        return ()=>clearTimeout(t);
    }, [
        leaving
    ]);
    // Change chip: diff the committed answers and scene against the last ones (previews never chip).
    // `onPicture`: the picture also highlights the spot itself, so the frame does not glow as well.
    const [chip, setChip] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // ...and the spot on the picture that changed (a shimmer, ripple or sparkle), for under HIGHLIGHT_MS.
    const [flash, setFlash] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    // A new screen starts clean: a chip about the last screen's pick would read as wrong.
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>setChip(null), [
        stepKey
    ]);
    const last = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useRef"])({
        scene,
        answers
    });
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        const prev = last.current;
        last.current = {
            scene,
            answers
        };
        if (variant !== 'builder' || prev.scene === scene && prev.answers === answers) return;
        const highlights = builder.highlights(prev.scene, scene);
        if (highlights.length) setFlash({
            key: Date.now(),
            items: highlights
        });
        const fromAnswers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["answerChanges"])(template, prev.answers, answers, labeler, {
            phrase: builder.optionPhrase,
            isVisual: builder.isVisual
        });
        const unsure = new Set(builder.unsureIds.filter((id)=>{
            const q = template.questions.find((question)=>question.id === id);
            return q ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$engine$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["picksFor"])(q, answers).includes('unsure') : false;
        }));
        const text = fromAnswers.package ?? (0, __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$builder$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["chipText"])([
            ...builder.changeMessages(prev.scene, scene, labeler, unsure),
            ...fromAnswers.added
        ]);
        if (!text) return;
        // A just-added feature with a photo shows that photo beside the words.
        const image = fromAnswers.package ? undefined : builder.addedOptions(prev.scene, scene).map(({ questionId, optionId })=>template.questions.find((q)=>q.id === questionId)?.options.find((o)=>o.id === optionId)?.image).find(Boolean);
        setChip({
            key: Date.now(),
            text,
            image,
            onPicture: highlights.length > 0
        });
    }, [
        scene,
        answers,
        template,
        labeler,
        variant,
        builder
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!chip) return;
        const t = setTimeout(()=>setChip(null), __TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$motion$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["CHIP_MS"]);
        return ()=>clearTimeout(t);
    }, [
        chip
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useEffect"])(()=>{
        if (!flash) return;
        const t = setTimeout(()=>setFlash(null), __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$estimator$2f$scene$2f$highlights$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["HIGHLIGHT_MS"] + 100);
        return ()=>clearTimeout(t);
    }, [
        flash
    ]);
    // The frame glows only for picks the picture cannot point at (a plan item, "help me choose").
    const glow = chip && !chip.onPicture;
    // The example split (renders on) covers the frame until the first answer or a hover preview.
    const compare = Boolean(exampleMedia) && example && !ghost;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('min-w-0', className),
        "data-scene-panel": variant,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$motion$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["BuilderStyles"], {}, void 0, false, {
                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                lineNumber: 226,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                id: frameId,
                ref: frameRef,
                "data-preview": ghost ? 'true' : undefined,
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('relative mx-auto overflow-hidden rounded-2xl border border-[var(--hq-line-strong)] bg-[#d8d2c3] shadow-[0_22px_48px_-24px_rgba(0,0,0,0.75)]', collapsed && 'max-lg:hidden'),
                style: {
                    aspectRatio: '3 / 2',
                    width: 'min(100%, calc(var(--eb-max-h, 4000px) * 1.5))'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Scene, {
                        scene: shown,
                        mode: mode,
                        focus: close ? 'close' : 'overview',
                        focusOn: close ? focusOn : undefined,
                        intro: intro,
                        highlight: flash,
                        covered: compare,
                        label: example && !ghost ? `Example design, not your picks yet. ${builder.describe(shown, labeler)}` : builder.describe(shown, labeler),
                        className: "absolute inset-0 block size-full"
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 237,
                        columnNumber: 9
                    }, this),
                    leaving !== null ? // The example, fading out over their first picture (decorative; gone after LEAVE_MS).
                    exampleMedia?.kind === 'compare' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$example$2d$compare$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ExampleCompare"], {
                        leaving: true,
                        images: exampleMedia
                    }, leaving, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 251,
                        columnNumber: 13
                    }, this) : exampleMedia?.kind === 'video' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$example$2d$compare$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ExampleVideo"], {
                        leaving: true,
                        video: exampleMedia
                    }, leaving, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 253,
                        columnNumber: 13
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pointer-events-none absolute inset-0",
                        "aria-hidden": "true",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Scene, {
                            scene: builder.exampleSpec,
                            mode: mode,
                            focus: close ? 'close' : 'overview',
                            label: "",
                            leaving: true,
                            className: "absolute inset-0 block size-full"
                        }, void 0, false, {
                            fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                            lineNumber: 256,
                            columnNumber: 15
                        }, this)
                    }, leaving, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 255,
                        columnNumber: 13
                    }, this) : null,
                    compare && exampleMedia?.kind === 'compare' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$example$2d$compare$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ExampleCompare"], {
                        images: exampleMedia,
                        onError: dropMedia
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 260,
                        columnNumber: 56
                    }, this) : null,
                    compare && exampleMedia?.kind === 'video' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$components$2f$estimator$2f$scene$2f$example$2d$compare$2e$tsx__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["ExampleVideo"], {
                        video: exampleMedia,
                        onError: dropMedia
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 261,
                        columnNumber: 54
                    }, this) : null,
                    glow ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "eb-glow pointer-events-none absolute inset-0 rounded-2xl",
                        "aria-hidden": "true"
                    }, `glow-${chip.key}`, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 263,
                        columnNumber: 17
                    }, this) : null,
                    example && !ghost && !compare ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            "data-example-caption": "",
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(pill, 'h-8 max-w-full'),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                    className: "size-3.5 shrink-0 text-[#ffd666]",
                                    "aria-hidden": "true"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                    lineNumber: 268,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "truncate",
                                    children: EXAMPLE_CAPTION
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                    lineNumber: 269,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                            lineNumber: 267,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 266,
                        columnNumber: 11
                    }, this) : null,
                    ghost ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/75",
                        "aria-hidden": "true",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(pill, 'eb-badge absolute right-2.5 top-2.5 h-8 max-w-[70%] sm:right-3 sm:top-3'),
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                    className: "size-3.5 shrink-0",
                                    "aria-hidden": "true"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                    lineNumber: 277,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "truncate",
                                    children: [
                                        "Preview: ",
                                        preview?.label
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                    lineNumber: 278,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                            lineNumber: 276,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 275,
                        columnNumber: 11
                    }, this) : null,
                    !hideLighting && !compare ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        role: "group",
                        "aria-label": "Lighting",
                        className: "absolute left-2.5 top-2.5 flex rounded-full bg-[#06122b]/80 p-0.5 shadow-sm sm:left-3 sm:top-3",
                        children: [
                            false,
                            true
                        ].map((value)=>{
                            const m = builder.modes[value ? 1 : 0];
                            const Icon = m.icon === 'moon' ? __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__["Moon"] : __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sun$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Sun$3e$__["Sun"];
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                type: "button",
                                "aria-pressed": isNight === value,
                                onClick: ()=>setNight(value),
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white sm:h-8 sm:px-3 sm:text-xs', isNight === value ? 'bg-white text-[#06122b]' : 'text-white/85 hover:text-white'),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                        className: "size-3.5",
                                        "aria-hidden": "true"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                        lineNumber: 299,
                                        columnNumber: 19
                                    }, this),
                                    m.label
                                ]
                            }, String(value), true, {
                                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                lineNumber: 289,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 284,
                        columnNumber: 11
                    }, this) : null,
                    chip ? // Tablet and up: over the bottom of the picture. Phones show it under the picture instead (below).
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        "aria-hidden": "true",
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('pointer-events-none absolute inset-x-0 bottom-3 flex px-3 max-sm:hidden', builder.chipAlign === 'start' ? 'justify-start' : 'justify-center'),
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('eb-chip inline-flex max-w-full items-center gap-1.5 rounded-full bg-white/95 py-1.5 pr-3.5 text-xs font-semibold text-[#06122b] shadow-lg sm:text-sm', chip.image ? 'gap-2 pl-1.5' : 'pl-3.5'),
                            children: [
                                chip.image ? // Plain img: a contractor photo of unknown size, cropped to a round thumbnail.
                                // eslint-disable-next-line @next/next/no-img-element
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: chip.image,
                                    alt: "",
                                    className: "size-9 shrink-0 rounded-full object-cover sm:size-10"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                    lineNumber: 323,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                    className: "size-4 shrink-0 text-emerald-600",
                                    "aria-hidden": "true"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                    lineNumber: 325,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "min-w-0",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "flex items-center gap-1",
                                            children: [
                                                chip.image ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                                    className: "size-3.5 shrink-0 text-emerald-600",
                                                    "aria-hidden": "true"
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                                    lineNumber: 329,
                                                    columnNumber: 33
                                                }, this) : null,
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "truncate",
                                                    children: chip.text
                                                }, void 0, false, {
                                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                                    lineNumber: 330,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                            lineNumber: 328,
                                            columnNumber: 17
                                        }, this),
                                        chip.image ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                            className: "block truncate text-[10px] font-medium text-slate-500 sm:text-[11px]",
                                            children: copy.chipPhotoNote
                                        }, void 0, false, {
                                            fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                            lineNumber: 332,
                                            columnNumber: 31
                                        }, this) : null
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                    lineNumber: 327,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                            lineNumber: 314,
                            columnNumber: 13
                        }, this)
                    }, `chip-${chip.key}`, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 309,
                        columnNumber: 11
                    }, this) : null,
                    overlay
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                lineNumber: 227,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                role: "status",
                "aria-live": "polite",
                className: "sr-only",
                children: chip?.text ?? ''
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                lineNumber: 341,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "relative mt-1.5 flex min-h-8 items-center justify-between gap-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])('text-[11px] leading-4 text-[var(--hq-text-dim)] sm:text-xs', chip && !collapsed && 'max-sm:invisible'),
                        children: [
                            collapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "lg:hidden",
                                children: copy.hiddenNote
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                lineNumber: 348,
                                columnNumber: 13
                            }, this) : caption || compare ? caption ?? (exampleMedia?.kind === 'video' ? EXAMPLE_VIDEO_CAPTION : exampleMedia?.caption ?? EXAMPLE_PHOTO_CAPTION) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$utils$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["cn"])(variant === 'builder' && 'max-sm:hidden'),
                                        children: copy.sceneCaption
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                        lineNumber: 353,
                                        columnNumber: 15
                                    }, this),
                                    variant === 'builder' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "sm:hidden",
                                        children: copy.sceneCaptionShort
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                        lineNumber: 354,
                                        columnNumber: 40
                                    }, this) : null
                                ]
                            }, void 0, true),
                            collapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "max-lg:hidden",
                                children: copy.sceneCaption
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                lineNumber: 357,
                                columnNumber: 24
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 346,
                        columnNumber: 9
                    }, this),
                    chip && !collapsed ? // Phones: the chip sits just under the picture, over the caption (same height, so nothing moves),
                    // and never covers the spot on the picture that just changed. It stops short of "Hide picture".
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        "aria-hidden": "true",
                        className: "pointer-events-none absolute inset-y-0 left-0 right-28 flex items-center sm:hidden",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "eb-chip inline-flex h-8 max-w-full items-center gap-1.5 rounded-full bg-white/95 pr-3 pl-1 text-xs font-semibold text-[#06122b] shadow-md",
                            children: [
                                chip.image ? // eslint-disable-next-line @next/next/no-img-element
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                    src: chip.image,
                                    alt: "",
                                    className: "size-6 shrink-0 rounded-full object-cover"
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                    lineNumber: 366,
                                    columnNumber: 17
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "grid size-6 shrink-0 place-items-center",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Check$3e$__["Check"], {
                                        className: "size-4 text-emerald-600",
                                        "aria-hidden": "true"
                                    }, void 0, false, {
                                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                        lineNumber: 369,
                                        columnNumber: 19
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                    lineNumber: 368,
                                    columnNumber: 17
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "truncate",
                                    children: chip.text
                                }, void 0, false, {
                                    fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                    lineNumber: 372,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                            lineNumber: 363,
                            columnNumber: 13
                        }, this)
                    }, `chip-m-${chip.key}`, false, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 362,
                        columnNumber: 11
                    }, this) : null,
                    variant === 'builder' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        type: "button",
                        "aria-expanded": !collapsed,
                        "aria-controls": frameId,
                        onClick: ()=>setCollapsed((c)=>!c),
                        className: "inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-semibold text-[var(--hq-accent-bright)] hover:text-[var(--hq-text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hq-accent-bright)] lg:hidden",
                        children: [
                            collapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$down$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronDown$3e$__["ChevronDown"], {
                                className: "size-4",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                lineNumber: 384,
                                columnNumber: 26
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevron$2d$up$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronUp$3e$__["ChevronUp"], {
                                className: "size-4",
                                "aria-hidden": "true"
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                lineNumber: 384,
                                columnNumber: 82
                            }, this),
                            collapsed ? 'Show picture' : 'Hide picture'
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 377,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                lineNumber: 345,
                columnNumber: 7
            }, this),
            variant === 'builder' && items.length > 1 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("ul", {
                "aria-label": "Your design so far",
                className: "mt-3 hidden flex-wrap gap-2 lg:flex",
                children: items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("li", {
                        className: "rounded-full border border-[var(--hq-line-strong)] bg-[var(--hq-surface)]/60 px-3 py-1 text-xs text-[var(--hq-text-muted)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "text-[var(--hq-text-dim)]",
                                children: [
                                    item.label,
                                    ": "
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                lineNumber: 396,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-medium text-[var(--hq-text)]",
                                children: item.value
                            }, void 0, false, {
                                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                                lineNumber: 397,
                                columnNumber: 15
                            }, this)
                        ]
                    }, item.label, true, {
                        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                        lineNumber: 392,
                        columnNumber: 13
                    }, this))
            }, void 0, false, {
                fileName: "[project]/components/estimator/scene/scene-panel.tsx",
                lineNumber: 390,
                columnNumber: 9
            }, this) : null,
            footer
        ]
    }, void 0, true, {
        fileName: "[project]/components/estimator/scene/scene-panel.tsx",
        lineNumber: 225,
        columnNumber: 5
    }, this);
});
}),
];

//# sourceMappingURL=components_estimator_scene_7e3d8ce8._.js.map