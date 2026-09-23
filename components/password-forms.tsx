'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { AuthState } from '@/lib/actions/auth';

type Action = (state: AuthState, formData: FormData) => Promise<AuthState>;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

export function ForgotPasswordForm({ action }: { action: Action }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter the email on your account and we&rsquo;ll send a link to set a
          new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state?.success ? (
          <p className="text-sm text-emerald-700" role="status">
            {state.success}
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            {state?.error && (
              <p className="text-sm text-destructive" role="alert">
                {state.error}
              </p>
            )}
            <Button type="submit" disabled={pending} className="mt-2">
              {pending ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link href="/sign-in" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function SetPasswordForm({
  action,
  email,
}: {
  action: Action;
  email: string | null;
}) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    undefined
  );

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Set your password</CardTitle>
        <CardDescription>
          {email ? (
            <>
              For <span className="font-medium text-foreground">{email}</span>.
              At least 8 characters.
            </>
          ) : (
            'At least 8 characters.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <Field label="New password">
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          <Field label="Confirm password">
            <Input
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </Field>
          {state?.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? 'Saving…' : 'Save password and continue'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
