import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/password-forms';
import { forgotPasswordAction } from '@/lib/actions/auth';

export const metadata: Metadata = {
  title: 'Reset password · HomeQuote Network',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4">
      <ForgotPasswordForm action={forgotPasswordAction} />
    </main>
  );
}
