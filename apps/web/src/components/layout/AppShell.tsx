'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import {
  LayoutDashboard, FolderOpen, Calendar, FileText,
  Users, Receipt, Settings, Bell, Plus, ChevronLeft,
  Scale, LogOut, Menu, X
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/cases',     Icon: FolderOpen,       label: 'My Cases' },
  { href: '/calendar',  Icon: Calendar,         label: 'Calendar' },
  { href: '/drafts',    Icon: FileText,         label: 'Drafts' },
  { href: '/clients',   Icon: Users,            label: 'Clients' },
  { href: '/invoices',  Icon: Receipt,          label: 'Billing' },
  { href: '/settings',  Icon: Settings,         label: 'Settings' },
];

const MOBILE_NAV = NAV.slice(0, 4);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, clearUser } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleLogout = () => {
    clearUser();
    router.push('/login');
  };

  const sidebarBg = '#f8f9fb';
  const primaryColor = '#022448';
  const secondaryColor = '#735c00';
  const activeGold = '#735c00';

  return (
    <div style={{ background: '#f8f9fb', minHeight: '100dvh', fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex" style={{
        position: 'fixed', left: 0, top: 0, height: '100%', width: '240px',
        background: sidebarBg, flexDirection: 'column', padding: '28px 16px',
        zIndex: 40, borderRight: '1px solid rgba(196,198,207,0.15)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: '32px', padding: '0 8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Scale size={20} color={primaryColor} />
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '17px', fontWeight: 700, color: primaryColor }}>
            Sovereign Counsel
          </span>
        </div>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px', marginBottom: '28px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: primaryColor, flexShrink: 0 }}>
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: primaryColor, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || 'Advocate'}
            </p>
            <p style={{ fontSize: '10px', color: '#74777f', margin: 0 }}>
              {user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map(({ href, Icon, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', textDecoration: 'none',
                color: active ? primaryColor : '#74777f',
                fontWeight: active ? 700 : 500,
                fontSize: '13px',
                background: active ? 'rgba(2,36,72,0.06)' : 'transparent',
                borderRight: active ? `3px solid ${activeGold}` : '3px solid transparent',
                transition: 'all 0.15s ease',
                borderRadius: active ? '0' : '6px',
              }}>
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#74777f', fontSize: '13px', fontWeight: 500,
          width: '100%', marginTop: '16px', borderTop: '1px solid rgba(196,198,207,0.2)',
          paddingTop: '16px',
        }}>
          <LogOut size={16} />
          Sign out
        </button>
      </aside>

      {/* ── Mobile Drawer ─────────────────────────────────────── */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setMobileOpen(false)} />
          <aside style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '260px', background: sidebarBg, padding: '24px 16px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={18} color={primaryColor} />
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: primaryColor }}>Sovereign Counsel</span>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#74777f" />
              </button>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {NAV.map(({ href, Icon, label }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                    textDecoration: 'none', color: active ? primaryColor : '#74777f',
                    fontWeight: active ? 700 : 500, fontSize: '14px',
                    background: active ? 'rgba(2,36,72,0.06)' : 'transparent', borderRadius: '6px',
                  }}>
                    <Icon size={18} />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30, width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: '60px',
        background: 'rgba(248,249,251,0.9)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(196,198,207,0.2)',
      }}>
        {/* Mobile: hamburger + logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="md:hidden" onClick={() => setMobileOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <Menu size={22} color={primaryColor} />
          </button>
          <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Scale size={18} color={primaryColor} />
            <span style={{ fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: primaryColor }}>Sovereign Counsel</span>
          </div>
          {/* Desktop: back to dashboard */}
          {pathname !== '/dashboard' && (
            <Link href="/dashboard" className="hidden md:flex" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: '#74777f', fontSize: '13px', fontWeight: 600,
              textDecoration: 'none',
            }}>
              <ChevronLeft size={16} />
              Dashboard
            </Link>
          )}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={20} color="#74777f" style={{ cursor: 'pointer' }} />
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main style={{ paddingLeft: 0 }} className="md:pl-60 pb-20 md:pb-0">
        {children}
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────────── */}
      <nav className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: '60px', zIndex: 50,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(196,198,207,0.3)',
      }}>
        {MOBILE_NAV.map(({ href, Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
              color: active ? secondaryColor : '#74777f', textDecoration: 'none',
            }}>
              <Icon size={22} />
              <span style={{ fontSize: '10px', fontWeight: active ? 700 : 500 }}>{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile FAB */}
      <Link href="/cases/new" className="md:hidden" style={{
        position: 'fixed', bottom: '76px', right: '20px', width: '52px', height: '52px',
        borderRadius: '50%', background: primaryColor, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40,
        boxShadow: '0 8px 24px rgba(2,36,72,0.3)', textDecoration: 'none',
      }}>
        <Plus size={22} />
      </Link>
    </div>
  );
}
