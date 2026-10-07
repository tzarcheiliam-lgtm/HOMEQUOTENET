/**
 * Server-side inspection of uploaded creative bytes. Uploaded files are untrusted: the browser's declared
 * MIME type, dimensions and duration are only hints. These parsers read the real header bytes so validation
 * never relies on what the client claimed. Pure functions over a Buffer; nothing is decoded or modified,
 * and the original file is never rewritten.
 */

export type ProbedMedia =
  | { kind: 'image'; mime: 'image/jpeg' | 'image/png'; width: number; height: number }
  | { kind: 'video'; mime: 'video/mp4' | 'video/quicktime'; width: number | null; height: number | null; durationSeconds: number | null }
  | { kind: 'unknown'; mime: null };

export function probeImage(b: Buffer): { mime: 'image/jpeg' | 'image/png'; width: number; height: number } | null {
  // PNG: 8-byte signature, then IHDR chunk with big-endian width/height at offsets 16 and 20.
  if (b.length >= 24 && b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(4) === 0x0d0a1a0a && b.toString('ascii', 12, 16) === 'IHDR') {
    return { mime: 'image/png', width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }
  // JPEG: SOI then walk segments until a Start-Of-Frame marker.
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      if (marker === 0xff) { i++; continue; }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { i += 2; continue; }
      const len = b.readUInt16BE(i + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { mime: 'image/jpeg', height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      if (len < 2) return null;
      i += 2 + len;
    }
  }
  return null;
}

type Box = { type: string; start: number; end: number; headerLen: number };

function* boxes(b: Buffer, from: number, to: number): Generator<Box> {
  let p = from;
  while (p + 8 <= to) {
    let size = b.readUInt32BE(p);
    const type = b.toString('latin1', p + 4, p + 8);
    let headerLen = 8;
    if (size === 1) {
      if (p + 16 > to) return;
      size = Number(b.readBigUInt64BE(p + 8));
      headerLen = 16;
    } else if (size === 0) size = to - p;
    if (size < headerLen) return;
    yield { type, start: p, end: Math.min(p + size, to), headerLen };
    p += size;
  }
}

/** Reads the container's own header: brand (mp4 vs QuickTime), movie duration, and the first track's size. */
export function probeVideo(b: Buffer): { mime: 'video/mp4' | 'video/quicktime'; width: number | null; height: number | null; durationSeconds: number | null } | null {
  if (b.length < 16 || b.toString('latin1', 4, 8) !== 'ftyp') return null;
  const brand = b.toString('latin1', 8, 12);
  const mime = brand === 'qt  ' ? 'video/quicktime' : 'video/mp4';
  let duration: number | null = null;
  let width: number | null = null;
  let height: number | null = null;
  for (const top of boxes(b, 0, b.length)) {
    if (top.type !== 'moov') continue;
    for (const box of boxes(b, top.start + top.headerLen, top.end)) {
      if (box.type === 'mvhd') {
        const o = box.start + box.headerLen;
        const version = b[o];
        if (version === 1 && o + 32 <= b.length) {
          const timescale = b.readUInt32BE(o + 20);
          const dur = Number(b.readBigUInt64BE(o + 24));
          if (timescale > 0) duration = dur / timescale;
        } else if (o + 20 <= b.length) {
          const timescale = b.readUInt32BE(o + 12);
          const dur = b.readUInt32BE(o + 16);
          if (timescale > 0) duration = dur / timescale;
        }
      } else if (box.type === 'trak' && width === null) {
        for (const t of boxes(b, box.start + box.headerLen, box.end)) {
          if (t.type !== 'tkhd') continue;
          const o = t.start + t.headerLen;
          const version = b[o];
          const wOff = o + (version === 1 ? 88 : 76); // width/height are 16.16 fixed point at the end of tkhd
          if (wOff + 8 <= b.length) {
            const w = b.readUInt32BE(wOff) / 65536;
            const h = b.readUInt32BE(wOff + 4) / 65536;
            if (w > 0 && h > 0) { width = Math.round(w); height = Math.round(h); } // audio tracks report 0x0
          }
        }
      }
    }
  }
  return { mime, width, height, durationSeconds: duration };
}

export function probeMedia(b: Buffer): ProbedMedia {
  const img = probeImage(b);
  if (img) return { kind: 'image', ...img };
  const vid = probeVideo(b);
  if (vid) return { kind: 'video', ...vid };
  return { kind: 'unknown', mime: null };
}

/**
 * Video metadata when the file is too large to read whole: pass the first and last chunks. Many MP4s put the
 * `moov` box (duration, size) at the END of the file, so it is located in the tail and stitched to the `ftyp` header.
 */
export function probeVideoParts(head: Buffer, tail: Buffer | null) {
  const direct = probeVideo(head);
  if (direct && direct.durationSeconds != null) return direct;
  if (!tail || head.length < 12 || head.toString('latin1', 4, 8) !== 'ftyp') return direct;
  const idx = tail.indexOf('moov', 0, 'latin1');
  if (idx < 4) return direct;
  const ftypLen = head.readUInt32BE(0);
  if (ftypLen < 8 || ftypLen > head.length) return direct;
  return probeVideo(Buffer.concat([head.subarray(0, ftypLen), tail.subarray(idx - 4)])) ?? direct;
}
