'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import {
  LayoutDashboard, FolderOpen, Calendar, FileText,
  Users, Receipt, Settings, Bell, Plus, ChevronLeft,
  Scale, LogOut, Menu, X, ChevronRight, BookMarked,
  CheckCheck, AlertCircle, Bot, Gavel, Clock,
} from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SIDEBAR_W = 240;

const NAV = [
  { href: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/cases',     Icon: FolderOpen,       label: 'My Cases' },
  { href: '/calendar',  Icon: Calendar,         label: 'Calendar' },
  { href: '/filings',   Icon: BookMarked,       label: 'Filings' },
  { href: '/drafts',    Icon: FileText,         label: 'Drafts' },
  { href: '/clients',   Icon: Users,            label: 'Clients' },
  { href: '/invoices',  Icon: Receipt,          label: 'Billing' },
  { href: '/settings',  Icon: Settings,         label: 'Settings' },
];

const MOBILE_NAV = NAV.slice(0, 5);

function getBackHref(pathname: string): string | null {
  if (pathname === '/dashboard') return null;
  if (pathname === '/cases/new') return '/cases';
  if (pathname.match(/^\/cases\/[^/]+$/)) return '/cases';
  return '/dashboard';
}

function getBreadcrumbs(pathname: string) {
  const crumbs = [{ label: 'Dashboard', href: '/dashboard' }];
  const seg = pathname.split('/').filter(Boolean);
  if (!seg.length || seg[0] === 'dashboard') return crumbs;
  const map: Record<string, string> = {
    filings: 'Filings',
    cases: 'Cases', calendar: 'Calendar', drafts: 'Drafts',
    clients: 'Clients', invoices: 'Billing', settings: 'Settings',
  };
  if (map[seg[0]]) crumbs.push({ label: map[seg[0]], href: `/${seg[0]}` });
  if (seg[0] === 'cases' && seg[1]) {
    crumbs.push({ label: seg[1] === 'new' ? 'New Case' : 'Case Detail', href: `/cases/${seg[1]}` });
  }
  return crumbs;
}

// ── Notification type config ───────────────────────────────────
const NOTIF_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  agent_completed: { icon: Bot,         color: '#5b21b6', bg: '#ede9fe' },
  agent_failed:    { icon: AlertCircle, color: '#93000a', bg: '#ffdad6' },
  hearing_reminder:{ icon: Gavel,       color: '#022448', bg: '#d5e3ff' },
  invoice_due:     { icon: Receipt,     color: '#735c00', bg: '#ffe088' },
  default:         { icon: Bell,        color: '#43474e', bg: '#edeef0' },
};

// ── Notification Drawer ────────────────────────────────────────
function NotificationDrawer({ token, onClose }: { token: string; onClose: () => void }) {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch(BASE + '/v1/notifications', {
      headers: { Authorization: 'Bearer ' + token },
    }).then(r => r.json()).then(j => {
      setNotifs(j.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [token]);

  const markRead = async (id: string) => {
    await fetch(BASE + '/v1/notifications/' + id + '/read', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token },
    });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = async () => {
    await fetch(BASE + '/v1/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + token },
    });
    setNotifs(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleClick = (notif: any) => {
    markRead(notif.id);
    if (notif.action_url) {
      router.push(notif.action_url);
      onClose();
    }
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  const relativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  };

  return (
    <div style={{ position: 'absolute', top: '44px', right: 0, width: '360px', background: '#fff', borderRadius: '16px', boxShadow: '0 8px 40px rgba(2,36,72,0.15)', border: '1px solid rgba(196,198,207,0.2)', zIndex: 200, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid rgba(196,198,207,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1rem', color: '#022448', margin: 0 }}>Notifications</h3>
          {unreadCount > 0 && (
            <span style={{ fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '99px', background: '#022448', color: '#fff' }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: '#74777f', fontFamily: 'Manrope, sans-serif' }}>
            <CheckCheck size={13} /> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#74777f', fontSize: '13px' }}>Loading...</div>
        )}
        {!loading && notifs.length === 0 && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Bell size={28} color="#c4c6cf" style={{ marginBottom: '10px' }} />
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#74777f', margin: '0 0 4px' }}>All caught up</p>
            <p style={{ fontSize: '11px', color: '#c4c6cf', margin: 0 }}>No notifications yet</p>
          </div>
        )}
        {notifs.map(notif => {
          const cfg = NOTIF_CONFIG[notif.type] || NOTIF_CONFIG.default;
          const IconComp = cfg.icon;
          return (
            <div key={notif.id} onClick={() => handleClick(notif)} style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 18px',
              borderBottom: '1px solid rgba(196,198,207,0.08)',
              background: notif.read ? 'transparent' : 'rgba(2,36,72,0.025)',
              cursor: notif.action_url ? 'pointer' : 'default',
              transition: 'background 0.12s',
            }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconComp size={16} color={cfg.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px' }}>
                  <p style={{ fontSize: '12px', fontWeight: notif.read ? 500 : 700, color: '#191c1e', margin: '0 0 2px', lineHeight: 1.4 }}>
                    {notif.title}
                  </p>
                  {!notif.read && (
                    <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#022448', flexShrink: 0, marginTop: '4px' }} />
                  )}
                </div>
                <p style={{ fontSize: '11px', color: '#74777f', margin: '0 0 4px', lineHeight: 1.4 }}>{notif.message}</p>
                <span style={{ fontSize: '10px', color: '#c4c6cf', fontWeight: 600 }}>{relativeTime(notif.created_at)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, clearUser } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const isHome = pathname === '/dashboard';
  const backHref = getBackHref(pathname);
  const crumbs = getBreadcrumbs(pathname);

  // Fetch unread count on mount + every 60s
  useEffect(() => {
    if (!token) return;
    const fetchCount = async () => {
      try {
        const res = await fetch(BASE + '/v1/notifications', {
          headers: { Authorization: 'Bearer ' + token },
        });
        const data = await res.json();
        const count = (data.data || []).filter((n: any) => !n.read).length;
        setUnreadCount(count);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [token]);

  // Close drawer on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    if (showNotifs) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifs]);

  const signOut = () => {
    clearUser();
    if (typeof window !== 'undefined') localStorage.removeItem('lexai-auth');
    router.push('/login');
  };

  const P = '#022448';
  const GOLD = '#735c00';
  const BG = '#f4f5f7';

  const navItem = (href: string, Icon: any, label: string) => {
    const active = isActive(href);
    return (
      <Link key={href} href={href} style={{
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
  };

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; background: ${BG}; }
        #lex-sidebar {
          position: fixed; left: 0; top: 0; bottom: 0;
          width: ${SIDEBAR_W}px; background: #fff;
          border-right: 1px solid rgba(0,0,0,0.07);
          display: flex; flex-direction: column;
          z-index: 40; overflow-y: auto;
        }
        #lex-body { margin-left: ${SIDEBAR_W}px; min-height: 100vh; display: flex; flex-direction: column; }
        #lex-topbar {
          position: sticky; top: 0; z-index: 30;
          background: rgba(244,245,247,0.96); backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(0,0,0,0.07);
          height: 52px; display: flex; align-items: center; padding: 0 20px; gap: 10px;
        }
        #lex-main { flex: 1; padding: 0; }
        @media (max-width: 768px) {
          #lex-sidebar { display: none; }
          #lex-body { margin-left: 0; padding-bottom: 64px; }
        }
      `}</style>

      {/* Sidebar */}
      <div id="lex-sidebar">
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '20px 16px 16px', textDecoration: 'none', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: '8px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: P, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Scale size={17} color="#ffe088" />
          </div>
          <span style={{ fontFamily: 'Newsreader, serif', fontSize: '15px', fontWeight: 700, color: P, lineHeight: 1.2 }}>
            Sovereign<br />Counsel
          </span>
        </Link>
        <div style={{ margin: '0 10px 12px', padding: '10px 12px', background: BG, borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: P, flexShrink: 0 }}>
            {user?.full_name?.charAt(0) || 'A'}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: P, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.full_name || 'Advocate'}</p>
            <p style={{ fontSize: '10px', color: '#74777f', margin: 0, textTransform: 'capitalize' }}>{user?.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <nav style={{ flex: 1, padding: '0 10px' }}>
          {NAV.map(({ href, Icon, label }) => navItem(href, Icon, label))}
        </nav>
        <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: '8px' }}>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ba1a1a', fontSize: '13.5px', fontWeight: 600, fontFamily: 'Manrope, sans-serif', borderRadius: '8px', textAlign: 'left' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Scale size={18} color={P} />
                <span style={{ fontFamily: 'Newsreader, serif', fontSize: '15px', fontWeight: 700, color: P }}>Sovereign Counsel</span>
              </div>
              <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="#74777f" /></button>
            </div>
            <nav style={{ flex: 1, padding: '8px 10px' }}>
              {NAV.map(({ href, Icon, label }) => (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 12px', textDecoration: 'none', borderRadius: '8px', marginBottom: '2px', background: isActive(href) ? 'rgba(2,36,72,0.08)' : 'transparent', color: isActive(href) ? P : '#5f6368', fontWeight: isActive(href) ? 700 : 500, fontSize: '14px' }}>
                  <Icon size={18} /> {label}
                </Link>
              ))}
            </nav>
            <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(0,0,0,0.07)' }}>
              <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#ba1a1a', fontSize: '14px', fontWeight: 600, fontFamily: 'Manrope, sans-serif', borderRadius: '8px' }}>
                <LogOut size={18} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right column */}
      <div id="lex-body">
        <div id="lex-topbar">
          <button onClick={() => setMobileOpen(true)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }} className="mobile-menu-btn">
            <Menu size={22} color={P} />
          </button>

          {!isHome && backHref && (
            <Link href={backHref} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '7px', background: 'rgba(2,36,72,0.07)', border: '1px solid rgba(2,36,72,0.1)', color: P, fontWeight: 700, fontSize: '12px', textDecoration: 'none', flexShrink: 0 }}>
              <ChevronLeft size={14} /> Back
            </Link>
          )}

          {!isHome && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
              {crumbs.map((crumb, i) => (
                <div key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0 }}>
                  {i > 0 && <ChevronRight size={12} color="#c4c6cf" style={{ flexShrink: 0 }} />}
                  {i === crumbs.length - 1 ? (
                    <span style={{ fontSize: '13px', fontWeight: 700, color: P, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} style={{ fontSize: '13px', color: '#74777f', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>{crumb.label}</Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {isHome && <div style={{ flex: 1 }} />}

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <Link href="/cases/new" title="New Case" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', background: 'transparent', color: '#74777f', textDecoration: 'none' }}>
              <Plus size={18} />
            </Link>

            {/* Notification bell */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifs(v => !v)}
                style={{ width: '32px', height: '32px', borderRadius: '8px', background: showNotifs ? 'rgba(2,36,72,0.08)' : 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#74777f', position: 'relative' }}>
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '4px', right: '4px',
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: '#ba1a1a', border: '1.5px solid #f4f5f7',
                  }} />
                )}
              </button>
              {showNotifs && token && (
                <NotificationDrawer token={token} onClose={() => setShowNotifs(false)} />
              )}
            </div>
          </div>
        </div>

        <div id="lex-main">{children}</div>
      </div>

      <style>{`
        .mobile-menu-btn { display: none !important; }
        #lex-mobile-nav { display: none; }
        @media (max-width: 768px) {
          .mobile-menu-btn { display: flex !important; }
          #lex-mobile-nav {
            display: flex; position: fixed; bottom: 0; left: 0; right: 0;
            height: 60px; background: rgba(255,255,255,0.97);
            border-top: 1px solid rgba(0,0,0,0.08);
            justify-content: space-around; align-items: center;
            z-index: 40; backdrop-filter: blur(10px);
          }
        }
      `}</style>
      <div id="lex-mobile-nav">
        {MOBILE_NAV.map(({ href, Icon, label }) => {
          const active = isActive(href);
          return (
            <Link key={href} href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: active ? GOLD : '#74777f', textDecoration: 'none', flex: 1, padding: '6px 0' }}>
              <Icon size={21} />
              <span style={{ fontSize: '9px', fontWeight: active ? 800 : 500 }}>{label}</span>
            </Link>
          );
        })}
        <Link href="/cases/new" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', color: '#74777f', textDecoration: 'none', flex: 1, padding: '6px 0' }}>
          <Plus size={21} />
          <span style={{ fontSize: '9px', fontWeight: 500 }}>New</span>
        </Link>
      </div>
    </>
  );
}
