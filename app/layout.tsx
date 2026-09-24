import './globals.css';
import type { Metadata, Viewport } from 'next';
import { Manrope } from 'next/font/google';
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

const manrope = Manrope({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.className}>
      <body className="min-h-[100dvh] bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
