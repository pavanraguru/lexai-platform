'use client';
// apps/web/src/app/portal/calendar/page.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

const PURPOSE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  bail:               { bg: '#ffdad6', text: '#93000a', dot: '#ba1a1a' },
  arguments:          { bg: '#ede9fe', text: '#5b21b6', dot: '#7c3aed' },
  judgment:           { bg: '#dcfce7', text: '#15803d', dot: '#16a34a' },
  framing_of_charges: { bg: '#d5e3ff', text: '#001c3b', dot: '#022448' },
  evidence:           { bg: '#d5e3ff', text: '#001c3b', dot: '#022448' },
  default:            { bg: '#edeef0', text: '#43474e', dot: '#74777f' },
};

export default function PortalCalendarPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [hearings, setHearings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const year = current.getFullYear();
  const month = current.getMonth();
  const from = new Date(year, month, 1).toISOString().split('T')[0];
  const to = new Date(year, month + 1, 0).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const token = localStorage.getItem('portal_token');
    if (!token) { router.push('/portal/login'); return; }

    // Fetch all cases then extract hearings
    fetch(`${BASE}/v1/portal/cases`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        const allHearings: any[] = [];
        for (const c of d.cases || []) {
          for (const h of c.hearings || []) {
            allHearings.push({ ...h, caseTitle: c.title, caseId: c.id });
          }
        }
        setHearings(allHearings);
      })
      .finally(() => setLoading(false));
  }, []);

  // Build hearing map by date
  const hearingMap: Record<string, any[]> = {};
  for (const h of hearings) {
    const d = h.date?.split('T')[0];
    if (d) {
      hearingMap[d] = hearingMap[d] || [];
      hearingMap[d].push(h);
    }
  }

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectedHearings = hearingMap[selectedDate] || [];

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '800px' },
    heading: { fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '24px' },
    calCard: { background: '#fff', borderRadius: '16px', border: '1px solid rgba(196,198,207,0.2)', overflow: 'hidden', marginBottom: '20px' },
    calHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' },
    monthTitle: { fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 700, color: '#022448' },
    navBtn: { background: '#f1f5f9', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#022448' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#f1f5f9' },
    dayHeader: { background: '#fff', padding: '8px', textAlign: 'center' as const, fontSize: '10px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em' },
    cell: (isToday: boolean, isSelected: boolean, hasHearings: boolean): React.CSSProperties => ({
      background: isSelected ? '#022448' : '#fff',
      padding: '6px 4px', minHeight: '52px', cursor: 'pointer',
      position: 'relative', textAlign: 'center' as const,
      borderRadius: isSelected ? '0' : '0',
    }),
    dateNum: (isToday: boolean, isSelected: boolean): React.CSSProperties => ({
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '26px', height: '26px', borderRadius: '50%',
      fontSize: '13px', fontWeight: isToday || isSelected ? 700 : 400,
      background: isSelected ? '#ffe088' : isToday ? '#022448' : 'transparent',
      color: isSelected ? '#022448' : isToday ? '#fff' : '#374151',
      margin: '0 auto 2px',
    }),
    hearingDot: (purpose: string): React.CSSProperties => ({
      width: '5px', height: '5px', borderRadius: '50%', margin: '1px auto',
      background: (PURPOSE_COLORS[purpose] || PURPOSE_COLORS.default).dot,
    }),
    detailCard: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', padding: '16px 20px' },
    detailDate: { fontSize: '13px', fontWeight: 700, color: '#022448', marginBottom: '12px' },
    hearingRow: { display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f8fafc' },
    hearingDotLarge: (purpose: string): React.CSSProperties => ({
      width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0, marginTop: '4px',
      background: (PURPOSE_COLORS[purpose] || PURPOSE_COLORS.default).dot,
    }),
  };

  return (
    <div style={s.page}>
      <div style={s.heading}>Calendar</div>

      <div style={s.calCard}>
        <div style={s.calHeader}>
          <button style={s.navBtn} onClick={() => setCurrent(new Date(year, month - 1, 1))}>
            <ChevronLeft size={16} />
          </button>
          <div style={s.monthTitle}>{MONTHS[month]} {year}</div>
          <button style={s.navBtn} onClick={() => setCurrent(new Date(year, month + 1, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={s.grid}>
          {DAYS.map(d => <div key={d} style={s.dayHeader}>{d}</div>)}
          {cells.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} style={{ background: '#fafafa' }} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            const dayHearings = hearingMap[dateStr] || [];
            return (
              <div key={dateStr} style={s.cell(isToday, isSelected, dayHearings.length > 0)} onClick={() => setSelectedDate(dateStr)}>
                <div style={s.dateNum(isToday, isSelected)}>{day}</div>
                {dayHearings.slice(0, 2).map((h: any, hi: number) => (
                  <div key={hi} style={s.hearingDot(h.purpose || 'default')} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div style={s.detailCard}>
        <div style={s.detailDate}>
          {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        {selectedHearings.length === 0 ? (
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>No hearings on this day.</div>
        ) : selectedHearings.map((h: any) => {
          const pc = PURPOSE_COLORS[h.purpose] || PURPOSE_COLORS.default;
          return (
            <div key={h.id} style={{ ...s.hearingRow }}>
              <div style={s.hearingDotLarge(h.purpose)} />
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#022448' }}>{h.caseTitle}</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{h.purpose || 'Hearing'}</div>
                {h.outcome && <div style={{ fontSize: '12px', color: '#15803d', background: '#dcfce7', display: 'inline-block', padding: '2px 8px', borderRadius: '6px', marginTop: '4px' }}>{h.outcome}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
