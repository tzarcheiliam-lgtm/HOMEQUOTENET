'use client';

import { Fragment, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Check, Copy } from 'lucide-react';

/**
 * A deliberately tiny, safe renderer for the assistant’s replies: paragraphs, lists, bold, code and links. No raw HTML is
 * ever inserted. Links are limited to in-app /app pages, the Meta connect start URL, and https:// addresses.
 */
const INTERNAL = /^\/app(\/[A-Za-z0-9._~\-/#?=&%]*)?$/;
const CONNECT = /^\/api\/integrations\/meta\/connect\/start(\?[A-Za-z0-9._~\-=&%]*)?$/;
const EXTERNAL = /^https:\/\/[^\s"'<>]+$/;

function renderLink(label: string, href: string, key: string): ReactNode {
  const cls = 'underline underline-offset-2 text-sky-300 hover:text-sky-200';
  if (INTERNAL.test(href)) return <Link key={key} href={href} className={cls}>{label}</Link>;
  if (CONNECT.test(href)) return <a key={key} href={href} className={cls}>{label}</a>;
  if (EXTERNAL.test(href)) return <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>;
  return <Fragment key={key}>{label}</Fragment>;
}

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0; let i = 0;
  for (const m of text.matchAll(re)) {
    if ((m.index ?? 0) > last) out.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1]) out.push(<strong key={key}>{m[1]}</strong>);
    else if (m[2]) out.push(<code key={key} className="rounded bg-white/10 px-1 py-0.5 text-[0.85em]">{m[2]}</code>);
    else out.push(renderLink(m[3], m[4], key));
    last = (m.index ?? 0) + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function DraftCard({ kind, initial }: { kind: 'text' | 'email'; initial: string }) {
  const [value, setValue] = useState(initial);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard blocked: the text stays selectable */ }
  };
  return (
    <div className="my-2 rounded-lg border border-white/15 bg-white/5 p-2">
      <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wider text-white/60">
        <span>{kind === 'email' ? 'Email draft' : 'Text draft'} · edit before sending</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs normal-case tracking-normal text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300">
          {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}{copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <textarea aria-label={`${kind === 'email' ? 'Email' : 'Text'} draft`} value={value} onChange={e => setValue(e.target.value)} rows={Math.min(14, Math.max(4, value.split('\n').length + 1))}
        className="w-full resize-y rounded-md border border-white/10 bg-black/20 p-2 text-sm text-white outline-none focus:border-sky-300" />
      <p className="mt-1 text-[11px] text-white/50">The assistant can’t send this. Copy it into your phone or email.</p>
    </div>
  );
}

export function RichText({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  const fence = /```([a-z]+(?::[a-z]+)?)?\n([\s\S]*?)```/g;
  let last = 0; let idx = 0;
  const pushBlocks = (chunk: string) => {
    const lines = chunk.split('\n');
    let para: string[] = []; let list: { ordered: boolean; items: string[] } | null = null;
    const flushPara = () => { if (para.length) { parts.push(<p key={`p${idx++}`} className="my-1.5 whitespace-pre-wrap">{inline(para.join('\n'), `p${idx}`)}</p>); para = []; } };
    const flushList = () => {
      if (!list) return;
      const Tag = list.ordered ? 'ol' : 'ul';
      parts.push(<Tag key={`l${idx++}`} className={`my-1.5 ml-5 space-y-0.5 ${list.ordered ? 'list-decimal' : 'list-disc'}`}>{list.items.map((it, n) => <li key={n}>{inline(it, `li${idx}-${n}`)}</li>)}</Tag>);
      list = null;
    };
    for (const line of lines) {
      const bullet = /^\s*[-*•]\s+(.*)$/.exec(line); const num = /^\s*\d+[.)]\s+(.*)$/.exec(line); const head = /^#{1,3}\s+(.*)$/.exec(line);
      if (bullet || num) { flushPara(); const ordered = !!num; if (list && list.ordered !== ordered) flushList(); list ??= { ordered, items: [] }; list.items.push((bullet ?? num)![1]); continue; }
      flushList();
      if (head) { flushPara(); parts.push(<p key={`h${idx++}`} className="mt-2 font-semibold">{inline(head[1], `h${idx}`)}</p>); continue; }
      if (!line.trim()) { flushPara(); continue; }
      para.push(line);
    }
    flushPara(); flushList();
  };
  for (const m of text.matchAll(fence)) {
    if ((m.index ?? 0) > last) pushBlocks(text.slice(last, m.index));
    const lang = m[1] ?? '';
    if (lang === 'draft:text' || lang === 'draft:email') parts.push(<DraftCard key={`d${idx++}`} kind={lang === 'draft:email' ? 'email' : 'text'} initial={m[2].trim()} />);
    else parts.push(<pre key={`c${idx++}`} className="my-2 overflow-x-auto rounded-md bg-black/30 p-2 text-xs">{m[2]}</pre>);
    last = (m.index ?? 0) + m[0].length;
  }
  if (last < text.length) pushBlocks(text.slice(last));
  return <div className="text-sm leading-relaxed">{parts}</div>;
}
