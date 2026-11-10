'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The "weekly report" card in the homepage hero. The numbers are illustrative
 * (the card says so) and count up once when the card scrolls into view. With
 * reduced motion the final values are shown immediately.
 */
const rows = [
  { label: 'Ad spend', value: 1000, prefix: '$', note: 'paid to Meta / Google' },
  { label: 'Inquiries', value: 26, note: 'qualified by the landing page' },
  { label: 'Booked estimates', value: 9, note: 'on your calendar' },
  { label: 'Showed up', value: 7, note: 'you ran the estimate' },
  { label: 'Estimates sent', value: 6, note: 'tracked to closed jobs' },
];

function useCountUp(target: number, run: boolean) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(target); return; }
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return n;
}

function Row({ r, run, i }: { r: (typeof rows)[number]; run: boolean; i: number }) {
  const n = useCountUp(r.value, run);
  return (
    <li className="mk-report-row" style={{ ['--i' as string]: i }}>
      <div>
        <p className="font-semibold">{r.label}</p>
        <p className="text-xs text-[var(--hq-text-dim)]">{r.note}</p>
      </div>
      <p className="mk-report-n">{r.prefix ?? ''}{n.toLocaleString('en-US')}</p>
    </li>
  );
}

export function WeeklyReport() {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="mk-report">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">Your weekly report</p>
        <span className="mk-chip">Example layout</span>
      </div>
      <ul className="mt-4">
        {rows.map((r, i) => <Row key={r.label} r={r} run={run} i={i} />)}
      </ul>
      <p className="mt-4 text-xs leading-5 text-[var(--hq-text-dim)]">
        Illustrative numbers to show the layout. Not client data or reported results.
      </p>
    </div>
  );
}
