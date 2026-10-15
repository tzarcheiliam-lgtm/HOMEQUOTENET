import Link from 'next/link';
import type { Metadata } from 'next';
import { ResetLinkForm } from '@/components/password-forms';
import { continueResetAction } from '@/lib/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Reset password · HomeQuote Network',
  robots: { index: false, follow: false },
};

/**
 * HomeQuote's own landing page for the emailed reset link. Opening it spends
 * nothing: the one-time token is only used when the person presses the button,
 * so email security scanners that pre-open links cannot use it up.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp.token_hash;
  const tokenHash = (Array.isArray(raw) ? raw[0] : raw) ?? '';
  return (
    <main className="flex min-h-[100dvh] bg-secondary items-center justify-center p-4">
      {tokenHash ? (
        <ResetLinkForm action={continueResetAction} tokenHash={tokenHash} />
      ) : (
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-xl">This link isn’t valid</CardTitle>
            <CardDescription>Open the newest reset email, or request a new link.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">Request a new link</Link>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
