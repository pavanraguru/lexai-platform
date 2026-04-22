import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';
import ConditionalShell from '@/components/layout/ConditionalShell';

export const metadata: Metadata = {
  title: 'Sovereign Counsel | LexAI India',
  description: 'AI-Powered Legal Practice Management for Indian Advocates',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,700&family=Manrope:wght@400;600;700;800&display=swap&display=swap"
          rel="stylesheet"
          media="print"
          onLoad="this.media='all'"
        />
        <noscript>
          <link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,700&family=Manrope:wght@400;600;700;800&display=swap" rel="stylesheet" />
        </noscript>
      </head>
      <body>
        <Providers>
          <ConditionalShell>
            {children}
          </ConditionalShell>
        </Providers>
      </body>
    </html>
  );
}
