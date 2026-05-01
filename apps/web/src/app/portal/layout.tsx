// apps/web/src/app/portal/layout.tsx
import dynamic from 'next/dynamic';

const PortalShell = dynamic(() => import('./PortalShell'), { ssr: false });

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
