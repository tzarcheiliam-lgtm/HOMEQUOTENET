/**
 * Money conversion for Marketing API amounts. Pure, exact (integer arithmetic on strings, no floating-point drift).
 *
 * WHAT IS DOCUMENTED (https://developers.facebook.com/docs/marketing-api/currencies, fetched 2026-10-07):
 *   - every currency has an "offset": offset 100 = the API unit is 1/100 of the base unit (a bid of "1" on a USD
 *     account is 0.01 USD); offset 1 = the API unit is the base unit (a bid of "1" on a JPY account is 1 JPY).
 *   - the table below is that page's table, verbatim: 11 currencies have offset 1, every other listed currency 100.
 *   - `bid_amount` and campaign `spend_cap` are documented in these units (ad set reference: "in cents for USD and EUR,
 *     basic unit for JPY, KRW"; campaign reference: "integer value of the subunit in your currency").
 *
 * WHAT IS NOT DOCUMENTED: Meta's reference pages never state the unit of `daily_budget` / `lifetime_budget`, and Meta's
 * own sample code is ambiguous. HQN therefore assumes budgets use the same offset (the universally observed behaviour)
 * but treats that as UNVERIFIED: every ad account must pass a human "budget unit check" against a paused probe ad in
 * Ads Manager before any budget can be sent or changed (see budgetUnitGate). Currencies absent from the table are refused.
 */

const OFFSET_1 = ['CLP', 'COP', 'CRC', 'HUF', 'ISK', 'IDR', 'JPY', 'KRW', 'PYG', 'TWD', 'VND'] as const;
const OFFSET_100 = [
  'DZD', 'ARS', 'AUD', 'BHD', 'BDT', 'BOB', 'BGN', 'BRL', 'GBP', 'CAD', 'CNY', 'HRK', 'CZK', 'DKK', 'EGP', 'EUR', 'GTQ', 'HNL', 'HKD', 'INR', 'ILS', 'JOD', 'KES',
  'LVL', 'LTL', 'MOP', 'MYR', 'MXN', 'NZD', 'NIO', 'NGN', 'NOK', 'PKR', 'PEN', 'PHP', 'PLN', 'QAR', 'RON', 'RUB', 'SAR', 'RSD', 'SGD', 'SKK', 'ZAR', 'SEK', 'CHF',
  'THB', 'TRY', 'AED', 'UAH', 'USD', 'UYU', 'VEF', 'FBZ', 'VES',
] as const;

export const CURRENCY_OFFSETS: Readonly<Record<string, 1 | 100>> = Object.freeze({
  ...Object.fromEntries(OFFSET_1.map((c) => [c, 1 as const])),
  ...Object.fromEntries(OFFSET_100.map((c) => [c, 100 as const])),
});

export const currencyOffset = (currency: string | null | undefined): 1 | 100 | null =>
  currency ? (CURRENCY_OFFSETS[currency.toUpperCase()] ?? null) : null;

export type MoneyResult = { ok: true; minor: number } | { ok: false; code: 'currency_unsupported' | 'amount_invalid' | 'too_many_decimals' | 'amount_too_large'; message: string };

const MAX_MINOR = Number.MAX_SAFE_INTEGER;

/**
 * Converts what a person typed (major units, e.g. "25.50") to the API integer. Refuses anything that would need rounding
 * ("25.005" USD, "100.5" JPY) rather than silently changing the amount the person approved.
 */
export function toMinor(input: string | number, currency: string | null | undefined): MoneyResult {
  const offset = currencyOffset(currency);
  if (!offset) return { ok: false, code: 'currency_unsupported', message: `Currency ${currency ?? '(unknown)'} is not in Meta's documented currency table, so amounts cannot be converted safely.` };
  const text = typeof input === 'number' ? (Number.isFinite(input) ? input.toFixed(8).replace(/0+$/, '').replace(/\.$/, '') : '') : input.trim();
  const m = /^(\d{1,12})(?:\.(\d+))?$/.exec(text);
  if (!m) return { ok: false, code: 'amount_invalid', message: 'Enter a positive amount like 25 or 25.50.' };
  const decimals = offset === 100 ? 2 : 0;
  const frac = m[2] ?? '';
  if (frac.replace(/0+$/, '').length > decimals) {
    return { ok: false, code: 'too_many_decimals', message: decimals === 0 ? `${currency} amounts must be whole numbers.` : `${currency} amounts can have at most 2 decimal places.` };
  }
  const minor = Number(m[1]) * offset + (decimals ? Number((frac + '00').slice(0, 2)) : 0);
  if (!Number.isSafeInteger(minor) || minor > MAX_MINOR) return { ok: false, code: 'amount_too_large', message: 'That amount is too large.' };
  return { ok: true, minor };
}

/** The inverse, used to show a person exactly what an API integer means. Returns a fixed-decimals string. */
export function fromMinor(minor: number | string, currency: string | null | undefined): string | null {
  const offset = currencyOffset(currency);
  const n = typeof minor === 'string' ? Number(minor) : minor;
  if (!offset || !Number.isSafeInteger(n) || n < 0) return null;
  if (offset === 1) return String(n);
  const whole = Math.floor(n / 100);
  const cents = String(n % 100).padStart(2, '0');
  return `${whole}.${cents}`;
}

/** Normalizes what a person typed to the canonical string shown back to them ("25" -> "25.00"; JPY "2500" -> "2500"). */
export function canonicalMajor(input: string | number, currency: string | null | undefined): string | null {
  const r = toMinor(input, currency);
  return r.ok ? fromMinor(r.minor, currency) : null;
}

/**
 * The line shown to a person BEFORE confirmation and recorded with it. It is generated from the exact integer that will
 * be sent, so what is displayed and what is submitted cannot diverge.
 */
export function describeAmount(input: string | number, currency: string | null | undefined): { ok: true; display: string; sent: number } | { ok: false; message: string } {
  const r = toMinor(input, currency);
  if (!r.ok) return { ok: false, message: r.message };
  return { ok: true, display: `${fromMinor(r.minor, currency)} ${currency!.toUpperCase()}`, sent: r.minor };
}

// ---- budget-unit gate -------------------------------------------------------------------------------------------------
export type BudgetUnitState = { verifiedCurrency: string | null; verifiedAt: string | null };

/**
 * Budgets (not bids) may be sent only after a human confirmed, for THIS account's currency, that a paused probe ad's budget
 * shows in Ads Manager exactly as entered. A probe draft itself is allowed through (it is how the check is made) but is
 * capped so a wrong unit stays small and, being paused, cannot spend.
 */
export const PROBE_MAX_MAJOR = 5;
export function budgetUnitGate(s: BudgetUnitState & { accountCurrency: string | null; isProbe: boolean; amountMajor?: number }): { allowed: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!currencyOffset(s.accountCurrency)) reasons.push(`The account currency (${s.accountCurrency ?? 'unknown'}) is not in Meta's documented currency table.`);
  if (s.isProbe) {
    if (s.amountMajor != null && s.amountMajor > PROBE_MAX_MAJOR) reasons.push(`A budget-unit probe must be ${PROBE_MAX_MAJOR} or less in the account currency.`);
  } else if (!s.verifiedAt || (s.verifiedCurrency ?? '').toUpperCase() !== (s.accountCurrency ?? '').toUpperCase()) {
    reasons.push('Budget units are not verified for this ad account. Create a budget-unit probe ad, check its budget in Ads Manager, and record the result (Activity & settings).');
  }
  return { allowed: reasons.length === 0, reasons };
}

/**
 * Compares what HQN sent for a probe ad with what the person SAW in Ads Manager. Equal (as exact decimals) means Meta
 * reads the number the way HQN converts it. Anything else - 100x larger, 100x smaller, different currency scale - is
 * reported with the exact figures and keeps budgets blocked: HQN never auto-adapts its conversion to what it observes.
 */
export function evaluateBudgetProbe(entered: string | number, observed: string | number, currency: string | null | undefined):
  { ok: true; match: boolean; entered: string; observed: string; sent: number; message: string } | { ok: false; message: string } {
  const e = toMinor(entered, currency);
  if (!e.ok) return { ok: false, message: e.message };
  const o = toMinor(observed, currency);
  if (!o.ok) return { ok: false, message: `The observed amount is not valid: ${o.message}` };
  const entered$ = fromMinor(e.minor, currency)!;
  const observed$ = fromMinor(o.minor, currency)!;
  const match = e.minor === o.minor;
  return {
    ok: true, match, entered: entered$, observed: observed$, sent: e.minor,
    message: match
      ? `Confirmed: HQN sent ${e.minor} and Ads Manager shows ${observed$} ${currency!.toUpperCase()}, which is what was entered.`
      : `MISMATCH: HQN sent ${e.minor} for ${entered$} ${currency!.toUpperCase()}, but Ads Manager shows ${observed$}. Meta reads budget numbers differently from HQN's conversion, so budgets stay blocked. Do not enable writes until this is fixed in code.`,
  };
}
