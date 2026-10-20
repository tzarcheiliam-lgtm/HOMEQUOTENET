/** USD per million tokens: [input, output]. Estimates only; the provider invoice is the source of truth. */
const PRICES: Record<string, [number, number]> = {
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-haiku-4-5': [1, 5],
  'claude-sonnet-5-5': [2, 10],
  'claude-sonnet-5': [2, 10],
  'claude-sonnet-4-6': [3, 15],
  'claude-opus-5-5': [4, 20],
  'claude-opus-5': [5, 25],
  'claude-opus-4-8': [5, 25],
  'claude-fable-5-1': [10, 50],
  'claude-fable-5': [10, 50],
};
/** An unknown model is priced like the most expensive one, so the budget guard errs on the safe side. */
const UNKNOWN_PRICE: [number, number] = [10, 50];

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens?: number;
  cache_write_tokens?: number;
}

/** Estimated cost in millionths of a dollar (integer). Cache reads bill at 0.1x input, writes at 1.25x. */
export function estimateCostMicros(model: string, usage: TokenUsage): number {
  const [inPrice, outPrice] = PRICES[model] ?? UNKNOWN_PRICE;
  const usd =
    (usage.input_tokens * inPrice +
      usage.output_tokens * outPrice +
      (usage.cache_read_tokens ?? 0) * inPrice * 0.1 +
      (usage.cache_write_tokens ?? 0) * inPrice * 1.25) /
    1_000_000;
  return Math.ceil(usd * 1_000_000);
}

export const microsToUsd = (micros: number) => micros / 1_000_000;
export const usdToMicros = (usd: number) => Math.round(usd * 1_000_000);
