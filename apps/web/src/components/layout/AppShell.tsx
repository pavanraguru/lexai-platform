'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', icon: 'dashboard',    label: 'Dashboard',   mobileIcon: 'home' },
  { href: '/cases',     icon: 'folder_shared', label: 'My Cases',    mobileIcon: 'assistant' },
  { href: '/calendar',  icon: 'calendar_month',label: 'Calendar',    mobileIcon: 'event_note' },
  { href: '/drafts',    icon: 'history_edu',   label: 'Drafts',      mobileIcon: 'history_edu' },
  { href: '/clients',   icon: 'people',        label: 'Clients',     mobileIcon: 'people' },
  { href: '/invoices',  icon: 'receipt_long',  label: 'Billing',     mobileIcon: 'receipt_long' },
  { href: '/settings',  icon: 'settings',      label: 'Settings',    mobileIcon: 'settings' },
];

const MOBILE_NAV = NAV.slice(0, 4);

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div style={{ background: 'var(--background)' }} className="min-h-screen">

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside style={{
        background: 'var(--surface-container-lowest)',
        borderRight: '1px solid rgba(196,198,207,0.15)',
      }} className="hidden md:flex h-full w-72 left-0 top-0 fixed flex-col py-8 px-4 z-40">

        {/* Logo */}
        <div className="mb-10 px-4">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '22px' }}>gavel</span>
            <h1 className="font-serif text-lg font-bold tracking-tight" style={{ color: 'var(--primary)' }}>
              Sovereign Counsel
            </h1>
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3 px-4 mb-8">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ background: 'var(--primary-fixed)', color: 'var(--primary)' }}>
            P
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>Adv. Pavan Kumar</p>
            <p style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }}>Telangana High Court</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-0.5 flex-1">
          {NAV.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className="flex items-center gap-3 px-4 py-3 transition-all duration-200"
                style={{
                  color: active ? 'var(--primary)' : 'var(--on-surface-variant)',
                  fontWeight: active ? '700' : '500',
                  fontSize: '14px',
                  background: active ? 'rgba(2,36,72,0.05)' : 'transparent',
                  borderRight: active ? '3px solid var(--secondary)' : '3px solid transparent',
                  borderRadius: active ? '0' : '8px',
                }}>
                <span className="material-symbols-outlined" style={{
                  fontSize: '20px',
                  fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom hint */}
        <div className="px-4 mt-6 pt-6" style={{ borderTop: '1px solid rgba(196,198,207,0.2)' }}>
          <p style={{ fontSize: '11px', color: 'var(--on-surface-variant)', lineHeight: '1.5' }}>
            LexAI India v1.1<br />
            <span style={{ color: 'var(--secondary)' }}>AI-Powered Legal Platform</span>
          </p>
        </div>
      </aside>

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <header className="w-full top-0 sticky z-30 flex items-center justify-between px-6 py-3 md:pl-8"
        style={{
          background: 'rgba(248,249,251,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(196,198,207,0.2)',
        }}>
        <div className="flex items-center gap-3 md:hidden">
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>gavel</span>
          <h2 className="font-serif text-lg font-bold tracking-tight" style={{ color: 'var(--primary)' }}>
            Sovereign Counsel
          </h2>
        </div>

        {/* Back button on desktop — hidden on dashboard */}
        {pathname !== '/dashboard' && (
          <Link href="/dashboard" className="hidden md:flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: 'var(--on-surface-variant)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>arrow_back</span>
            Dashboard
          </Link>
        )}
        <div className="hidden md:block" />

        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 rounded-full transition-colors"
              style={{ color: 'var(--on-surface-variant)' }}
              onBlur={() => setTimeout(() => setNotifOpen(false), 150)}>
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
                style={{ background: 'var(--error)' }} />
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 rounded-2xl overflow-hidden z-50"
                style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-elevated)', border: '1px solid rgba(196,198,207,0.15)' }}>
                <div className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderBottom: '1px solid rgba(196,198,207,0.15)' }}>
                  <p className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>Notifications</p>
                  <button className="text-xs font-bold" style={{ color: 'var(--secondary)' }}>Mark all read</button>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {[
                    { title: 'Hearing Tomorrow', msg: 'State vs Ramesh · Delhi HC · 10:30 IST', time: '2h ago', dot: true },
                    { title: 'Agent completed', msg: 'Evidence analysis for Global Tech Corp', time: '5h ago', dot: false },
                    { title: 'Task overdue', msg: 'File written arguments · M/S Sona Steels', time: '1d ago', dot: false },
                  ].map((n, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      {n.dot && <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--primary)' }} />}
                      {!n.dot && <div className="w-1.5 h-1.5 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold" style={{ color: 'var(--on-surface)' }}>{n.title}</p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--on-surface-variant)' }}>{n.msg}</p>
                        <p style={{ fontSize: '10px', color: 'var(--outline)' }} className="mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ────────────────────────────────────── */}
      <main className="md:pl-72 pb-20 md:pb-0 min-h-screen">
        {children}
      </main>

      {/* ── Mobile Bottom Nav ───────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-16 z-50"
        style={{
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(196,198,207,0.3)',
        }}>
        {MOBILE_NAV.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 transition-colors"
              style={{ color: active ? 'var(--secondary)' : 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined" style={{
                fontSize: '22px',
                fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
              }}>{item.mobileIcon}</span>
              <span style={{ fontSize: '10px', fontWeight: active ? '700' : '500' }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Mobile FAB ──────────────────────────────────────── */}
      <button className="md:hidden fixed bottom-20 right-6 w-14 h-14 rounded-full text-white flex items-center justify-center z-40 transition-transform hover:scale-105 active:scale-95"
        style={{ background: 'var(--primary)', boxShadow: '0 8px 24px rgba(2,36,72,0.3)' }}>
        <span className="material-symbols-outlined">add</span>
      </button>

      {/* Material Symbols font */}
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <style>{`.material-symbols-outlined { font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; display: inline-block; line-height: 1; }`}</style>
    </div>
  );
}
