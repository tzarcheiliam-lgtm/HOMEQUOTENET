import type { Metadata } from 'next';
import { AuthForm } from '@/components/auth-form';
import { signUpAction } from '@/lib/actions/auth';

export const metadata: Metadata = {
  title: 'Sign up · HomeQuote Network',
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4">
      <AuthForm mode="sign-up" action={signUpAction} />
    </main>
  );
}
