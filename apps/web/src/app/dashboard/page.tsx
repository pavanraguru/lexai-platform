'use client';
import { useLang } from '@/hooks/useLanguage';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  Gavel, Calendar, CheckSquare, Bot,
  MapPin, ChevronRight, Plus, ArrowRight
} from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  intake:          { bg: '#edeef0', color: '#43474e' },
  filed:           { bg: '#d5e3ff', color: '#001c3b' },
  pending_hearing: { bg: '#ffe088', color: '#745c00' },
  arguments:       { bg: '#ede9fe', color: '#5b21b6' },
  reserved:        { bg: '#fff7ed', color: '#c2410c' },
  decided:         { bg: '#dcfce7', color: '#15803d' },
  appeal:          { bg: '#ffdad6', color: '#93000a' },
  closed:          { bg: '#e7e8ea', color: '#74777f' },
};

const STATUS_LABELS: Record<string, string> = {
  intake: 'Intake', filed: 'Filed', pending_hearing: 'Pending Hearing',
  arguments: 'Arguments', reserved: 'Reserved', decided: 'Decided',
  appeal: 'Appeal', closed: 'Closed',
};

const CASE_TYPE_LABELS: Record<string, string> = {
  criminal_sessions: 'Criminal', criminal_magistrate: 'Criminal (Mag)',
  civil_district: 'Civil', writ_hc: 'Writ (HC)', corporate_nclt: 'Corporate',
  family: 'Family', labour: 'Labour', ip: 'IP', tax: 'Tax',
  arbitration: 'Arbitration', consumer: 'Consumer',
};

export default function DashboardPage() {
  const { token, user } = useAuthStore();
  const { tr } = useLang();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch stats');
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

  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Advocate';

  const STATS = [
    { key: 'active_cases',          label: 'ACTIVE CASES',      Icon: Gavel,       bg: '#022448', numColor: '#fff',     labelColor: 'rgba(255,255,255,0.7)' },
    { key: 'hearings_this_week',    label: 'HEARINGS THIS WEEK', Icon: Calendar,    bg: '#ffe088', numColor: '#745c00',  labelColor: '#735c00' },
    { key: 'pending_tasks',         label: 'PENDING TASKS',      Icon: CheckSquare, bg: '#ffdad6', numColor: '#ba1a1a',  labelColor: '#93000a' },
    { key: 'agent_runs_this_month', label: 'AGENT RUNS',         Icon: Bot,         bg: '#fdddb9', numColor: '#322109',  labelColor: '#584328' },
  ];

  return (
    <div style={{ padding: '32px 28px', fontFamily: 'Manrope, sans-serif' }}>

      {/* ── Greeting ─────────────────────────────────────── */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2.2rem', fontWeight: 700, color: '#022448', lineHeight: 1.15, margin: 0 }}>
          {greeting()}, {firstName}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: '#43474e', fontSize: '14px' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          {data?.today_hearings > 0 && (
            <>
              <span style={{ color: '#c4c6cf' }}>·</span>
              <span style={{ color: '#ba1a1a', fontWeight: 700, fontSize: '14px' }}>
                {data.today_hearings} hearing{data.today_hearings > 1 ? 's' : ''} today
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Stats Grid ───────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {STATS.map(({ key, label, Icon, bg, numColor, labelColor }) => (
          <div key={key} style={{
            background: bg, borderRadius: '12px', padding: '20px',
            width: '140px', flexShrink: 0,
          }}>
            <Icon size={16} color={numColor} style={{ opacity: 0.8, marginBottom: '8px', display: 'block' }} />
            <div style={{ fontFamily: 'Newsreader, serif', fontSize: '1.7rem', fontWeight: 700, color: numColor, lineHeight: 1 }}>
              {isLoading
                ? <span style={{ display: 'inline-block', width: '48px', height: '36px', background: 'rgba(255,255,255,0.25)', borderRadius: '4px' }} />
                : String(data?.[key] ?? 0).padStart(2, '0')
              }
            </div>
            <p style={{ fontSize: '9px', fontWeight: 800, color: labelColor, letterSpacing: '0.07em', marginTop: '4px' }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* ── {tr('upcoming_hearings')} ────────────────────────────── */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', maxWidth: '780px' }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#191c1e', margin: 0 }}>
            {tr('upcoming_hearings')}
          </h2>
          <Link href="/calendar" style={{ fontSize: '11px', fontWeight: 800, color: '#735c00', letterSpacing: '0.08em', textDecoration: 'none' }}>
            VIEW ALL
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} style={{ height: '80px', borderRadius: '16px', background: '#edeef0', animation: 'pulse 2s infinite' }} />
            ))
          ) : !data?.upcoming_hearings?.length ? (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '32px', textAlign: 'center', border: '1px solid rgba(196,198,207,0.2)' }}>
              <p style={{ color: '#74777f', fontSize: '14px', margin: 0 }}>{tr('no_upcoming')}</p>
            </div>
          ) : (
            data.upcoming_hearings.map((h: any) => {
              const daysUntil = Math.ceil((new Date(h.date).getTime() - Date.now()) / 86400000);
              const isUrgent = daysUntil <= 1;
              return (
                <Link key={h.id} href={`/cases/${h.case?.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: '#fff', borderRadius: '10px', padding: '20px',
                    border: '1px solid rgba(196,198,207,0.18)',
                    boxShadow: '0px 1px 4px rgba(2,36,72,0.05)',
                    display: 'flex', gap: '16px', alignItems: 'center',
                    cursor: 'pointer', maxWidth: '780px',
                    transition: 'box-shadow 0.15s, border-color 0.15s',
                  }}>
                    {/* Date column */}
                    <div style={{ textAlign: 'center', borderRight: '1px solid rgba(196,198,207,0.2)', paddingRight: '14px', minWidth: '40px', flexShrink: 0 }}>
                      <div style={{ fontSize: '9px', fontWeight: 800, color: isUrgent ? '#ba1a1a' : '#74777f', textTransform: 'uppercase' }}>
                        {new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}
                      </div>
                      <div style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.5rem', color: isUrgent ? '#ba1a1a' : '#022448', lineHeight: 1 }}>
                        {new Date(h.date).getDate()}
                      </div>
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '14px', color: '#022448', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.case?.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#43474e' }}>
                        <MapPin size={11} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.case?.court}{h.court_room ? ` · ${h.court_room}` : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 8px', background: isUrgent ? '#ba1a1a' : '#022448', color: '#fff', borderRadius: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          {h.purpose?.replace(/_/g, ' ')}
                        </span>
                        {h.time && <span style={{ fontSize: '11px', fontWeight: 700, color: isUrgent ? '#ba1a1a' : '#43474e' }}>{h.time} IST</span>}
                        <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 800, color: isUrgent ? '#ba1a1a' : daysUntil <= 7 ? '#735c00' : '#74777f', flexShrink: 0 }}>
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

      {/* ── AI Agents Banner ─────────────────────────────── */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ background: '#022448', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 16px rgba(2,36,72,0.2)', display: 'inline-flex', alignItems: 'center', gap: '20px' }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#fff', margin: 0 }}>
            AI Agents Ready
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '2px 0 0', lineHeight: 1.4 }}>
            {data?.agent_runs_this_month || 0} runs this month · {data?.active_cases || 0} active cases analysed
          </p>
          <Link href="/cases" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#ffe088', color: '#745c00', fontWeight: 800, fontSize: '13px', padding: '10px 20px', borderRadius: '6px' }}>
              <Bot size={16} />
              Run LexAI Agent
            </div>
          </Link>
        </div>
      </section>

      {/* ── Recent Cases ─────────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', maxWidth: '780px' }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#191c1e', margin: 0 }}>
            Recent Cases
          </h2>
          <Link href="/cases" style={{ fontSize: '11px', fontWeight: 800, color: '#735c00', letterSpacing: '0.08em', textDecoration: 'none' }}>
            HISTORY
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: '80px', borderRadius: '16px', background: '#edeef0' }} />
            ))
          ) : !data?.recent_cases?.length ? (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', textAlign: 'center', border: '1px solid rgba(196,198,207,0.2)' }}>
              <p style={{ color: '#74777f', fontSize: '14px', marginBottom: '16px' }}>No cases yet</p>
              <Link href="/cases/new" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#022448', color: '#fff', fontWeight: 700, fontSize: '13px', padding: '10px 20px', borderRadius: '6px' }}>
                <Plus size={15} /> Create First Case
              </Link>
            </div>
          ) : (
            data.recent_cases.map((c: any) => {
              const statusStyle = STATUS_STYLES[c.status] || STATUS_STYLES.intake;
              return (
                <Link key={c.id} href={`/cases/${c.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ background: '#fff', borderRadius: '10px', padding: '20px', border: '1px solid rgba(196,198,207,0.18)', boxShadow: '0px 1px 4px rgba(2,36,72,0.05)', cursor: 'pointer', maxWidth: '780px', transition: 'box-shadow 0.15s, border-color 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#735c00', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {CASE_TYPE_LABELS[c.case_type] || c.case_type?.replace(/_/g, ' ')}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: statusStyle.bg, color: statusStyle.color }}>
                            {STATUS_LABELS[c.status] || c.status}
                          </span>
                        </div>
                        <div style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '16px', color: '#022448', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.title}
                        </div>
                        {c.cnr_number && (
                          <p style={{ fontSize: '11px', color: '#43474e', fontFamily: 'monospace', marginTop: '3px' }}>
                            CNR: {c.cnr_number}
                          </p>
                        )}
                      </div>
                      {c.next_hearing_date && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '9px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', margin: 0 }}>NEXT</p>
                          <p style={{ fontWeight: 800, fontSize: '13px', color: '#022448', margin: 0 }}>
                            {new Date(c.next_hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link href="/cases/new" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#022448', fontWeight: 700, fontSize: '13px', padding: '10px 20px', border: '1px solid rgba(2,36,72,0.2)', borderRadius: '6px' }}>
            <Plus size={14} /> New Case
          </Link>
        </div>
      </section>

    </div>
  );
}
