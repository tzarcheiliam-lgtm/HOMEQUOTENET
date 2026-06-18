import { AuthForm } from '@/components/auth-form';
import { signUpAction } from '@/lib/actions/auth';

export const metadata = { title: 'Sign up · HomeQuote Network' };

export default function SignUpPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4">
      <AuthForm mode="sign-up" action={signUpAction} />
    </main>
  );
}
