// apps/web/src/app/portal/layout.tsx
// Server component — no 'use client' here
import PortalShell from './PortalShell';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
