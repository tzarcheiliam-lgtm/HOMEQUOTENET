import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Sign document · HomeQuote Network',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

/** Public signing area: no CRM chrome, no sign-in. Never indexed, never cached. */
export default function SignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-zinc-50 text-zinc-900">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" />
      {children}
    </div>
  );
}
