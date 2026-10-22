/**
 * Assistant settings. Everything tunable lives here or in env vars; nothing is hardcoded in the UI.
 * No 'server-only' import: the greeting/intro constants are also read by client components.
 */

/** The first thing the assistant says. Rename it here. */
export const ASSISTANT_GREETING = 'Complote?';
export const ASSISTANT_INTRO = 'Ask me about your leads, appointments, or what needs your attention.';
export const ASSISTANT_TITLE = 'Assistant';

/** Roles that get the assistant. Callers work a prospect list and never see homeowner CRM data. */
export const ASSISTANT_ROLES = ['admin', 'setter', 'contractor'] as const;

/** Cheaper-than-flagship default that is still strong at tool use. Override with ANTHROPIC_MODEL. */
export const DEFAULT_MODEL = 'claude-sonnet-5-5';

const num = (name: string, fallback: number, min: number, max: number) => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw >= min && raw <= max ? raw : fallback;
};

export function assistantModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export type Effort = 'low' | 'medium' | 'high';
export function assistantEffort(): Effort {
  const v = process.env.ASSISTANT_EFFORT?.trim();
  return v === 'medium' || v === 'high' ? v : 'low';
}

export function isAssistantEnabled(): boolean {
  return process.env.ASSISTANT_ENABLED?.trim().toLowerCase() !== 'false';
}

/** The key is only ever read on the server. */
export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY?.trim();
}

export interface AssistantLimits {
  /** Hard cap on one reply. */
  maxOutputTokens: number;
  /** Model <-> tool round trips per user message. */
  maxToolRounds: number;
  /** Characters of one tool result sent back to the model. */
  maxToolResultChars: number;
  /** Characters of a user message accepted. */
  maxUserMessageChars: number;
  /** Past messages sent with a request (a stored summary covers older ones). */
  historyMessages: number;
  /** Rolling 24h estimated spend per user, USD. */
  userDailyUsd: number;
  /** Month-to-date estimated spend per contractor company, USD. */
  tenantMonthlyUsd: number;
  /** Month-to-date estimated spend across everyone, USD. The organisation budget guard. */
  orgMonthlyUsd: number;
  /** Chat requests per user per minute. */
  perMinute: number;
}

export function assistantLimits(): AssistantLimits {
  return {
    maxOutputTokens: Math.round(num('ASSISTANT_MAX_OUTPUT_TOKENS', 1500, 200, 8000)),
    maxToolRounds: Math.round(num('ASSISTANT_MAX_TOOL_ROUNDS', 5, 1, 10)),
    maxToolResultChars: 6000,
    maxUserMessageChars: 2000,
    historyMessages: 10,
    userDailyUsd: num('ASSISTANT_USER_DAILY_USD', 1.5, 0.05, 1000),
    tenantMonthlyUsd: num('ASSISTANT_TENANT_MONTHLY_USD', 20, 0.5, 100000),
    orgMonthlyUsd: num('ASSISTANT_ORG_MONTHLY_USD', 100, 1, 100000),
    perMinute: Math.round(num('ASSISTANT_RATE_LIMIT_PER_MIN', 8, 1, 120)),
  };
}
