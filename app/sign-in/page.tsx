import { AuthForm } from '@/components/auth-form';
import { signInAction } from '@/lib/actions/auth';

export const metadata = { title: 'Sign in · HomeQuote Network' };

const NOTICES: Record<string, string> = {
  link_expired:
    'That sign-in link has expired or was already used. Sign in with your password, or request a new reset link below.',
};

/**
 * The single sign-in for every role — admins, setters, contractors and
 * partner callers. Where each lands afterwards is decided by their role in
 * signInAction, so the marketing site's "Partner login" and a deep link into
 * /app/calls both come through here.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const next = one(sp.next);
  const notice = one(sp.error) ? NOTICES[one(sp.error) as string] : undefined;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 p-4">
      {notice ? (
        <p
          role="status"
          className="w-full max-w-sm rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          {notice}
        </p>
      ) : null}
      <AuthForm mode="sign-in" action={signInAction} next={next} />
    </main>
  );
}
