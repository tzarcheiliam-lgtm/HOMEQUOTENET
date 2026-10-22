import { NextResponse, after } from 'next/server';
import { readBody, sameOrigin } from '@/lib/funnels/server';
import { submissionSchema } from '@/lib/adu-quiz/submission';
import { aduQuizServerEvents, submitAduQuizLead } from '@/lib/adu-quiz/leads.server';
import { qualificationRules } from '@/lib/adu-quiz/config';
import { evaluate, type Answers } from '@/lib/adu-quiz/quiz';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });

/**
 * Saves a completed ADU quiz. Qualification is decided HERE from the answers
 * (a `qualified` sent by the browser is ignored). Idempotent on submissionId.
 * Contact data is never logged.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: 'Invalid origin' }, 403);
  let body: unknown;
  try {
    body = await readBody(request);
  } catch {
    return reply({ error: 'Invalid request.' }, 400);
  }
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return reply({ error: 'Please check your details and try again.', fieldErrors }, 422);
  }
  const input = parsed.data;
  const result = await submitAduQuizLead(input);
  if (!result.ok) return reply({ error: result.error }, result.status);

  // Server-side Meta events (Lead, QualifiedLead), paired with the browser events by event id. New, real submissions only.
  if (result.token && !result.duplicate) {
    const evaluation = evaluate(input.answers as Answers, qualificationRules());
    const header = request.headers.get('x-vercel-forwarded-for') ?? request.headers.get('x-forwarded-for');
    const ctx = { ip: header?.split(',')[0]?.trim() || undefined, userAgent: request.headers.get('user-agent') ?? undefined };
    after(async () => { await Promise.allSettled(aduQuizServerEvents(input, evaluation, ctx)); });
  }
  return reply({ qualified: result.qualified, token: result.token, estimate: result.estimate });
}
