/* eslint-disable @next/next/no-img-element */
import { initialsOf } from '@/components/contracts/client-mark';
import type { Block, RenderModel, Run } from '@/lib/contracts/render-model';
import { LOGO_SIZES, type Branding } from '@/lib/contracts/types';
import { cn } from '@/lib/utils';

export interface ViewSigner { role: string; label: string; name: string; email?: string }

const HQ_LOGO = '/assets/brand/hq-logo-horizontal.png';

function RunView({ run }: { run: Run }) {
  let node: React.ReactNode = run.text;
  if (run.u) node = <u>{node}</u>;
  if (run.i) node = <em>{node}</em>;
  if (run.b) node = <strong>{node}</strong>;
  if (run.review) return <mark className="rounded bg-amber-200/80 px-0.5 text-inherit" title="Placeholder - needs review before sending">{node}</mark>;
  if (run.missing) return <span className="rounded bg-red-100 px-0.5 text-red-700" title="This merge field has no value yet">{node}</span>;
  return <>{node}</>;
}
const Runs = ({ runs }: { runs: Run[] }) => <>{runs.map((r, i) => <RunView key={i} run={r} />)}</>;

function LogoSlot({ which, branding, clientName, clientLogoUrl, h }: { which: 'client' | 'homequote'; branding: Branding; clientName: string; clientLogoUrl: string | null; h: number }) {
  void branding;
  const url = which === 'client' ? clientLogoUrl : HQ_LOGO;
  const name = which === 'client' ? clientName || 'Client' : 'HomeQuote Network';
  if (url) return <img src={url} alt={`${name} logo`} style={{ height: h, maxWidth: 190 * 1.3 }} className="w-auto object-contain" />;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="flex items-center justify-center rounded-md border bg-slate-100 font-semibold text-slate-800" style={{ width: h, height: h, fontSize: h * 0.4 }} aria-hidden="true">{initialsOf(name)}</span>
      <span className="max-w-[9rem] text-sm font-semibold leading-tight text-slate-800">{name}</span>
    </span>
  );
}

/** Both logos side by side (or one / none), exactly as the PDF header lays them out. */
export function LogoHeader({ branding, clientName, clientLogoUrl, className }: { branding: Branding; clientName: string; clientLogoUrl: string | null; className?: string }) {
  const h = LOGO_SIZES[branding.size] * 1.25;
  const order: ('homequote' | 'client')[] = branding.mode === 'side_by_side' ? (branding.swap ? ['client', 'homequote'] : ['homequote', 'client'])
    : branding.mode === 'homequote_only' ? ['homequote'] : branding.mode === 'client_only' ? ['client'] : [];
  if (!order.length) return null;
  const spread = branding.align === 'spread';
  return (
    <div className={cn('flex flex-wrap items-center gap-x-8 gap-y-3 border-b pb-3', spread && order.length === 2 ? 'justify-between' : 'justify-center', className)} data-testid="logo-header">
      {order.map((w, i) => (
        <div key={w} className={cn('flex items-center', !spread && i === 1 && order.length === 2 && 'border-l pl-8')}>
          <LogoSlot which={w} branding={branding} clientName={clientName} clientLogoUrl={clientLogoUrl} h={h} />
        </div>
      ))}
    </div>
  );
}

function BlockView({ b, signers }: { b: Block; signers: ViewSigner[] }) {
  switch (b.t) {
    case 'para': return b.runs.length && b.runs.some((r) => r.text.trim()) ? <p className="my-2 whitespace-pre-wrap leading-relaxed"><Runs runs={b.runs} /></p> : <div className="h-2" />;
    case 'heading': {
      const cls = b.level === 1 ? 'text-xl' : b.level === 2 ? 'text-lg' : 'text-base';
      return <p role="heading" aria-level={b.level + 1} className={cn('mb-1 mt-4 font-semibold text-slate-900', cls)}><Runs runs={b.runs} /></p>;
    }
    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul';
      return (
        <Tag className={cn('my-2 space-y-1 pl-6', b.ordered ? 'list-decimal' : 'list-disc')} {...(b.ordered && b.start > 1 ? { start: b.start } : {})}>
          {b.items.map((it, i) => <li key={i}>{it.map((x, j) => <BlockView key={j} b={x} signers={signers} />)}</li>)}
        </Tag>
      );
    }
    case 'table':
      return (
        <div className="my-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>
                  {r.cells.map((c, j) => {
                    const Cell = c.header ? 'th' : 'td';
                    return <Cell key={j} colSpan={c.colspan} className={cn('border border-slate-300 px-2 py-1.5 text-left align-top', c.header && 'bg-slate-100 font-semibold')}>{c.blocks.map((x, k) => <BlockView key={k} b={x} signers={signers} />)}</Cell>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'pageBreak': return <div className="my-4 flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400" aria-label="Page break"><span className="h-px flex-1 border-t border-dashed" />Page break<span className="h-px flex-1 border-t border-dashed" /></div>;
    case 'rule': return <hr className="my-3 border-slate-300" />;
    case 'logo': return <div className="my-2 text-xs italic text-slate-400">[{b.which === 'client' ? 'Client' : 'HomeQuote'} logo]</div>;
    case 'signatures':
      return (
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          {signers.map((s, i) => (
            <div key={i} className="break-inside-avoid">
              <p className="font-semibold text-slate-900">{s.label}</p>
              {(s.name || s.email) && <p className="text-xs text-slate-500">{[s.name, s.email].filter(Boolean).join(' · ')}</p>}
              <div className="mt-8 border-b border-slate-800" aria-hidden="true" /><p className="mt-1 text-[11px] text-slate-500">Signature</p>
              <div className="mt-6 border-b border-slate-800" aria-hidden="true" /><p className="mt-1 text-[11px] text-slate-500">Printed name</p>
              <div className="mt-6 w-1/2 border-b border-slate-800" aria-hidden="true" /><p className="mt-1 text-[11px] text-slate-500">Date</p>
            </div>
          ))}
        </div>
      );
  }
}

/**
 * Live HTML preview of an agreement. It renders the SAME normalized model as the PDF generator, so wording,
 * numbering, merged values and page breaks match; exact pagination is shown by the PDF preview.
 */
export function DocumentView({ title, subtitle, model, branding, clientName, clientLogoUrl, signers, className }: {
  title: string; subtitle?: string; model: RenderModel; branding: Branding; clientName: string; clientLogoUrl: string | null; signers: ViewSigner[]; className?: string;
}) {
  return (
    <article className={cn('mx-auto w-full max-w-[820px] rounded-lg bg-white p-5 text-[15px] text-slate-800 shadow-sm ring-1 ring-border sm:p-10 print:shadow-none print:ring-0', className)} aria-label={`Preview of ${title}`}>
      <LogoHeader branding={branding} clientName={clientName} clientLogoUrl={clientLogoUrl} className="mb-6" />
      <h1 className="text-2xl font-bold leading-tight text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-4">
        {model.sections.map((s) => (
          <section key={s.id} className={cn(s.pageBreakBefore && 'mt-8 border-t border-dashed pt-4')}>
            {s.title && <h2 className="mb-1 mt-6 text-lg font-semibold text-slate-900">{s.title}</h2>}
            {s.blocks.map((b, i) => <BlockView key={i} b={b} signers={signers} />)}
          </section>
        ))}
      </div>
    </article>
  );
}
