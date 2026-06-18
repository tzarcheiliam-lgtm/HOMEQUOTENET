import { AuthForm } from '@/components/auth-form';
import { signInAction } from '@/lib/actions/auth';

export const metadata = { title: 'Sign in · HomeQuote Network' };

export default function SignInPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4">
      <AuthForm mode="sign-in" action={signInAction} />
    </main>
  );
}
