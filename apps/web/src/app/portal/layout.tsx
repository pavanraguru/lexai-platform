'use client';
// apps/web/src/app/portal/layout.tsx
// Wraps all portal pages with the client portal shell
// Login and accept-invite pages are excluded via ConditionalShell

import { usePathname } from 'next/navigation';
import PortalShell from './PortalShell';

const NO_SHELL = ['/portal/login', '/portal/accept-invite'];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showShell = !NO_SHELL.some(p => pathname.startsWith(p));

  if (!showShell) return <>{children}</>;
  return <PortalShell>{children}</PortalShell>;
}
