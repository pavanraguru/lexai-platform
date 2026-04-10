'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import {
  LayoutDashboard, FolderOpen, Calendar, FileText,
  Users, Receipt, Settings, Bell, Plus, ChevronLeft,
  Scale, LogOut, Menu, X, Home, ChevronRight
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

// Smart breadcrumb builder
function useBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: 'Dashboard', href: '/dashboard' },
  ];

  if (segments[0] === 'cases') {
    crumbs.push({ label: 'Cases', href: '/cases' });
    if (segments[1] === 'new') {
      crumbs.push({ label: 'New Case', href: '/cases/new' });
    } else if (segments[1]) {
      crumbs.push({ label: 'Case Detail', href: `/cases/${segments[1]}` });
    }
  } else if (segments[0] === 'calendar') {
    crumbs.push({ label: 'Calendar', href: '/calendar' });
  } else if (segments[0] === 'clients') {
    crumbs.push({ label: 'Clients', href: '/clients' });
  } else if (segments[0] === 'invoices') {
    crumbs.push({ label: 'Billing', href: '/invoices' });
  } else if (segments[0] === 'drafts') {
    crumbs.push({ label: 'Drafts', href: '/drafts' });
  } else if (segments[0] === 'settings') {
    crumbs.push({ label: 'Settings', href: '/settings' });
  }

  return crumbs;
}

// Smart back destination
function getBackHref(pathname: string): string | null {
  if (pathname === '/dashboard') return null;
  if (pathname === '/cases/new') return '/cases';
  if (pathname.match(/^\/cases\/[^/]+$/)) return '/cases';
  if (pathname.match(/^\/cases\/.+/)) return pathname.split('/').slice(0, -1).join('/');
  return '/dashboard';
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, clearUser } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const breadcrumbs = useBreadcrumbs(pathname);
  const backHref = getBackHref(pathname);
  const isOnDashboard = pathname === '/dashboard';

  const handleLogout = () => {
    clearUser();
    if (typeof window !== 'undefined') localStorage.removeItem('lexai-auth');
    router.push('/login');
  };

  const p = '#022448';
  const gold = '#735c00';
  const sidebar = '#f8f9fb';

  return (
    <div style={{ background: '#f8f9fb', minHeight: '100dvh', fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex" style={{
        position: 'fixed', left: 0, top: 0, height: '100%', width: '220px',
        background: sidebar, flexDirection: 'column', padding: '24px 12px',
        zIndex: 40, borderRight: '1px solid rgba(196,198,207,0.2)',
      }}>
        {/* Logo */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px', padding: '0 8px', textDecoration: 'none' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: p, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Scale size={18} color="#ffe088" />
          </div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '15px', fontWeight: 700, color: p, lineHeight: 1.2 }}>
            Sovereign<br />Counsel
          </span>
        </Link>

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 8px', background: 'rgba(2,36,72,0.04)', borderRadius: '10px', marginBottom: '20px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800, color: p, flexShrink: 0 }}>
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: p, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || 'Advocate'}
            </p>
            <p style={{ fontSize: '10px', color: '#74777f', margin: 0, textTransform: 'capitalize' }}>
              {user?.role?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV.map(({ href, Icon, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', textDecoration: 'none',
                color: active ? p : '#74777f',
                fontWeight: active ? 700 : 500, fontSize: '13px',
                background: active ? 'rgba(2,36,72,0.07)' : 'transparent',
                borderRight: active ? `3px solid ${gold}` : '3px solid transparent',
                borderRadius: active ? '8px 0 0 8px' : '8px',
                transition: 'all 0.12s ease',
              }}>
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Home + Logout */}
        <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(196,198,207,0.2)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', textDecoration: 'none', color: '#74777f', fontSize: '13px', fontWeight: 500, borderRadius: '8px' }}>
            <Home size={16} />
            Home
          </Link>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#74777f', fontSize: '13px', fontWeight: 500, width: '100%', borderRadius: '8px', fontFamily: 'Manrope, sans-serif', textAlign: 'left' }}>
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile Drawer ─────────────────────────────────────── */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setMobileOpen(false)} />
          <aside style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: '260px', background: sidebar, padding: '24px 16px', display: 'flex', flexDirection: 'column', zIndex: 51 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={18} color={p} />
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: '16px', fontWeight: 700, color: p }}>Sovereign Counsel</span>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} color="#74777f" />
              </button>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
              {NAV.map(({ href, Icon, label }) => {
                const active = isActive(href);
                return (
                  <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', textDecoration: 'none', color: active ? p : '#74777f', fontWeight: active ? 700 : 500, fontSize: '14px', background: active ? 'rgba(2,36,72,0.06)' : 'transparent', borderRadius: '8px' }}>
                    <Icon size={18} />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(196,198,207,0.2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', textDecoration: 'none', color: '#74777f', fontSize: '14px', borderRadius: '8px' }}>
                <Home size={18} /> Home
              </Link>
              <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#74777f', fontSize: '14px', fontFamily: 'Manrope, sans-serif', borderRadius: '8px', width: '100%' }}>
                <LogOut size={18} /> Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 30, width: '100%',
        background: 'rgba(248,249,251,0.95)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(196,198,207,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '56px' }}>

          {/* Left: hamburger (mobile) + back + breadcrumbs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>

            {/* Mobile hamburger */}
            <button className="md:hidden" onClick={() => setMobileOpen(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
              <Menu size={22} color={p} />
            </button>

            {/* Mobile logo (only on dashboard) */}
            {isOnDashboard && (
              <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={16} color={p} />
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: '15px', fontWeight: 700, color: p }}>Sovereign Counsel</span>
              </div>
            )}

            {/* Back button — all pages except dashboard */}
            {!isOnDashboard && backHref && (
              <Link href={backHref} style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                color: p, textDecoration: 'none', fontWeight: 700,
                fontSize: '13px', flexShrink: 0,
                padding: '6px 10px', borderRadius: '8px',
                background: 'rgba(2,36,72,0.06)',
                border: '1px solid rgba(2,36,72,0.1)',
              }}>
                <ChevronLeft size={15} />
                Back
              </Link>
            )}

            {/* Breadcrumbs — desktop */}
            {!isOnDashboard && (
              <nav className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, overflow: 'hidden' }}>
                {breadcrumbs.map((crumb, i) => (
                  <div key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                    {i > 0 && <ChevronRight size={13} color="#c4c6cf" style={{ flexShrink: 0 }} />}
                    {i === breadcrumbs.length - 1 ? (
                      <span style={{ fontSize: '13px', fontWeight: 700, color: p, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {crumb.label}
                      </span>
                    ) : (
                      <Link href={crumb.href} style={{ fontSize: '13px', color: '#74777f', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            )}

            {/* Current page label on mobile */}
            {!isOnDashboard && (
              <span className="md:hidden" style={{ fontSize: '14px', fontWeight: 700, color: p, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {breadcrumbs[breadcrumbs.length - 1]?.label}
              </span>
            )}
          </div>

          {/* Right: Home + Bell + New */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>

            {/* Home button — visible on all pages */}
            <Link href="/dashboard" title="Go to Dashboard" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '34px', height: '34px', borderRadius: '8px',
              background: isOnDashboard ? 'rgba(2,36,72,0.08)' : 'transparent',
              color: isOnDashboard ? p : '#74777f',
              textDecoration: 'none',
            }}>
              <Home size={17} />
            </Link>

            {/* Quick new case */}
            <Link href="/cases/new" title="New Case" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: '34px', height: '34px', borderRadius: '8px',
              background: 'transparent', color: '#74777f', textDecoration: 'none',
            }}>
              <Plus size={17} />
            </Link>

            {/* Bell */}
            <div style={{ position: 'relative' }}>
              <button onClick={() => setNotifOpen(!notifOpen)} style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#74777f' }}
                onBlur={() => setTimeout(() => setNotifOpen(false), 200)}>
                <Bell size={17} />
                <div style={{ position: 'absolute', top: '7px', right: '7px', width: '7px', height: '7px', borderRadius: '50%', background: '#ba1a1a', border: '2px solid #f8f9fb' }} />
              </button>
              {notifOpen && (
                <div style={{ position: 'absolute', right: 0, top: '42px', width: '300px', background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', boxShadow: '0 8px 32px rgba(2,36,72,0.12)', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: p, margin: 0 }}>Notifications</p>
                    <button style={{ fontSize: '11px', fontWeight: 700, color: gold, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>Mark all read</button>
                  </div>
                  <div style={{ padding: '12px 16px', fontSize: '13px', color: '#74777f', textAlign: 'center' }}>
                    No new notifications
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile breadcrumb bar — shown below top bar on nested pages */}
        {!isOnDashboard && breadcrumbs.length > 2 && (
          <div className="md:hidden" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 20px 8px', overflowX: 'auto' }}>
            {breadcrumbs.map((crumb, i) => (
              <div key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {i > 0 && <ChevronRight size={12} color="#c4c6cf" />}
                <Link href={crumb.href} style={{ fontSize: '12px', color: i === breadcrumbs.length - 1 ? p : '#74777f', textDecoration: 'none', fontWeight: i === breadcrumbs.length - 1 ? 700 : 400 }}>
                  {crumb.label}
                </Link>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="md:pl-[220px] pb-20 md:pb-0">
        {children}
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────────── */}
      <nav className="md:hidden" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        height: '60px', zIndex: 50,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(196,198,207,0.3)',
      }}>
        {/* Home always first */}
        <Link href="/dashboard" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: isOnDashboard ? gold : '#74777f', textDecoration: 'none' }}>
          <Home size={22} />
          <span style={{ fontSize: '9px', fontWeight: isOnDashboard ? 800 : 500 }}>Home</span>
        </Link>
        {MOBILE_NAV.slice(1).map(({ href, Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: active ? gold : '#74777f', textDecoration: 'none' }}>
              <Icon size={22} />
              <span style={{ fontSize: '9px', fontWeight: active ? 800 : 500 }}>{label}</span>
            </Link>
          );
        })}
        {/* New case button */}
        <Link href="/cases/new" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#74777f', textDecoration: 'none' }}>
          <Plus size={22} />
          <span style={{ fontSize: '9px', fontWeight: 500 }}>New</span>
        </Link>
      </nav>
    </div>
  );
}
