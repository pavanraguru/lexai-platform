'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STAT_CARDS = [
  { key: 'active_cases',          label: 'ACTIVE CASES',     icon: 'gavel',         bg: 'var(--primary)',           text: '#fff',      subColor: 'rgba(255,255,255,0.6)' },
  { key: 'hearings_this_week',    label: 'HEARINGS THIS WEEK', icon: 'calendar_month', bg: 'var(--secondary-fixed)', text: 'var(--on-secondary-container)', subColor: 'var(--secondary)' },
  { key: 'pending_tasks',         label: 'PENDING TASKS',    icon: 'task_alt',       bg: 'var(--error-container)',   text: 'var(--error)', subColor: 'var(--on-error-container)' },
  { key: 'agent_runs_this_month', label: 'AGENT RUNS',       icon: 'smart_toy',      bg: 'var(--tertiary-fixed)',    text: 'var(--tertiary)', subColor: 'var(--on-tertiary-fixed-variant)' },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  intake:          { bg: 'var(--surface-container)',      color: 'var(--on-surface-variant)' },
  filed:           { bg: 'var(--primary-fixed)',          color: 'var(--on-primary-fixed)' },
  pending_hearing: { bg: 'var(--secondary-fixed)',        color: 'var(--on-secondary-container)' },
  arguments:       { bg: '#ede9fe',                       color: '#5b21b6' },
  reserved:        { bg: '#fff7ed',                       color: '#c2410c' },
  decided:         { bg: '#dcfce7',                       color: '#15803d' },
  appeal:          { bg: 'var(--error-container)',        color: 'var(--on-error-container)' },
  closed:          { bg: 'var(--surface-container-high)', color: 'var(--outline)' },
};

const STATUS_LABELS: Record<string, string> = {
  intake: 'Intake', filed: 'Filed', pending_hearing: 'Pending Hearing',
  arguments: 'Arguments', reserved: 'Reserved', decided: 'Decided',
  appeal: 'Appeal', closed: 'Closed',
};

export default function DashboardPage() {
  const { token, user } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return (await res.json()).data;
    },
    enabled: !!token,
    refetchInterval: 60000,
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = user?.full_name?.split(' ')[0] || 'Advocate';

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">

      {/* ── Hero Greeting ──────────────────────────────────── */}
      <div className="mb-10 fade-up">
        <h1 className="font-serif font-bold mb-3" style={{ fontSize: '2.2rem', color: 'var(--primary)', lineHeight: '1.15' }}>
          {greeting()}, {firstName}
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2" style={{ color: 'var(--on-surface-variant)', fontSize: '14px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_today</span>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          {data?.today_hearings > 0 && (
            <>
              <span style={{ color: 'var(--outline-variant)' }}>·</span>
              <span className="font-bold" style={{ color: 'var(--error)', fontSize: '14px' }}>
                {data.today_hearings} hearing{data.today_hearings > 1 ? 's' : ''} today
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 mb-10">
        {STAT_CARDS.map((card, i) => (
          <div key={card.key} className={`rounded-2xl p-5 fade-up fade-up-${i + 1}`}
            style={{ background: card.bg, boxShadow: 'var(--shadow-tonal)' }}>
            <span className="material-symbols-outlined mb-3 block" style={{ color: card.text, fontSize: '22px', opacity: 0.8 }}>
              {card.icon}
            </span>
            <div className={`font-serif font-bold count-up fade-up-${i + 2}`}
              style={{ fontSize: '2.2rem', color: card.text, lineHeight: 1 }}>
              {isLoading ? (
                <div className="h-9 w-10 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.2)' }} />
              ) : (
                String(data?.[card.key] ?? 0).padStart(2, '0')
              )}
            </div>
            <p className="text-xs font-bold mt-1 tracking-wider" style={{ color: card.subColor }}>
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* ── Upcoming Hearings ──────────────────────────────── */}
      <section className="mb-10 fade-up fade-up-3">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--on-surface)' }}>
            Upcoming Hearings
          </h2>
          <Link href="/calendar" className="text-xs font-bold tracking-wider transition-colors"
            style={{ color: 'var(--secondary)' }}>
            VIEW ALL
          </Link>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--surface-container-low)' }} />
            ))
          ) : data?.upcoming_hearings?.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>No upcoming hearings scheduled</p>
            </div>
          ) : (
            data?.upcoming_hearings?.map((h: any, i: number) => {
              const daysUntil = Math.ceil((new Date(h.date).getTime() - Date.now()) / 86400000);
              const isUrgent = daysUntil <= 1;
              const isSoon = daysUntil <= 7;
              return (
                <Link key={h.id} href={`/cases/${h.case?.id}`}
                  className={`block rounded-2xl p-5 transition-all hover:shadow-lg group cursor-pointer fade-up fade-up-${i + 1}`}
                  style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)', boxShadow: 'var(--shadow-tonal)' }}>
                  <div className="flex gap-5 items-start">
                    {/* Date column */}
                    <div className="flex-shrink-0 text-center" style={{ borderRight: '1px solid rgba(196,198,207,0.2)', paddingRight: '20px', minWidth: '52px' }}>
                      <div className="text-xs font-bold uppercase" style={{ color: isUrgent ? 'var(--error)' : 'var(--on-surface-variant)' }}>
                        {new Date(h.date).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}
                      </div>
                      <div className="font-serif font-bold text-2xl" style={{ color: isUrgent ? 'var(--error)' : 'var(--primary)', lineHeight: 1.1 }}>
                        {new Date(h.date).getDate()}
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif font-bold text-base group-hover:opacity-80 transition-opacity truncate"
                        style={{ color: 'var(--primary)' }}>
                        {h.case?.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="material-symbols-outlined" style={{ fontSize: '13px', color: 'var(--on-surface-variant)' }}>location_on</span>
                        <p className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                          {h.case?.court}{h.court_room ? ` · ${h.court_room}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="text-xs font-bold px-2 py-0.5 capitalize"
                          style={{
                            background: isUrgent ? 'var(--error)' : 'var(--primary)',
                            color: '#fff',
                            borderRadius: '2px',
                            fontSize: '9px',
                            letterSpacing: '0.05em',
                          }}>
                          {h.purpose?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {h.time && (
                          <span className="text-xs font-bold" style={{ color: isUrgent ? 'var(--error)' : 'var(--on-surface-variant)' }}>
                            {h.time} IST
                          </span>
                        )}
                        <span className="ml-auto text-xs font-bold" style={{ color: isUrgent ? 'var(--error)' : isSoon ? 'var(--secondary)' : 'var(--outline)' }}>
                          {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `${daysUntil}d`}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>

      {/* ── AI Agents Banner ───────────────────────────────── */}
      <section className="mb-10 fade-up fade-up-4">
        <div className="rounded-2xl p-6" style={{ background: 'var(--primary)', boxShadow: '0 8px 32px rgba(2,36,72,0.25)' }}>
          <h2 className="font-serif font-bold text-xl mb-2" style={{ color: '#fff' }}>
            AI Agents Ready
          </h2>
          <p className="text-sm mb-5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {data?.agent_runs_this_month || 0} runs this month · {data?.active_cases || 0} active cases
          </p>
          <Link href="/cases"
            className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-lg transition-all hover:opacity-90"
            style={{ background: 'var(--secondary-fixed)', color: 'var(--on-secondary-container)', borderRadius: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>smart_toy</span>
            Run LexAI Agent
          </Link>
        </div>
      </section>

      {/* ── Recent Cases ───────────────────────────────────── */}
      <section className="fade-up fade-up-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif font-bold text-xl" style={{ color: 'var(--on-surface)' }}>
            Recent Cases
          </h2>
          <Link href="/cases" className="text-xs font-bold tracking-wider" style={{ color: 'var(--secondary)' }}>
            HISTORY
          </Link>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--surface-container-low)' }} />
            ))
          ) : data?.recent_cases?.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
              <p className="text-sm mb-3" style={{ color: 'var(--on-surface-variant)' }}>No cases yet</p>
              <Link href="/cases/new" className="text-xs font-bold" style={{ color: 'var(--primary)' }}>
                Create your first case →
              </Link>
            </div>
          ) : (
            data?.recent_cases?.map((c: any, i: number) => {
              const statusStyle = STATUS_STYLES[c.status] || STATUS_STYLES.intake;
              return (
                <Link key={c.id} href={`/cases/${c.id}`}
                  className={`block rounded-2xl p-5 transition-all hover:shadow-lg fade-up fade-up-${i + 1}`}
                  style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-xs font-bold tracking-wider uppercase"
                          style={{ color: 'var(--secondary)', fontSize: '10px' }}>
                          {c.case_type?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs px-2 py-0.5 font-bold rounded-full"
                          style={{ background: statusStyle.bg, color: statusStyle.color, fontSize: '10px' }}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                      </div>
                      <h3 className="font-serif font-bold" style={{ color: 'var(--primary)', fontSize: '16px' }}>
                        {c.title}
                      </h3>
                      {c.cnr_number && (
                        <p className="text-xs mt-1 font-mono" style={{ color: 'var(--on-surface-variant)' }}>
                          CNR: {c.cnr_number}
                        </p>
                      )}
                    </div>
                    {c.next_hearing_date && (
                      <div className="flex-shrink-0 text-right">
                        <p style={{ fontSize: '10px', color: 'var(--on-surface-variant)', fontWeight: '600' }}>NEXT</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                          {new Date(c.next_hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <div className="text-center mt-5">
          <Link href="/cases/new"
            className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 transition-all hover:opacity-80"
            style={{ color: 'var(--primary)', border: '1px solid rgba(2,36,72,0.2)', borderRadius: '6px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            New Case
          </Link>
        </div>
      </section>
    </div>
  );
}
