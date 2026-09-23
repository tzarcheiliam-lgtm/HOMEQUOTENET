import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { setPasswordAction } from '@/lib/actions/auth';
import { SetPasswordForm } from '@/components/password-forms';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata = { title: 'Set password · HomeQuote Network' };

/**
 * Reached from an invitation or reset email via /auth/callback, which has
 * already turned the link into a session. Without a session there is nothing
 * to set a password on, so say so rather than showing a form that will fail.
 */
export default async function SetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4">
      {user ? (
        <SetPasswordForm action={setPasswordAction} email={user.email ?? null} />
      ) : (
        <Card className="w-full max-w-sm text-center">
          <CardHeader>
            <CardTitle className="text-xl">This link has expired</CardTitle>
            <CardDescription>
              Invitation and reset links work once and expire after an hour.
              Request a new one and try again.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Link href="/forgot-password" className="text-primary hover:underline">
              Send a new reset link
            </Link>
            <Link href="/sign-in" className="text-muted-foreground hover:underline">
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
