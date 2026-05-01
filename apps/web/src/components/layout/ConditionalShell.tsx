'use client';

import { usePathname } from 'next/navigation';
import AppShell from './AppShell';

const NO_SHELL_PATHS = ['/login', '/signup', '/auth', '/portal', '/pay/'];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = !NO_SHELL_PATHS.some(p => pathname.startsWith(p));

  if (!showShell) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
