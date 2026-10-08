/**
 * Normalizes stored section JSON + resolved variable values into one simple block model.
 * BOTH the HTML preview (components/contracts/document-view.tsx) and the PDF generator (pdf.ts) render from
 * this model, so structure, numbering, merged text and page breaks are identical in both.
 */
import type { ContractSection, DocNode } from '@/lib/contracts/types';
import { PLACEHOLDER } from '@/lib/contracts/variables';

export interface Run { text: string; b?: boolean; i?: boolean; u?: boolean; /** unresolved merge field */ missing?: boolean; /** [REVIEW: ...] passage */ review?: boolean }
export type Block =
  | { t: 'heading'; level: 1 | 2 | 3; runs: Run[] }
  | { t: 'para'; runs: Run[] }
  | { t: 'list'; ordered: boolean; start: number; items: Block[][] }
  | { t: 'table'; rows: { cells: { header: boolean; colspan: number; blocks: Block[] }[] }[] }
  | { t: 'pageBreak' }
  | { t: 'rule' }
  | { t: 'logo'; which: 'client' | 'homequote' }
  | { t: 'signatures' };

export interface RenderSection { id: string; title: string | null; kind: 'rich' | 'signatures'; pageBreakBefore: boolean; blocks: Block[] }
export interface RenderModel { sections: RenderSection[] }

const TOKEN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

interface Styled { ch: string; b?: boolean; i?: boolean; u?: boolean; missing?: boolean }

function inlineChars(nodes: DocNode[] | undefined): Styled[] {
  const out: Styled[] = [];
  for (const n of nodes ?? []) {
    if (n.type === 'hardBreak') { out.push({ ch: '\n' }); continue; }
    if (n.type !== 'text' || !n.text) continue;
    const m = new Set((n.marks ?? []).map((x) => x.type));
    for (const ch of n.text) out.push({ ch, b: m.has('bold') || undefined, i: m.has('italic') || undefined, u: m.has('underline') || undefined });
  }
  return out;
}

function coalesce(chars: Styled[]): Run[] {
  const runs: Run[] = [];
  const mark = (text: string) => {
    // [REVIEW: ...] passages get their own flag so previews can highlight them
    return text;
  };
  for (const c of chars) {
    const last = runs[runs.length - 1];
    if (last && !!last.b === !!c.b && !!last.i === !!c.i && !!last.u === !!c.u && !!last.missing === !!c.missing) last.text += c.ch;
    else runs.push({ text: mark(c.ch), ...(c.b ? { b: true } : {}), ...(c.i ? { i: true } : {}), ...(c.u ? { u: true } : {}), ...(c.missing ? { missing: true } : {}) });
  }
  return splitReview(runs);
}

/** Splits runs so that "[REVIEW: ...]" passages are separate runs flagged `review`. */
function splitReview(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    let last = 0;
    for (const m of r.text.matchAll(PLACEHOLDER)) {
      const idx = m.index ?? 0;
      if (idx > last) out.push({ ...r, text: r.text.slice(last, idx) });
      out.push({ ...r, text: m[0], review: true });
      last = idx + m[0].length;
    }
    if (last < r.text.length) out.push({ ...r, text: r.text.slice(last) });
  }
  return out;
}

/** Replaces {{tokens}} by values (style of the token's first character); unresolved tokens stay visible and flagged. */
export function substitute(chars: Styled[], values: Record<string, string>): Styled[] {
  const text = chars.map((c) => c.ch).join('');
  const out: Styled[] = [];
  let pos = 0;
  // chars are code points, `text` indexes UTF-16: walk by code point offsets
  const cpIndex: number[] = [];
  { let u = 0; for (const c of chars) { cpIndex.push(u); u += c.ch.length; } cpIndex.push(u); }
  const unitToCp = (u: number) => { let lo = 0, hi = cpIndex.length - 1; while (lo < hi) { const mid = (lo + hi) >> 1; if (cpIndex[mid] < u) lo = mid + 1; else hi = mid; } return lo; };
  for (const m of text.matchAll(TOKEN)) {
    const s = unitToCp(m.index ?? 0), e = unitToCp((m.index ?? 0) + m[0].length);
    for (let i = pos; i < s; i++) out.push(chars[i]);
    const key = m[1].toLowerCase();
    const style = chars[s];
    if (key in values) for (const ch of values[key]) out.push({ ...style, ch });
    else for (const ch of m[0]) out.push({ ...style, ch, missing: true });
    pos = e;
  }
  for (let i = pos; i < chars.length; i++) out.push(chars[i]);
  return out;
}

const subText = (text: string, values: Record<string, string>) => text.replace(TOKEN, (m, k: string) => (k.toLowerCase() in values ? values[k.toLowerCase()] : m));

function inlineRuns(node: DocNode, values: Record<string, string>): Run[] {
  return coalesce(substitute(inlineChars(node.content), values));
}

function blocksOf(nodes: DocNode[] | undefined, values: Record<string, string>): Block[] {
  const out: Block[] = [];
  for (const n of nodes ?? []) {
    switch (n.type) {
      case 'paragraph': {
        const raw = (n.content ?? []).map((c) => (c.type === 'text' ? c.text ?? '' : '')).join('').trim();
        const logo = /^\{\{\s*(client_logo|homequote_logo)\s*\}\}$/i.exec(raw);
        if (logo) { out.push({ t: 'logo', which: logo[1].toLowerCase() === 'client_logo' ? 'client' : 'homequote' }); break; }
        out.push({ t: 'para', runs: inlineRuns(n, values) });
        break;
      }
      case 'heading': {
        const level = (n.attrs?.level === 1 ? 1 : n.attrs?.level === 3 ? 3 : 2) as 1 | 2 | 3;
        out.push({ t: 'heading', level, runs: inlineRuns(n, values) });
        break;
      }
      case 'bulletList':
      case 'orderedList':
        out.push({
          t: 'list', ordered: n.type === 'orderedList', start: Number(n.attrs?.start) > 1 ? Number(n.attrs?.start) : 1,
          items: (n.content ?? []).filter((li) => li.type === 'listItem').map((li) => blocksOf(li.content, values)),
        });
        break;
      case 'table':
        out.push({
          t: 'table',
          rows: (n.content ?? []).filter((r) => r.type === 'tableRow').map((r) => ({
            cells: (r.content ?? []).filter((c) => c.type === 'tableCell' || c.type === 'tableHeader').map((c) => ({
              header: c.type === 'tableHeader', colspan: Number(c.attrs?.colspan) > 1 ? Number(c.attrs?.colspan) : 1, blocks: blocksOf(c.content, values),
            })),
          })).filter((r) => r.cells.length > 0),
        });
        break;
      case 'pageBreak': out.push({ t: 'pageBreak' }); break;
      case 'horizontalRule': out.push({ t: 'rule' }); break;
      default: break;
    }
  }
  return out;
}

export function buildRenderModel(sections: ContractSection[], values: Record<string, string>): RenderModel {
  let n = 0;
  return {
    sections: sections.map((s) => {
      const numbered = s.kind === 'rich' && s.showTitle && s.numbered && !!s.title.trim();
      if (numbered) n += 1;
      const title = s.showTitle && s.title.trim() ? `${numbered ? `${n}. ` : ''}${subText(s.title.trim(), values)}` : null;
      const blocks = blocksOf(s.doc.content, values);
      if (s.kind === 'signatures') blocks.push({ t: 'signatures' });
      return { id: s.id, title, kind: s.kind, pageBreakBefore: s.pageBreakBefore, blocks };
    }),
  };
}

export const runsText = (runs: Run[]) => runs.map((r) => r.text).join('');
