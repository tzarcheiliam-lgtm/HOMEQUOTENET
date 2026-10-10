import './globals.css';
import type { Metadata, Viewport } from 'next';
import { DM_Sans, Sora } from 'next/font/google';
import { rootMetadata } from '@/lib/site-metadata';

/*
  Site-wide link-preview defaults. Icons and the fallback og:image are file
  conventions in this folder: favicon.ico, icon.png, apple-icon.png,
  opengraph-image.tsx (also used for the Twitter/X card) and manifest.ts.
*/
export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  maximumScale: 1,
};

// Brand type: Sora for headlines and the wordmark, DM Sans for body text.
const sora = Sora({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-sora', display: 'swap' });
const dmSans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-dm-sans', display: 'swap' });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sora.variable} ${dmSans.variable} ${dmSans.className}`}>
      <body className="min-h-[100dvh] bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
