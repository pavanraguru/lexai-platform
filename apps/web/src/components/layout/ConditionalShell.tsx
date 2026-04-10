'use client';

import { usePathname } from 'next/navigation';
import AppShell from './AppShell';

// Pages that should NOT have the sidebar/nav shell
const NO_SHELL_PATHS = ['/login', '/signup', '/auth'];

export default function ConditionalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = !NO_SHELL_PATHS.some(p => pathname.startsWith(p));

  if (!showShell) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
