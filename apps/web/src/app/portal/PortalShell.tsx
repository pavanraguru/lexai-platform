'use client';
// apps/web/src/app/portal/PortalShell.tsx
// Client portal navigation shell — completely separate from advocate AppShell

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FolderOpen, Calendar, Receipt,
  Settings, LogOut, Scale, X, Menu,
} from 'lucide-react';

const NAV = [
  { href: '/portal/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/portal/cases',     Icon: FolderOpen,       label: 'My Cases' },
  { href: '/portal/calendar',  Icon: Calendar,         label: 'Calendar' },
  { href: '/portal/billing',   Icon: Receipt,          label: 'Billing' },
  { href: '/portal/settings',  Icon: Settings,         label: 'Settings' },
];

const SIDEBAR_W = 220;
const P = '#022448';
const GOLD = '#ffe088';

const NO_SHELL = ['/portal/login', '/portal/accept-invite'];

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (NO_SHELL.some(p => pathname.startsWith(p))) return <>{children}</>;
  const router = useRouter();
  const [name, setName] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    const n = localStorage.getItem('portal_name');
    if (!token) { router.push('/portal/login'); return; }
    setName(n || 'Client');
  }, []);

  function handleLogout() {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_name');
    router.push('/portal/login');
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  function NavLinks({ onClick }: { onClick?: () => void }) {
    return (
      <>
        {NAV.map(({ href, Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} onClick={onClick} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '9px 12px', textDecoration: 'none', borderRadius: '8px',
              background: active ? 'rgba(2,36,72,0.08)' : 'transparent',
              color: active ? P : '#5f6368',
              fontWeight: active ? 700 : 500, fontSize: '13.5px',
              borderLeft: active ? `3px solid ${GOLD}` : '3px solid transparent',
              marginBottom: '2px',
            }}>
              <Icon size={16} style={{ flexShrink: 0 }} />
              {label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: #f4f5f7; }
        #portal-sidebar {
          position: fixed; left: 0; top: 0; bottom: 0;
          width: ${SIDEBAR_W}px; background: #fff;
          border-right: 1px solid rgba(0,0,0,0.07);
          display: flex; flex-direction: column;
          z-index: 40; overflow-y: auto;
        }
        #portal-body { margin-left: ${SIDEBAR_W}px; min-height: 100vh; display: flex; flex-direction: column; }
        #portal-topbar {
          position: sticky; top: 0; z-index: 30;
          background: rgba(244,245,247,0.96); backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0,0,0,0.07);
          height: 52px; display: flex; align-items: center; padding: 0 20px; gap: 10px;
        }
        #portal-main { flex: 1; }
        @media (max-width: 768px) {
          #portal-sidebar { display: none; }
          #portal-body { margin-left: 0 !important; padding-bottom: 72px; }
        }
        #portal-bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          background: #fff; border-top: 1px solid rgba(0,0,0,0.08);
          height: 64px; display: none;
          align-items: center; justify-content: space-around; padding: 0 4px;
        }
        @media (max-width: 768px) { #portal-bottom-nav { display: flex !important; } }
      `}</style>

      {/* Sidebar */}
      <div id="portal-sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 16px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Scale size={17} color={GOLD} />
          </div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '14px', fontWeight: 700, color: P, lineHeight: 1.2 }}>
            Sovereign<br />Counsel
          </span>
        </div>

        {/* Client badge */}
        <div style={{ margin: '0 10px 12px', padding: '10px 12px', background: '#f0f4ff', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: P, flexShrink: 0 }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: P, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
            <p style={{ fontSize: '10px', color: '#74777f', margin: 0 }}>Client Portal</p>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0 10px' }}>
          <NavLinks />
        </nav>

        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: '8px' }}>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ba1a1a', fontSize: '13.5px', fontWeight: 600, fontFamily: 'Manrope, sans-serif', borderRadius: '8px', textAlign: 'left' }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setMobileOpen(false)} />
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '260px', background: '#fff', display: 'flex', flexDirection: 'column', zIndex: 51, overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
              <span style={{ fontFamily: 'Newsreader, serif', fontSize: '15px', fontWeight: 700, color: P }}>Sovereign Counsel</span>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#74777f" /></button>
            </div>
            <nav style={{ flex: 1, padding: '8px 10px' }}>
              <NavLinks onClick={() => setMobileOpen(false)} />
            </nav>
            <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ba1a1a', fontSize: '13.5px', fontWeight: 600, fontFamily: 'Manrope, sans-serif', borderRadius: '8px' }}>
                <LogOut size={16} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main */}
      <div id="portal-body">
        <div id="portal-topbar">
          <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', color: P }}>
            <Menu size={20} />
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: '12px', color: '#74777f', background: '#f0f4ff', padding: '4px 12px', borderRadius: '20px', fontWeight: 600 }}>
            Client Portal
          </div>
        </div>
        <div id="portal-main">{children}</div>
      </div>

      {/* Mobile bottom nav */}
      <div id="portal-bottom-nav">
        {NAV.slice(0, 5).map(({ href, Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: active ? P : '#74777f', textDecoration: 'none', flex: 1, padding: '6px 0' }}>
              <Icon size={20} />
              <span style={{ fontSize: '9px', fontWeight: active ? 800 : 500 }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
