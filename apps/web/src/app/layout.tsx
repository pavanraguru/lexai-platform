import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LexAI India — AI-Powered Legal Platform',
  description: 'The AI operating system for Indian advocates. Manage cases, run AI agents, draft arguments, and present to courts.',
  keywords: 'legal software, Indian advocate, case management, AI legal research, eCourts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
