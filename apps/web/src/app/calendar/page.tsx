'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const PURPOSE_CHIP: Record<string, { bg: string; color: string; label: string }> = {
  bail:              { bg: 'var(--error)',    color: '#fff',     label: 'BAIL' },
  arguments:         { bg: '#7c3aed',         color: '#fff',     label: 'ARG' },
  judgment:          { bg: '#16a34a',         color: '#fff',     label: 'JUDG' },
  framing_of_charges:{ bg: 'var(--primary)',  color: '#fff',     label: 'CHARGE' },
  evidence:          { bg: 'var(--primary)',  color: '#fff',     label: 'EVID' },
  default:           { bg: 'var(--outline)',  color: '#fff',     label: 'HRNG' },
};

const PURPOSE_FULL: Record<string, { bg: string; color: string }> = {
  bail:              { bg: 'var(--error)',   color: '#fff' },
  arguments:         { bg: '#7c3aed',        color: '#fff' },
  judgment:          { bg: '#16a34a',        color: '#fff' },
  framing_of_charges:{ bg: 'var(--primary)', color: '#fff' },
  evidence:          { bg: '#0284c7',        color: '#fff' },
  default:           { bg: 'var(--outline)', color: '#fff' },
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
      return (await res.json()).data;
    },
    enabled: !!token,
  });

  const hearings: any[] = data?.hearings || [];
  const tasks: any[] = data?.tasks || [];

  // Build day map
  const dayMap: Record<string, { hearings: any[]; tasks: any[] }> = {};
  hearings.forEach(h => {
    const d = h.date.split('T')[0];
    if (!dayMap[d]) dayMap[d] = { hearings: [], tasks: [] };
    dayMap[d].hearings.push(h);
  });
  tasks.forEach(t => {
    if (!t.due_date) return;
    const d = t.due_date.split('T')[0];
    if (!dayMap[d]) dayMap[d] = { hearings: [], tasks: [] };
    dayMap[d].tasks.push(t);
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedItems = dayMap[selectedDate];
  const selectedDateObj = new Date(selectedDate + 'T12:00:00');

  const getChip = (purpose: string) => PURPOSE_CHIP[purpose] || PURPOSE_CHIP.default;
  const getFullChip = (purpose: string) => PURPOSE_FULL[purpose] || PURPOSE_FULL.default;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">

      {/* ── Hero ─────────────────────────────────────────────── */}
      <div className="mb-8 fade-up">
        <h1 className="font-serif font-bold mb-1" style={{ fontSize: '2rem', color: 'var(--primary)' }}>
          Court Schedule
        </h1>
        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
          Managing {hearings.length} active hearing{hearings.length !== 1 ? 's' : ''} for {MONTHS[month]} {year}
        </p>
      </div>

      {/* ── Month Navigation ─────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6 fade-up fade-up-1">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
          className="p-2 rounded-full transition-colors hover:opacity-70"
          style={{ background: 'var(--surface-container-low)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>chevron_left</span>
        </button>
        <span className="font-serif font-bold text-base" style={{ color: 'var(--primary)', minWidth: '140px', textAlign: 'center' }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
          className="p-2 rounded-full transition-colors hover:opacity-70"
          style={{ background: 'var(--surface-container-low)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>chevron_right</span>
        </button>
        <button onClick={() => { setCurrent(new Date()); setSelectedDate(today); }}
          className="ml-auto text-xs font-bold px-3 py-1.5 transition-all hover:opacity-80"
          style={{ background: 'var(--surface-container)', color: 'var(--primary)', borderRadius: '4px' }}>
          TODAY
        </button>
      </div>

      {/* ── Calendar Grid ─────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden mb-10 fade-up fade-up-2"
        style={{ background: 'var(--surface-container-lowest)', boxShadow: 'var(--shadow-tonal)', border: '1px solid rgba(196,198,207,0.1)' }}>

        {/* Day headers */}
        <div className="grid grid-cols-7">
          {DAYS_SHORT.map(d => (
            <div key={d} className="py-3 text-center"
              style={{ borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--on-surface-variant)', letterSpacing: '0.08em' }}>
                {d}
              </span>
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return (
              <div key={i} className="min-h-16 md:min-h-24 p-1"
                style={{ background: 'rgba(196,198,207,0.04)', borderRight: '1px solid rgba(196,198,207,0.06)', borderBottom: '1px solid rgba(196,198,207,0.06)' }} />
            );

            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const items = dayMap[dateStr];
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;

            return (
              <div key={i}
                onClick={() => setSelectedDate(dateStr)}
                className="min-h-16 md:min-h-24 p-1.5 cursor-pointer transition-all"
                style={{
                  borderRight: i % 7 !== 6 ? '1px solid rgba(196,198,207,0.06)' : 'none',
                  borderBottom: '1px solid rgba(196,198,207,0.06)',
                  background: isSelected ? 'rgba(2,36,72,0.04)' : 'transparent',
                }}>
                {/* Day number */}
                <div className="flex justify-start mb-1 ml-0.5">
                  <span className="flex items-center justify-center font-bold text-xs w-6 h-6 rounded-full"
                    style={{
                      background: isToday ? 'var(--primary)' : 'transparent',
                      color: isToday ? '#fff' : isSelected ? 'var(--primary)' : 'var(--on-surface)',
                      fontWeight: isToday || isSelected ? '800' : '600',
                    }}>
                    {day}
                  </span>
                </div>
                {/* Event chips */}
                {items?.hearings.slice(0, 2).map((h: any, hi: number) => {
                  const chip = getChip(h.purpose);
                  return (
                    <div key={hi} className="flex items-center gap-0.5 mb-0.5 rounded-sm px-1 py-0.5"
                      style={{ background: chip.bg + '15', maxWidth: '100%' }}>
                      <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: chip.bg }} />
                      <span style={{ fontSize: '8px', fontWeight: '700', color: chip.bg, letterSpacing: '0.04em', lineHeight: 1 }}>
                        {chip.label}
                      </span>
                    </div>
                  );
                })}
                {items && (items.hearings.length + items.tasks.length) > 2 && (
                  <div style={{ fontSize: '8px', color: 'var(--outline)', fontWeight: '600' }}>
                    +{items.hearings.length + items.tasks.length - 2}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Agenda + Summary ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Agenda */}
        <div className="lg:col-span-2 space-y-5 fade-up fade-up-3">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-2xl" style={{ color: 'var(--primary)' }}>
              Agenda: {selectedDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h2>
            {selectedItems?.hearings.length > 0 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: 'var(--secondary-container)', color: 'var(--on-secondary-container)' }}>
                {selectedItems.hearings.length} Hearing{selectedItems.hearings.length > 1 ? 's' : ''} Scheduled
              </span>
            )}
          </div>

          {!selectedItems?.hearings.length && !selectedItems?.tasks.length ? (
            <div className="rounded-2xl p-10 text-center"
              style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
              <span className="material-symbols-outlined mb-3 block" style={{ fontSize: '36px', color: 'var(--outline-variant)' }}>
                event_available
              </span>
              <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>No hearings on this date</p>
              <p style={{ fontSize: '12px', color: 'var(--outline)', marginTop: '4px' }}>Select a date on the calendar above</p>
            </div>
          ) : (
            selectedItems?.hearings.map((h: any, i: number) => {
              const chip = getFullChip(h.purpose);
              return (
                <div key={h.id}
                  className={`rounded-2xl p-6 transition-all hover:shadow-lg group cursor-pointer fade-up fade-up-${i + 1}`}
                  style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)', boxShadow: 'var(--shadow-tonal)' }}>
                  <div className="flex gap-6">
                    {/* Time */}
                    <div className="flex flex-col items-center flex-shrink-0"
                      style={{ borderRight: '1px solid rgba(196,198,207,0.2)', paddingRight: '20px', minWidth: '48px' }}>
                      <span className="text-sm font-bold uppercase" style={{ color: 'var(--on-surface-variant)' }}>
                        {h.time || '--:--'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--outline)' }}>IST</span>
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2 gap-3">
                        <span className="text-xs font-bold px-2 py-0.5 tracking-wider"
                          style={{ background: chip.bg, color: chip.color, borderRadius: '2px', fontSize: '9px' }}>
                          {h.purpose?.replace(/_/g, ' ').toUpperCase()}
                        </span>
                        {h.court_room && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: 'var(--on-surface-variant)' }}>
                            {h.court_room}
                          </span>
                        )}
                      </div>
                      <h3 className="font-serif font-bold text-lg group-hover:opacity-75 transition-opacity mb-1"
                        style={{ color: 'var(--primary)' }}>
                        {h.case?.title}
                      </h3>
                      <p className="text-sm mb-4" style={{ color: 'var(--on-surface-variant)' }}>
                        {h.case?.court}{h.case?.cnr_number ? ` · CNR: ${h.case.cnr_number}` : ''}
                      </p>
                      <div className="flex items-center gap-5 flex-wrap">
                        <Link href={`/cases/${h.case?.id}`}
                          className="flex items-center gap-1 text-xs font-bold transition-colors hover:opacity-70"
                          style={{ color: 'var(--primary)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
                          VIEW CASE FILE
                        </Link>
                        <Link href={`/cases/${h.case?.id}?tab=drafts`}
                          className="flex items-center gap-1 text-xs font-bold transition-colors hover:opacity-70"
                          style={{ color: 'var(--primary)' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>description</span>
                          BRIEFING NOTE
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5 fade-up fade-up-4">
          {/* Monthly Summary */}
          <div className="rounded-2xl p-6" style={{ background: 'var(--primary)', boxShadow: '0 8px 32px rgba(2,36,72,0.25)' }}>
            <h3 className="font-serif font-bold text-xl mb-5" style={{ color: '#fff' }}>Monthly Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Total Hearings</span>
                <span className="font-serif font-bold text-xl" style={{ color: '#fff' }}>
                  {String(hearings.length).padStart(2, '0')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Tasks Due</span>
                <span className="font-serif font-bold text-xl" style={{ color: '#fff' }}>
                  {String(tasks.length).padStart(2, '0')}
                </span>
              </div>
              <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <p style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', marginBottom: '10px' }}>
                  LEGEND
                </p>
                <div className="space-y-2">
                  {[
                    { color: 'var(--error)',   label: 'Bail Applications' },
                    { color: '#7c3aed',         label: 'Arguments' },
                    { color: '#16a34a',         label: 'Judgments' },
                    { color: 'var(--primary-fixed-dim)', label: 'Other Hearings' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Sync */}
          <div className="rounded-2xl p-6"
            style={{ background: 'var(--surface-container-low)', border: '1px solid rgba(196,198,207,0.1)' }}>
            <h3 className="font-serif font-bold text-lg mb-3" style={{ color: 'var(--primary)' }}>
              Quick Calendar Sync
            </h3>
            <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>
              Sync your court schedule with Google Calendar or Outlook for real-time notifications.
            </p>
            <button className="w-full py-3 font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80"
              style={{ background: 'var(--surface-container-lowest)', color: 'var(--primary)', border: '1px solid rgba(196,198,207,0.2)', borderRadius: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>sync</span>
              SYNC NOW
            </button>
          </div>

          {/* Upcoming list */}
          {hearings.filter(h => h.date.split('T')[0] >= today).length > 0 && (
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--surface-container-lowest)', border: '1px solid rgba(196,198,207,0.1)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', color: 'var(--on-surface-variant)' }}>
                  NEXT HEARINGS
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(196,198,207,0.08)' }}>
                {hearings.filter(h => h.date.split('T')[0] >= today).slice(0, 4).map((h: any) => {
                  const daysUntil = Math.ceil((new Date(h.date).getTime() - Date.now()) / 86400000);
                  return (
                    <Link key={h.id} href={`/cases/${h.case?.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:opacity-70 transition-opacity">
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: 'var(--primary)' }}>{h.case?.title}</p>
                        <p style={{ fontSize: '10px', color: 'var(--on-surface-variant)' }} className="capitalize">
                          {h.purpose?.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="text-xs font-bold" style={{ color: daysUntil <= 1 ? 'var(--error)' : 'var(--primary)' }}>
                          {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                        <p style={{ fontSize: '9px', color: 'var(--outline)', fontWeight: '600' }}>
                          {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TMRW' : `${daysUntil}d`}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
