/**
 * Hypothetical return on marketing for the pitch deck's calculator (slide 9).
 * Pure and unit-tested (tests/pitch-roi.test.ts). Revenue is never treated as
 * profit: everything after "revenue" runs on gross profit (revenue x margin),
 * and only appointments that are held and then sold become jobs.
 */
export interface RoiInput {
  /** Average contract value, USD. */
  avgContract: number;
  /** Gross profit margin, 0-100. */
  marginPct: number;
  /** Booked appointments per month. */
  appointments: number;
  /** Share of booked appointments that are held, 0-100. */
  showRatePct: number;
  /** Share of held appointments that sell, 0-100. */
  closeRatePct: number;
  /** Monthly HomeQuote fee, USD. */
  packageCost: number;
  /** Monthly ad budget paid to Meta, USD. */
  adBudget: number;
}

export interface RoiResult {
  attended: number;
  closedJobs: number;
  revenue: number;
  grossProfit: number;
  investment: number;
  /** Gross profit minus total marketing investment (can be negative). */
  contribution: number;
  /** contribution / investment, as a ratio (0.5 = 50%). Null when nothing is invested. */
  romi: number | null;
  /** Closed jobs needed for gross profit to cover the investment. Null when a job earns no profit. */
  breakEvenJobs: number | null;
}

const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);

export function calculateRoi(raw: RoiInput): RoiResult {
  const avgContract = clamp(raw.avgContract, 0, 10_000_000);
  const margin = clamp(raw.marginPct, 0, 100) / 100;
  const appointments = clamp(raw.appointments, 0, 10_000);
  const show = clamp(raw.showRatePct, 0, 100) / 100;
  const close = clamp(raw.closeRatePct, 0, 100) / 100;
  const investment = clamp(raw.packageCost, 0, 10_000_000) + clamp(raw.adBudget, 0, 10_000_000);

  const attended = appointments * show;
  const closedJobs = attended * close;
  const revenue = closedJobs * avgContract;
  const grossProfit = revenue * margin;
  const contribution = grossProfit - investment;
  const profitPerJob = avgContract * margin;

  return {
    attended,
    closedJobs,
    revenue,
    grossProfit,
    investment,
    contribution,
    romi: investment > 0 ? contribution / investment : null,
    breakEvenJobs: profitPerJob > 0 ? investment / profitPerJob : null,
  };
}
