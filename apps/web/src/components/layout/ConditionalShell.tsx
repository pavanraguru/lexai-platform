'use client';

import { usePathname } from 'next/navigation';
import AppShell from './AppShell';

const NO_SHELL_PATHS = ['/login', '/signup', '/auth', '/portal', '/pay/'];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Exact match for '/' (homepage/marketing) — startsWith would match everything
  const isHomepage = pathname === '/';
  const showShell = !isHomepage && !NO_SHELL_PATHS.some(p => pathname.startsWith(p));

  if (!showShell) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
