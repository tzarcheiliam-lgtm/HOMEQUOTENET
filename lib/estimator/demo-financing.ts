/**
 * DEMO-ONLY example financing on the pool funnel's price card. Shown only when
 * the page was opened with ?demo=financing (kept for the tab in
 * sessionStorage, so it survives the landing -> /design -> contact -> booking
 * navigation); ?demo=off clears it. Without the flag nothing changes: the card
 * keeps "Financing available". The terms are the contractor's example
 * (FunnelBookingStep.exampleFinancing in content/estimators/*), to be replaced
 * by real lender terms; this is never an offer of credit.
 * Pure helpers + guarded browser storage (never throws).
 */

export interface ExampleFinancing {
  /** APR in percent, e.g. 8.99. */
  apr: number;
  /** Term in months, e.g. 180. */
  months: number;
  /** Line under the range; "{monthly}" -> "$649". */
  label: string;
  /** Fine print; {apr}, {months}, {perThousand} are filled in. */
  disclosure: string;
}

/** Standard amortized monthly payment (exact, unrounded). */
export function monthlyPayment(principal: number, aprPercent: number, months: number): number {
  if (!(principal > 0) || !(months > 0)) return 0;
  const r = aprPercent / 100 / 12;
  if (r === 0) return principal / months;
  const f = (1 + r) ** months;
  return (principal * r * f) / (f - 1);
}

/** The example payment on a price, rounded UP to whole dollars ($64,000 -> $649 at 8.99% / 180). */
export const exampleMonthly = (principal: number, terms: Pick<ExampleFinancing, 'apr' | 'months'>) =>
  Math.ceil(monthlyPayment(principal, terms.apr, terms.months) - 1e-9);

/** Payment per $1,000 financed, to the cent ($10.14 at 8.99% / 180). */
export const perThousand = (terms: Pick<ExampleFinancing, 'apr' | 'months'>) =>
  Math.round(monthlyPayment(1000, terms.apr, terms.months) * 100) / 100;

const usd = (n: number, cents = false) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });

/** "or from $649/mo*" for the low end of the range, or null without a usable price. */
export function exampleFinancingLine(low: number | null | undefined, terms: ExampleFinancing): string | null {
  if (typeof low !== 'number' || !(low > 0)) return null;
  return terms.label.replaceAll('{monthly}', usd(exampleMonthly(low, terms)));
}

/** The fine print with the numbers filled in. */
export function exampleFinancingDisclosure(terms: ExampleFinancing): string {
  return terms.disclosure
    .replaceAll('{apr}', `${terms.apr}%`)
    .replaceAll('{months}', String(terms.months))
    .replaceAll('{perThousand}', usd(perThousand(terms), true));
}

export const DEMO_FINANCING_KEY = 'hq-demo:financing';

/** What a query string says: true for demo=financing, false for demo=off / none, null when silent. */
export function demoFinancingFromSearch(search: string): boolean | null {
  let v: string | null = null;
  try {
    v = new URLSearchParams(search).get('demo');
  } catch {
    return null;
  }
  if (v === null) return null;
  const t = v.trim().toLowerCase();
  if (t.split(',').includes('financing')) return true;
  return t === 'off' || t === 'none' || t === '0' ? false : null;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function tabStorage(): StorageLike | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Reads the flag from the URL (and remembers it for the tab), else from the
 * tab's storage. Call in an effect: the server render never shows the demo.
 */
export function syncDemoFinancing(search: string, storage: StorageLike | null = tabStorage()): boolean {
  const fromUrl = demoFinancingFromSearch(search);
  try {
    if (fromUrl === true) storage?.setItem(DEMO_FINANCING_KEY, '1');
    else if (fromUrl === false) storage?.removeItem(DEMO_FINANCING_KEY);
    return fromUrl ?? storage?.getItem(DEMO_FINANCING_KEY) === '1';
  } catch {
    return fromUrl === true;
  }
}
