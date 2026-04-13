'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar, ExternalLink, FileText, RotateCcw, MapPin } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const PURPOSE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  bail:               { bg: '#ffdad6', text: '#93000a', dot: '#ba1a1a' },
  arguments:          { bg: '#ede9fe', text: '#5b21b6', dot: '#7c3aed' },
  judgment:           { bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  framing_of_charges: { bg: '#d5e3ff', text: '#001c3b', dot: '#022448' },
  evidence:           { bg: '#d5e3ff', text: '#001c3b', dot: '#022448' },
  cross_examination:  { bg: '#fff7ed', text: '#c2410c', dot: '#ea580c' },
  interim_order:      { bg: '#fef9c3', text: '#854d0e', dot: '#ca8a04' },
  default:            { bg: '#edeef0', text: '#43474e', dot: '#74777f' },
};

const purposeLabel: Record<string, string> = {
  bail: 'BAIL', arguments: 'ARG', judgment: 'JUDG',
  framing_of_charges: 'CHRG', evidence: 'EVID',
  cross_examination: 'X-EX', interim_order: 'ORD',
  examination: 'EXAM', misc: 'MISC',
};

export default function CalendarPage() {
  const { token } = useAuthStore();
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const year = current.getFullYear();
  const month = current.getMonth();
  const from = new Date(year, month, 1).toISOString().split('T')[0];
  const to = new Date(year, month + 1, 0).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', from, to],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/calendar?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { hearings: [], tasks: [] };
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const hearings: any[] = data?.hearings || [];
  const tasks: any[] = data?.tasks || [];

  // Build day map
  const dayMap: Record<string, { hearings: any[]; tasks: any[] }> = {};
  hearings.forEach(h => {
    const d = (h.date || '').split('T')[0];
    if (!d) return;
    if (!dayMap[d]) dayMap[d] = { hearings: [], tasks: [] };
    dayMap[d].hearings.push(h);
  });
  tasks.forEach(t => {
    if (!t.due_date) return;
    const d = t.due_date.split('T')[0];
    if (!dayMap[d]) dayMap[d] = { hearings: [], tasks: [] };
    dayMap[d].tasks.push(t);
  });

  // Build grid cells
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete rows
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedItems = dayMap[selectedDate];
  const selectedDateObj = new Date(selectedDate + 'T12:00:00');

  const upcomingHearings = hearings
    .filter(h => (h.date || '').split('T')[0] >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div style={{ padding: '32px 28px', fontFamily: 'Manrope, sans-serif' }}>

      {/* Hero */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2rem', fontWeight: 700, color: '#022448', margin: '0 0 4px' }}>
          Court Schedule
        </h1>
        <p style={{ fontSize: '14px', color: '#74777f', margin: 0 }}>
          {isLoading ? 'Loading...' : `Managing ${hearings.length} active hearing${hearings.length !== 1 ? 's' : ''} for ${MONTHS[month]} ${year}`}
        </p>
      </div>

      {/* Month Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
          style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(196,198,207,0.4)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={16} color="#022448" />
        </button>
        <span style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#022448', minWidth: '150px', textAlign: 'center' }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
          style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(196,198,207,0.4)', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronRight size={16} color="#022448" />
        </button>
        <button onClick={() => { setCurrent(new Date()); setSelectedDate(today); }}
          style={{ marginLeft: '8px', padding: '6px 14px', borderRadius: '6px', border: '1px solid rgba(196,198,207,0.4)', background: '#fff', fontSize: '12px', fontWeight: 700, color: '#022448', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
          TODAY
        </button>
      </div>

      {/* Main layout: Calendar + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 260px', gap: '20px', alignItems: 'start', maxWidth: '1000px' }}>

        {/* ── Calendar Grid ──────────────────────────────── */}
        <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid rgba(196,198,207,0.2)', boxShadow: '0px 2px 12px rgba(2,36,72,0.05)', overflow: 'hidden' }}>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(196,198,207,0.15)' }}>
            {DAYS.map(d => (
              <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, i) => {
              if (!day) return (
                <div key={`empty-${i}`} style={{
                  minHeight: '90px', padding: '6px',
                  background: 'rgba(196,198,207,0.04)',
                  borderRight: i % 7 !== 6 ? '1px solid rgba(196,198,207,0.08)' : 'none',
                  borderBottom: '1px solid rgba(196,198,207,0.08)',
                }} />
              );

              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const items = dayMap[dateStr];
              const isToday = dateStr === today;
              const isSelected = dateStr === selectedDate;

              return (
                <div key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    minHeight: '90px', padding: '6px',
                    borderRight: i % 7 !== 6 ? '1px solid rgba(196,198,207,0.08)' : 'none',
                    borderBottom: '1px solid rgba(196,198,207,0.08)',
                    background: isSelected ? 'rgba(2,36,72,0.04)' : 'transparent',
                    cursor: 'pointer',
                  }}>
                  {/* Day number */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '4px' }}>
                    <span style={{
                      width: '26px', height: '26px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: isToday ? 800 : 600,
                      background: isToday ? '#022448' : 'transparent',
                      color: isToday ? '#fff' : isSelected ? '#022448' : '#191c1e',
                    }}>
                      {day}
                    </span>
                  </div>
                  {/* Event pills */}
                  {items?.hearings.slice(0, 2).map((h: any, hi: number) => {
                    const colors = PURPOSE_COLORS[h.purpose] || PURPOSE_COLORS.default;
                    const label = purposeLabel[h.purpose] || 'HRNG';
                    return (
                      <div key={hi} style={{
                        display: 'flex', alignItems: 'center', gap: '3px',
                        background: colors.bg, borderRadius: '3px',
                        padding: '1px 5px', marginBottom: '2px',
                      }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: colors.dot, flexShrink: 0 }} />
                        <span style={{ fontSize: '8px', fontWeight: 800, color: colors.text, letterSpacing: '0.04em' }}>{label}</span>
                      </div>
                    );
                  })}
                  {items?.tasks.slice(0, 1).map((t: any, ti: number) => (
                    <div key={`t-${ti}`} style={{
                      display: 'flex', alignItems: 'center', gap: '3px',
                      background: '#ffe08830', borderRadius: '3px', padding: '1px 5px', marginBottom: '2px',
                    }}>
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#735c00', flexShrink: 0 }} />
                      <span style={{ fontSize: '8px', fontWeight: 800, color: '#735c00' }}>TASK</span>
                    </div>
                  ))}
                  {items && (items.hearings.length + items.tasks.length) > 2 && (
                    <span style={{ fontSize: '9px', color: '#74777f', fontWeight: 600 }}>
                      +{items.hearings.length + items.tasks.length - 2} more
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Monthly Summary */}
          <div style={{ background: '#022448', borderRadius: '16px', padding: '20px', boxShadow: '0 8px 24px rgba(2,36,72,0.2)' }}>
            <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#fff', margin: '0 0 16px' }}>
              Monthly Summary
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Total Hearings', value: hearings.length },
                { label: 'Tasks Due', value: tasks.length },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{item.label}</span>
                  <span style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.4rem', color: '#fff' }}>
                    {String(item.value).padStart(2, '0')}
                  </span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px', marginTop: '4px' }}>
                <p style={{ fontSize: '9px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', margin: '0 0 10px' }}>LEGEND</p>
                {[
                  { color: '#ba1a1a', label: 'Bail Applications' },
                  { color: '#7c3aed', label: 'Arguments' },
                  { color: '#16a34a', label: 'Judgments' },
                  { color: '#74777f', label: 'Other Hearings' },
                  { color: '#735c00', label: 'Tasks Due' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming hearings quick list */}
          {upcomingHearings.length > 0 && (
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', boxShadow: '0px 2px 12px rgba(2,36,72,0.05)' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', margin: 0 }}>NEXT HEARINGS</p>
              </div>
              {upcomingHearings.map((h: any) => {
                const daysUntil = Math.ceil((new Date(h.date).getTime() - Date.now()) / 86400000);
                const colors = PURPOSE_COLORS[h.purpose] || PURPOSE_COLORS.default;
                return (
                  <Link key={h.id} href={`/cases/${h.case?.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(196,198,207,0.06)', cursor: 'pointer' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {h.case?.title}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, padding: '1px 5px', background: colors.bg, color: colors.text, borderRadius: '2px' }}>
                            {(purposeLabel[h.purpose] || 'HRNG')}
                          </span>
                          {h.time && <span style={{ fontSize: '10px', color: '#74777f' }}>{h.time} IST</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', marginLeft: '10px', flexShrink: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 800, color: daysUntil <= 1 ? '#ba1a1a' : '#022448', margin: 0 }}>
                          {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                        <p style={{ fontSize: '9px', color: '#74777f', margin: 0, fontWeight: 600 }}>
                          {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TMRW' : `${daysUntil}d`}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Agenda Section ──────────────────────────────────── */}
      <div style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px', maxWidth: '700px' }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.5rem', color: '#022448', margin: 0 }}>
            Agenda: {selectedDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </h2>
          {selectedItems?.hearings.length > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', background: '#ffe088', color: '#745c00' }}>
              {selectedItems.hearings.length} Hearing{selectedItems.hearings.length > 1 ? 's' : ''} Scheduled
            </span>
          )}
        </div>

        {!selectedItems?.hearings.length && !selectedItems?.tasks.length ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '48px', textAlign: 'center', border: '1px solid rgba(196,198,207,0.2)' }}>
            <Calendar size={36} color="#c4c6cf" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '14px', color: '#74777f', margin: '0 0 4px', fontWeight: 600 }}>No hearings on this date</p>
            <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>Click any date on the calendar to see its schedule</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {selectedItems?.hearings.map((h: any) => {
              const colors = PURPOSE_COLORS[h.purpose] || PURPOSE_COLORS.default;
              return (
                <div key={h.id} style={{ background: '#fff', borderRadius: '10px', padding: '20px', border: '1px solid rgba(196,198,207,0.15)', boxShadow: '0px 1px 4px rgba(2,36,72,0.05)', cursor: 'pointer', maxWidth: '700px' }}>
                  <div style={{ display: 'flex', gap: '20px' }}>
                    {/* Time column */}
                    <div style={{ flexShrink: 0, textAlign: 'center', borderRight: '1px solid rgba(196,198,207,0.2)', paddingRight: '20px', minWidth: '52px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#43474e' }}>{h.time || '--:--'}</div>
                      <div style={{ fontSize: '10px', color: '#74777f' }}>IST</div>
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '9px', fontWeight: 800, padding: '3px 8px', background: colors.bg, color: colors.text, borderRadius: '2px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          {h.purpose?.replace(/_/g, ' ')}
                        </span>
                        {h.court_room && (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#43474e' }}>{h.court_room}</span>
                        )}
                      </div>
                      <h3 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#022448', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.case?.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#74777f', marginBottom: '14px' }}>
                        <MapPin size={12} />
                        <span>{h.case?.court}</span>
                        {h.case?.cnr_number && <><span>·</span><span style={{ fontFamily: 'monospace' }}>{h.case.cnr_number}</span></>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <Link href={`/cases/${h.case?.id}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color: '#022448', textDecoration: 'none' }}>
                          <ExternalLink size={13} /> VIEW CASE FILE
                        </Link>
                        <Link href={`/cases/${h.case?.id}?tab=drafts`} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 800, color: '#022448', textDecoration: 'none' }}>
                          <FileText size={13} /> BRIEFING NOTE
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Tasks on this day */}
            {selectedItems?.tasks.map((t: any) => (
              <div key={t.id} style={{ background: '#fffbeb', borderRadius: '16px', padding: '20px', border: '1px solid rgba(202,138,4,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ca8a04', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 700, color: '#854d0e', margin: 0 }}>{t.title}</p>
                    <p style={{ fontSize: '11px', color: '#a16207', margin: '2px 0 0' }}>Task due · {t.case?.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
