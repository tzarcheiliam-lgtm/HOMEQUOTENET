import Anthropic from '@anthropic-ai/sdk';

export type ProviderErrorCode = 'not_configured' | 'provider_auth' | 'provider_billing' | 'provider_limit' | 'provider_busy' | 'provider_error' | 'cancelled';

/** Maps any SDK/network failure to a code and a message that is safe to show. Raw provider text is never returned. */
export function classifyProviderError(err: unknown): { code: ProviderErrorCode; message: string } {
  if (err instanceof Anthropic.APIUserAbortError) return { code: 'cancelled', message: 'Stopped.' };
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return { code: 'provider_auth', message: 'The assistant is not set up correctly. An admin needs to check the Anthropic API key.' };
  }
  if (err instanceof Anthropic.BadRequestError && /credit balance|billing|plan/i.test(String(err.message))) {
    return { code: 'provider_billing', message: 'The assistant is out of API credits. An admin needs to add credit in the Anthropic console.' };
  }
  // Anthropic's own spend limits (checked against their docs): a limit you set returns 400 "You have reached your specified API
  // usage limits"; the tier's monthly cap returns 429 enforced_spend_limit_reached WITHOUT retry-after. Retrying cannot help either.
  const details = (err as { error?: { error?: { details?: { error_code?: string } } } } | null)?.error?.error?.details?.error_code;
  if ((err instanceof Anthropic.APIError) && (details === 'enforced_spend_limit_reached' || /reached your (specified )?(workspace )?api usage limits/i.test(String(err.message)))) {
    return { code: 'provider_limit', message: 'The assistant has reached the monthly usage limit set in the Anthropic console. An admin can raise it there, or it resumes at the start of next month.' };
  }
  if (err instanceof Anthropic.RateLimitError || (err instanceof Anthropic.APIError && (err.status === 529 || err.status === 503))) {
    return { code: 'provider_busy', message: 'The assistant is busy right now. Try again in a moment.' };
  }
  return { code: 'provider_error', message: 'Something went wrong reaching the assistant. Try again.' };
}
