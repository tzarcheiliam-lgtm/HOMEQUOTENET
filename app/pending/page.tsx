import Link from 'next/link';
import type { Metadata } from 'next';
import { signOutAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Pending approval · HomeQuote Network',
  robots: { index: false, follow: false },
};

export default function PendingPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="text-xl">Account pending approval</CardTitle>
          <CardDescription>
            Your account has been created but is not active yet. An administrator
            needs to enable it and assign your role before you can sign in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form action={signOutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Sign out
            </Button>
          </form>
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
