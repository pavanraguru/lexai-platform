'use client';
// ============================================================
// LexAI India — App Shell Layout
// Sidebar navigation for all authenticated pages
// ============================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Scale, LayoutDashboard, FolderOpen, Calendar,
  Bot, FileText, Users, Receipt, Bell, Settings,
  ChevronDown, LogOut, Menu, X, Search, ChevronLeft
} from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { getSupabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',          roles: ['all'] },
  { href: '/cases',      icon: FolderOpen,      label: 'Cases',               roles: ['all'] },
  { href: '/calendar',   icon: Calendar,        label: 'Calendar',             roles: ['all'] },
  { href: '/agents',     icon: Bot,             label: 'AI Agents',            roles: ['super_admin','managing_partner','senior_advocate','junior_associate'] },
  { href: '/drafts',     icon: FileText,        label: 'Drafting Workspace',   roles: ['super_admin','managing_partner','senior_advocate','junior_associate'] },
  { href: '/clients',    icon: Users,           label: 'Clients',              roles: ['super_admin','managing_partner','senior_advocate','junior_associate','clerk'] },
  { href: '/invoices',   icon: Receipt,         label: 'Invoices',             roles: ['super_admin','managing_partner'] },
  { href: '/admin',      icon: Settings,        label: 'Settings',             roles: ['super_admin','managing_partner'] },
];

function NavItem({ href, icon: Icon, label, active }: {
  href: string; icon: any; label: string; active: boolean;
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
        ${active
          ? 'text-white'
          : 'text-blue-200 hover:text-white hover:bg-white/10'
        }`}
      style={active ? { backgroundColor: 'rgba(255,255,255,0.15)' } : {}}>
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, clearUser } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const { data: notifData } = useQuery({
    queryKey: ['notif-count', user?.id],
    queryFn: async () => {
      if (!token) return { count: 0 };
      const res = await fetch(`${BASE}/v1/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return { count: (json.data || []).filter((n: any) => !n.read).length };
    },
    enabled: !!token,
    refetchInterval: 30000,
  });
  const notifCount = notifData?.count || 0;

  const handleLogout = async () => {
    await getSupabase().auth.signOut();
    clearUser();
    router.push('/login');
  };

  const visibleNav = NAV_ITEMS.filter(item =>
    item.roles.includes('all') || item.roles.includes(user?.role || '')
  );

  const Sidebar = () => (
    <div className="flex flex-col h-full"
      style={{ background: 'linear-gradient(180deg, #1E3A5F 0%, #162d4a 100%)' }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <Scale size={26} color="#D4AF37" />
        <div>
          <p className="text-white font-bold text-base leading-tight">LexAI India</p>
          <p className="text-blue-300 text-xs">{user?.tenant_name || 'Legal Platform'}</p>
        </div>
      </div>

      {/* Search shortcut */}
      <div className="px-3 py-3">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 text-blue-200 text-sm hover:bg-white/15 transition-colors">
          <Search size={14} />
          <span className="flex-1 text-left">Search cases...</span>
          <kbd className="text-xs text-blue-400">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {visibleNav.map(item => (
          <NavItem
            key={item.href}
            {...item}
            active={pathname === item.href || pathname.startsWith(item.href + '/')}
          />
        ))}
      </nav>

      {/* Plan badge */}
      <div className="px-4 py-3 border-t border-white/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-blue-300">
            {user?.tenant_plan === 'starter' ? '🌱 Starter Plan' :
             user?.tenant_plan === 'professional' ? '⭐ Professional' : '🏆 Enterprise'}
          </span>
          {user?.tenant_plan === 'starter' && (
            <Link href="/admin/billing"
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{ backgroundColor: '#D4AF37', color: '#1E3A5F' }}>
              Upgrade
            </Link>
          )}
        </div>

        {/* User profile */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ backgroundColor: '#D4AF37', color: '#1E3A5F' }}>
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.full_name || 'User'}</p>
            <p className="text-blue-300 text-xs truncate">{user?.role?.replace(/_/g, ' ')}</p>
          </div>
          <button onClick={handleLogout}
            className="text-blue-300 hover:text-white transition-colors p-1"
            title="Sign out">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-60 xl:w-64 flex-shrink-0 flex-col">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64 flex flex-col">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button onClick={() => setMobileOpen(true)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
            <Menu size={20} className="text-gray-600" />
          </button>

          {/* Back button — show on all pages except dashboard */}
          {pathname !== '/dashboard' && (
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-800">
              <ChevronLeft size={16} />
              <span className="text-sm hidden sm:inline">Dashboard</span>
            </button>
          )}

          <div className="flex-1" />

          {/* Notification bell */}
          <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Bell size={20} className="text-gray-600" />
            {notifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 text-xs font-bold text-white rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#B7231A' }}>
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* User avatar (mobile) */}
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ backgroundColor: '#D4AF37', color: '#1E3A5F' }}>
            {user?.full_name?.charAt(0) || 'U'}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
