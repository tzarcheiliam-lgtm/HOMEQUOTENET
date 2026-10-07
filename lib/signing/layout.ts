/**
 * Layout-based field suggestion. Pure functions over a page "layout" (text runs, rules, boxes in
 * DISPLAYED points, origin top-left). The same analysis serves native text PDFs (pdf.js text layer +
 * vector operators) and scanned PDFs (OCR words + raster rules).
 *
 * This is a HEURISTIC. It proposes fields and scores its own certainty; anything below the
 * confidence bar is flagged for human review, and weak guesses are dropped. It can be wrong in both
 * directions (missed fields, wrong fields) and a sender must always review placement.
 */
import type { FieldType } from '@/lib/signing/constants';

export interface TextRun { str: string; x: number; w: number; baseline: number; size: number }
export interface HLine { x1: number; x2: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export interface PageLayout { width: number; height: number; runs: TextRun[]; lines: HLine[]; boxes: Box[] }

export interface Suggestion {
  type: FieldType;
  /** displayed points, top-left origin */
  rect: Box;
  label: string;
  required: boolean;
  group_key: string | null;
  confidence: number;
  needs_review: boolean;
  role_hint: string | null;
  note: string | null;
}

export const CONFIDENT = 0.75;
export const MIN_KEEP = 0.45;

interface Segment { text: string; x1: number; x2: number; baseline: number; size: number; top: number; bottom: number; runs: TextRun[] }
interface Slot { kind: 'underscore' | 'line' | 'box'; x1: number; x2: number; y: number; top?: number; relation: 'right' | 'above' | 'below' | 'box' | 'none'; id: string }

const GLYPH_BOXES = /[☐□▢❏❑❒◻]/;
const PROSE = /\b(shall|must|hereby|agrees?|agreed|binding|required|requires?|will|upon|thereof|herein|whereas|constitutes?|means|acknowledges?|indicates?|represents?|warrants?|including|following|appear|appears|page|pages|refer|attached)\b/i;
const ROLE_RE = /\b(buyer|seller|homeowner|home owner|owner|client|customer|contractor|landlord|tenant|lessee|lessor|witness|employee|employer|borrower|lender|representative|purchaser|vendor|guarantor|subcontractor|party [ab12]|signer \d)\b/i;
const AGREE_RE = /\b(agree|acknowledg|accept|consent|understand|authori[sz]e|certif)/i;
const NOT_SIGNING_DATE = /\b(effective|start|starting|end|ending|completion|closing|due|expir\w*|birth|delivery|installation|service|move|install|begin|commence\w*)\b/i;

const clean = (s: string) => s.replace(/[_–—\-]{3,}|\.{4,}/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s: string) => clean(s).split(/\s+/).filter(Boolean);
const overlapX = (a1: number, a2: number, b1: number, b2: number) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));

export interface Classified { type: FieldType; label: string; strength: number }

/**
 * Maps label text to a field type. Returns null when the text is not a recognizable field label.
 * `strength` (0..1) says how label-like the text is (short "Signature:" vs a sentence).
 */
export function classifyLabel(raw: string): Classified | null {
  const t = clean(raw).replace(/[:•*]+\s*$/, '').trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const w = lower.split(/\s+/);
  const stripped = lower.replace(ROLE_RE, '').replace(/\b(of|the|and|for|your|print|printed|authorized|authorised|full|legal)\b/g, '').replace(/[()\[\]:#\d.,/]/g, '').replace(/\s+/g, ' ').trim();
  const shortish = w.length <= 4 ? 1 : w.length <= 6 ? 0.8 : w.length <= 9 ? 0.5 : 0.25;
  const m = (type: FieldType, label: string, base: number): Classified => ({ type, label, strength: Math.min(1, base * shortish) });

  if (/\binitials?\b/.test(lower) && !/\binitial (?:deposit|payment|fee|cost)\b/.test(lower)) return m('initials', 'Initials', 0.9);
  if (/\bdate\b|\bdated\b/.test(lower) && !/\b(update|candidate)\b/.test(lower)) {
    if (NOT_SIGNING_DATE.test(lower)) return m('text', t.replace(/^\w/, (c) => c.toUpperCase()), 0.6);
    return m('date', 'Date signed', /\bdate( signed)?\b/.test(lower) ? 0.9 : 0.6);
  }
  if (/\bsignature\b|\bsign here\b|\bsigned by\b|\bsign:?$/.test(lower) || /^(?:x|by)$/.test(stripped) && /^(?:by|x)\b/.test(lower)) {
    const weak = /^(?:x|by)$/.test(stripped) || /\bsigned by\b/.test(lower);
    return m('signature', 'Signature', weak ? 0.65 : 0.95);
  }
  if (/\bprint(?:ed)?\b/.test(lower) && /\bname\b/.test(lower)) return m('name', 'Printed name', 0.95);
  if (/\bname\b.*\(print/.test(lower)) return m('name', 'Printed name', 0.95);
  if (/\b(?:full|legal) name\b/.test(lower) || /\bname of (?:the )?(?:signer|signatory|buyer|seller|owner|homeowner|client|customer|contractor|representative|party)\b/.test(lower)) return m('name', 'Printed name', 0.85);
  if (/^(?:your |signer(?:'s)? |customer |client |homeowner |owner |buyer |seller )?name$/.test(stripped === 'name' ? 'name' : lower.replace(ROLE_RE, 'name').replace(/\s+/g, ' ').trim()) || stripped === 'name') return m('name', 'Printed name', 0.6);
  if (/^(?:job )?title\b/.test(lower) || /\b(?:position|capacity)\b/.test(lower) && w.length <= 3) return m('text', 'Title', 0.8);
  if (/\b(?:company|business|firm|organi[sz]ation|entity)(?: name)?\b/.test(lower) && w.length <= 4) return m('text', 'Company name', 0.8);
  return null;
}

const SIZES: Record<FieldType, { h: number; maxW: number; minW: number }> = {
  signature: { h: 34, maxW: 240, minW: 110 },
  initials: { h: 28, maxW: 80, minW: 44 },
  name: { h: 18, maxW: 260, minW: 80 },
  date: { h: 18, maxW: 130, minW: 70 },
  text: { h: 18, maxW: 260, minW: 80 },
  checkbox: { h: 14, maxW: 14, minW: 8 },
};

function buildSegments(runs: TextRun[]): Segment[] {
  const sorted = [...runs].filter((r) => r.str.trim().length > 0).sort((a, b) => a.baseline - b.baseline || a.x - b.x);
  const rows: TextRun[][] = [];
  for (const r of sorted) {
    const row = rows.find((row0) => Math.abs(row0[0].baseline - r.baseline) <= Math.max(2, 0.4 * r.size));
    if (row) row.push(r); else rows.push([r]);
  }
  const segs: Segment[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let cur: TextRun[] = [];
    const flush = () => {
      if (!cur.length) return;
      let text = '';
      for (let i = 0; i < cur.length; i++) {
        const r = cur[i];
        if (i > 0) {
          const p = cur[i - 1];
          const gap = r.x - (p.x + p.w);
          if (gap > 0.12 * r.size && !/\s$/.test(text) && !/^\s/.test(r.str)) text += ' ';
        }
        text += r.str;
      }
      const size = Math.max(...cur.map((c) => c.size));
      const last = cur[cur.length - 1];
      const baseline = cur[0].baseline;
      segs.push({ text, runs: cur, x1: cur[0].x, x2: last.x + last.w, baseline, size, top: baseline - size * 0.9, bottom: baseline + size * 0.25 });
      cur = [];
    };
    for (const r of row) {
      const prev = cur[cur.length - 1];
      if (prev && r.x - (prev.x + prev.w) > Math.max(2.4 * r.size, 22)) flush();
      cur.push(r);
    }
    flush();
  }
  return segs.sort((a, b) => a.baseline - b.baseline || a.x1 - b.x1);
}

function underscoreSlots(seg: Segment, idBase: string): Slot[] {
  const slots: Slot[] = [];
  seg.runs.forEach((run, ri) => {
    const re = /[_\u2013\u2014\-]{3,}|(?:\.\s?){6,}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(run.str))) {
      const len = Math.max(1, run.str.length);
      const x1 = run.x + (run.w * m.index) / len;
      const x2 = run.x + (run.w * (m.index + m[0].length)) / len;
      if (x2 - x1 >= 24) slots.push({ kind: 'underscore', x1, x2, y: run.baseline + 1.5, relation: 'right', id: `${idBase}:u${ri}:${m.index}` });
    }
  });
  return slots;
}

function roleFor(seg: Segment, segs: Segment[]): string | null {
  const own = ROLE_RE.exec(clean(seg.text));
  if (own) return own[1].toLowerCase().replace('home owner', 'homeowner');
  const above = segs
    .filter((s) => s !== seg && s.baseline < seg.baseline && seg.baseline - s.baseline <= 150 && words(s.text).length <= 4 && Math.abs(s.x1 - seg.x1) <= 140)
    .sort((a, b) => b.baseline - a.baseline);
  for (const s of above) {
    const r = ROLE_RE.exec(clean(s.text));
    if (r) return r[1].toLowerCase().replace('home owner', 'homeowner');
  }
  return null;
}

/** Fraction of `r` covered by text runs other than those in `ignore`. */
function textOverlap(r: Box, layout: PageLayout, ignore: Set<TextRun>): number {
  let covered = 0;
  for (const run of layout.runs) {
    if (ignore.has(run) || !run.str.trim()) continue;
    const t = { x: run.x, y: run.baseline - run.size * 0.8, w: run.w, h: run.size };
    const ox = overlapX(r.x, r.x + r.w, t.x, t.x + t.w);
    const oy = overlapX(r.y, r.y + r.h, t.y, t.y + t.h);
    covered += ox * oy;
  }
  return covered / Math.max(1, r.w * r.h);
}

export function suggestFields(layout: PageLayout): Suggestion[] {
  const segs = buildSegments(layout.runs);
  const out: Suggestion[] = [];
  const usedSlots = new Set<string>();
  const lines = layout.lines.filter((l) => l.x2 - l.x1 >= 30 && l.x2 - l.x1 <= layout.width * 0.7);
  let groupSeq = 0;

  // ---- checkboxes (vector squares + glyphs) ------------------------------------------------
  const squares = layout.boxes.filter((b) => b.w >= 6 && b.w <= 22 && b.h >= 6 && b.h <= 22 && Math.abs(b.w - b.h) <= 2.5);
  const checkCandidates: { box: Box; viaGlyph: boolean }[] = squares.map((box) => ({ box, viaGlyph: false }));
  for (const seg of segs) {
    for (const run of seg.runs) {
      for (let i = 0; i < run.str.length; i++) {
        if (GLYPH_BOXES.test(run.str[i])) {
          const cw = run.w / Math.max(1, run.str.length);
          const size = Math.max(9, Math.min(16, run.size));
          checkCandidates.push({ box: { x: run.x + cw * i, y: run.baseline - size * 0.85, w: size * 0.9, h: size * 0.9 }, viaGlyph: true });
        }
      }
    }
  }
  const rows = new Map<number, { box: Box; label: string }[]>();
  for (const { box } of checkCandidates) {
    const cy = box.y + box.h / 2;
    const ignore = new Set<TextRun>();
    const following = segs
      .filter((s) => s.runs.some((r) => r.x >= box.x + box.w - 2 && r.x <= box.x + box.w + 24 && Math.abs(r.baseline - (box.y + box.h)) <= Math.max(5, box.h * 0.8)))
      .sort((a, b) => a.x1 - b.x1)[0];
    let label = '';
    if (following) {
      const nextBox = checkCandidates.map((c) => c.box.x).filter((x) => x > box.x + box.w + 24 && Math.abs(box.y - checkCandidates.find((c) => c.box.x === x)!.box.y) < 8).sort((a, b) => a - b)[0] ?? Infinity;
      const picked = following.runs.filter((r) => r.x >= box.x + box.w - 2 && r.x < nextBox - 2);
      picked.forEach((r) => ignore.add(r));
      label = clean(picked.map((r) => r.str).join(' ').replace(GLYPH_BOXES, ''));
    }
    const key = Math.round(cy / 6);
    const arr = rows.get(key) ?? [];
    arr.push({ box, label });
    rows.set(key, arr);
  }
  for (const arr of rows.values()) {
    arr.sort((a, b) => a.box.x - b.box.x);
    const yesNo = arr.length >= 2 && arr.every((c) => /^(yes|no|n\/?a|none)$/i.test(c.label));
    const gk = yesNo ? `choice-${++groupSeq}` : null;
    for (const { box, label } of arr) {
      if (!label && !yesNo) continue; // a bare square with no label is probably decoration
      const agree = AGREE_RE.test(label);
      const conf = label ? (agree ? 0.85 : 0.72) : 0.5;
      out.push({
        type: 'checkbox', rect: { x: box.x, y: box.y, w: Math.max(box.w, 10), h: Math.max(box.h, 10) },
        label: label.slice(0, 80) || 'Checkbox', required: agree && !yesNo, group_key: gk, confidence: yesNo ? Math.min(conf, 0.7) : conf,
        needs_review: yesNo || conf < CONFIDENT, role_hint: null,
        note: yesNo ? 'Looks like a Yes/No choice. Confirm it should be exclusive and whether it is required.'
          : agree ? 'Agreement checkbox: the signer must tick it themselves.' : 'Checkbox found next to text; confirm it belongs to a signer.',
      });
    }
  }

  // ---- label + slot fields -----------------------------------------------------------------
  interface Cand { seg: Segment; cls: Classified; slot: Slot | null; score: number; prose: boolean; labelStart: number; labelEnd: number }
  const cands: Cand[] = [];
  segs.forEach((seg, si) => {
    const us = underscoreSlots(seg, `s${si}`);
    const text = clean(seg.text);
    if (!text) return;
    const nWords = words(text).length;
    // "Name: ____ Title: ____" in ONE run: split the text at each recognised label to classify each separately.
    const parts = splitOnLabels(seg);
    for (const part of parts) {
      const cls = classifyLabel(part.text);
      if (!cls) continue;
      const prose = PROSE.test(part.text) || nWords > 10;
      const endsColon = /[:•]\s*(?:[_.\-\s]*)$/.test(seg.text.trim()) || /:\s*[_.\-]{3,}/.test(seg.text);
      let slot: Slot | null = null;
      const partSlots = us.filter((s) => s.x1 >= part.x1 - 1 && (part.x2 === Infinity || s.x1 <= part.x2 + 6)).sort((a, b) => a.x1 - b.x1);
      const labelRight = part.labelEnd;
      // (a) underscore run to the right of this label
      slot = partSlots.find((s) => s.x1 >= labelRight - 2) ?? null;
      // (b) rule just under the baseline starting right of the label
      if (!slot) {
        const l = lines.filter((ln) => Math.abs(ln.y - (seg.baseline + 2)) <= Math.max(4, seg.size * 0.45) && ln.x1 >= labelRight - 4 && ln.x1 <= labelRight + 70)
          .sort((a, b) => a.x1 - b.x1)[0];
        if (l) slot = { kind: 'line', x1: l.x1, x2: l.x2, y: l.y, relation: 'right', id: `l:${l.x1.toFixed(0)}:${l.y.toFixed(0)}` };
      }
      // (c) rule ABOVE the label (label printed under the line)
      if (!slot) {
        const l = lines
          .filter((ln) => ln.y <= seg.top + seg.size * 0.3 && seg.top - ln.y <= 34 && overlapX(ln.x1, ln.x2, part.x1, Math.min(part.labelEnd, part.x1 + 400)) >= 0.35 * Math.max(10, part.labelEnd - part.x1))
          .sort((a, b) => b.y - a.y)[0];
        if (l) slot = { kind: 'line', x1: l.x1, x2: l.x2, y: l.y, relation: 'above', id: `l:${l.x1.toFixed(0)}:${l.y.toFixed(0)}` };
      }
      // (d) box to the right, or containing the label
      if (!slot) {
        const b = layout.boxes
          .filter((bx) => bx.w >= 50 && bx.h >= 12 && bx.h <= 70 && !(bx.w < 24))
          .filter((bx) => (bx.x >= labelRight - 4 && bx.x - labelRight <= 16 && bx.y - 6 <= seg.baseline && bx.y + bx.h + 6 >= seg.baseline - seg.size) || (bx.x <= part.x1 + 2 && bx.x + bx.w >= labelRight && bx.y <= seg.top + 2 && bx.y + bx.h >= seg.baseline))
          .sort((a, b) => a.w * a.h - b.w * b.h)[0];
        if (b) slot = { kind: 'box', x1: b.x, x2: b.x + b.w, y: b.y + b.h, top: b.y, relation: 'box', id: `b:${b.x.toFixed(0)}:${b.y.toFixed(0)}` };
      }
      // (e) rule BELOW the label (label printed above the line)
      if (!slot) {
        const l = lines
          .filter((ln) => ln.y >= seg.baseline + seg.size * 0.3 && ln.y - seg.baseline <= 38 && overlapX(ln.x1, ln.x2, part.x1, Math.min(part.labelEnd, part.x1 + 400)) >= 0.35 * Math.max(10, part.labelEnd - part.x1))
          .sort((a, b) => a.y - b.y)[0];
        if (l) slot = { kind: 'line', x1: l.x1, x2: l.x2, y: l.y, relation: 'below', id: `l:${l.x1.toFixed(0)}:${l.y.toFixed(0)}` };
      }
      let score = 0.35 * cls.strength + 0.2;
      if (cls.type === 'signature') score += 0.05;
      if (slot) score += slot.relation === 'right' ? 0.32 : slot.relation === 'above' ? 0.3 : slot.relation === 'box' ? 0.28 : 0.2;
      if (endsColon) score += 0.08;
      if (prose) score *= 0.35;
      if (!slot && !(endsColon && cls.strength >= 0.8 && (cls.type === 'signature' || cls.type === 'initials'))) score = Math.min(score, 0.3);
      cands.push({ seg, cls, slot, score, prose, labelStart: part.x1, labelEnd: part.labelEnd });
    }
  });

  cands.sort((a, b) => b.score - a.score);
  for (const c of cands) {
    if (c.score < MIN_KEEP) continue;
    if (c.slot && usedSlots.has(c.slot.id)) continue;
    const sz = SIZES[c.cls.type];
    let rect: Box;
    if (c.slot && c.slot.kind === 'box') {
      rect = { x: c.slot.x1 + 1, y: (c.slot.top ?? c.slot.y - sz.h) + 1, w: c.slot.x2 - c.slot.x1 - 2, h: Math.max(10, c.slot.y - (c.slot.top ?? 0) - 2) };
      if (c.slot.relation === 'box' && c.slot.x1 <= c.labelStart + 2) {
        // label inside the box: use the area to the right of the label
        rect = { x: Math.min(c.labelEnd + 6, c.slot.x2 - sz.minW), y: rect.y, w: Math.max(sz.minW, c.slot.x2 - Math.min(c.labelEnd + 6, c.slot.x2 - sz.minW) - 2), h: rect.h };
      }
    } else if (c.slot) {
      const w = Math.max(sz.minW, Math.min(sz.maxW, c.slot.x2 - c.slot.x1));
      const bottom = c.slot.y - 1.5;
      rect = { x: c.slot.x1 + 1, y: bottom - sz.h, w, h: sz.h };
    } else {
      rect = { x: c.labelEnd + 6, y: c.seg.baseline - sz.h + 3, w: sz.maxW > 200 ? 170 : sz.maxW, h: sz.h };
    }
    // keep the box clear of the label and the paragraph above it
    const ownRuns = new Set(c.seg.runs);
    const above = layout.runs.filter((r) => !ownRuns.has(r) && r.str.trim() && r.baseline < rect.y + rect.h - 1 && overlapX(rect.x, rect.x + rect.w, r.x, r.x + r.w) > 2 && r.baseline > rect.y - 2);
    if (above.length) {
      const lowest = Math.max(...above.map((r) => r.baseline + r.size * 0.25));
      const newTop = Math.max(rect.y, lowest + 1);
      if (rect.y + rect.h - newTop >= 14) { rect.h = rect.y + rect.h - newTop; rect.y = newTop; }
    }
    if (c.slot?.relation === 'below' || c.slot?.relation === 'above') {
      const labelTop = c.seg.top;
      if (c.slot.relation === 'below' && rect.y < c.seg.baseline + 2) {
        const nt = c.seg.baseline + 3;
        if (rect.y + rect.h - nt >= 12) { rect.h = rect.y + rect.h - nt; rect.y = nt; }
      }
      void labelTop;
    }
    rect.x = Math.max(0, Math.min(rect.x, layout.width - 8));
    rect.w = Math.min(rect.w, layout.width - rect.x);
    rect.y = Math.max(0, rect.y);
    if (rect.w < 8 || rect.h < 8) continue;
    const overlap = textOverlap(rect, layout, ownRuns);
    let conf = c.score;
    if (overlap > 0.25) conf -= 0.2;
    conf = Math.max(0, Math.min(0.97, conf));
    if (conf < MIN_KEEP) continue;
    if (c.slot) usedSlots.add(c.slot.id);
    const note = !c.slot ? 'No line or box found next to this label; position is a guess.'
      : c.slot.relation === 'below' ? 'Line sits below the label; check the field is where the signer should write.'
      : overlap > 0.25 ? 'Overlaps printed text; check placement.' : c.prose ? 'Label appears inside a sentence; may not be a signing field.' : null;
    out.push({
      type: c.cls.type, rect, label: c.cls.label, required: c.cls.type !== 'text' || /^(Company name|Title)$/.test(c.cls.label) ? true : false,
      group_key: null, confidence: Math.round(conf * 100) / 100, needs_review: conf < CONFIDENT || !c.slot || c.prose,
      role_hint: roleFor(c.seg, segs), note,
    });
  }
  return dedupe(out);
}

/** Splits a segment at each recognised label so "Name: ___ Title: ___" yields two label parts. */
function splitOnLabels(seg: Segment): { text: string; x1: number; x2: number; labelEnd: number }[] {
  const single = [{ text: seg.text.replace(/[_–—\-]{3,}|(?:\.\s?){6,}/g, ' '), x1: seg.x1, x2: Infinity, labelEnd: labelEndOf(seg, seg.x1, Infinity) }];
  // Only split when several separate label words occur in one run (producers that emit a line as one run).
  const full = seg.text;
  const re = /(?:^|[\s_])((?:printed |print )?name|title|date(?: signed)?|company(?: name)?|signature|initials)\s*:/gi;
  const hits: { idx: number; len: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(full))) hits.push({ idx: m.index + m[0].indexOf(m[1]), len: m[0].length - (m[0].indexOf(m[1])) });
  if (hits.length < 2 || seg.runs.length !== 1) return single;
  const run = seg.runs[0];
  const len = Math.max(1, run.str.length);
  return hits.map((h, i) => {
    const end = i + 1 < hits.length ? hits[i + 1].idx : full.length;
    const x1 = run.x + (run.w * h.idx) / len;
    const x2 = run.x + (run.w * end) / len;
    return { text: full.slice(h.idx, end).replace(/[_–—\-]{3,}/g, ' '), x1, x2, labelEnd: run.x + (run.w * (h.idx + h.len)) / len };
  });
}

function labelEndOf(seg: Segment, x1: number, x2: number): number {
  let end = x1;
  for (const r of seg.runs) {
    if (r.x < x1 - 1 || r.x > x2) continue;
    const m = /[_–—\-]{3,}|(?:\.\s?){6,}/.exec(r.str);
    if (m) { end = Math.max(end, r.x + (r.w * m.index) / Math.max(1, r.str.length)); break; }
    end = Math.max(end, r.x + r.w);
  }
  return end;
}

function iou(a: Box, b: Box) {
  const ox = overlapX(a.x, a.x + a.w, b.x, b.x + b.w), oy = overlapX(a.y, a.y + a.h, b.y, b.y + b.h);
  const inter = ox * oy;
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
}

function dedupe(list: Suggestion[]): Suggestion[] {
  const sorted = [...list].sort((a, b) => b.confidence - a.confidence);
  const kept: Suggestion[] = [];
  for (const s of sorted) if (!kept.some((k) => iou(k.rect, s.rect) > 0.3)) kept.push(s);
  return kept.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
}

export { iou as rectIou };
