import { SignerApp } from '@/components/signing/signer-app';

export const dynamic = 'force-dynamic';

// The token lives in the URL FRAGMENT (#t=...), which browsers never send to servers, so it cannot appear
// in server/CDN logs or Referer headers. This page itself is static and contains no document data.
export default function SignPage() {
  return <SignerApp />;
}
