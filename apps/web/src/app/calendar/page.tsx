'use client';
// ============================================================
// LexAI India — Calendar Page
// PRD v1.1 CAL-01 — Monthly/weekly hearing + task view
// ============================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar, Clock, AlertCircle } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const HEARING_PURPOSE_COLORS: Record<string, string> = {
  bail: 'bg-red-100 text-red-700 border-red-200',
  arguments: 'bg-purple-100 text-purple-700 border-purple-200',
  judgment: 'bg-green-100 text-green-700 border-green-200',
  framing_of_charges: 'bg-orange-100 text-orange-700 border-orange-200',
  evidence: 'bg-blue-100 text-blue-700 border-blue-200',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function CalendarPage() {
  const { token } = useAuthStore();
  const [current, setCurrent] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();

  const from = new Date(year, month, 1).toISOString().split('T')[0];
  const to = new Date(year, month + 1, 0).toISOString().split('T')[0];

  const { data, isLoading } = useQuery({
    queryKey: ['calendar', from, to],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/calendar?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
  });

  const hearings: any[] = data?.hearings || [];
  const tasks: any[] = data?.tasks || [];

  // Build a map of date → items
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

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedDate = selectedDay;
  const selectedItems = selectedDate ? dayMap[selectedDate] : null;

  const prevMonth = () => setCurrent(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrent(new Date(year, month + 1, 1));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {hearings.length} hearings · {tasks.length} tasks due this month
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <span className="font-semibold text-gray-900 min-w-[140px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
          <button onClick={() => { setCurrent(new Date()); setSelectedDay(today); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50">
            Today
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Calendar grid */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100">
              {DAYS.map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, i) => {
                if (!day) return <div key={i} className="h-20 border-b border-r border-gray-50 bg-gray-50/50" />;

                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const items = dayMap[dateStr];
                const isToday = dateStr === today;
                const isSelected = dateStr === selectedDay;

                return (
                  <div key={i}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={`h-20 border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors overflow-hidden
                      ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                    <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                      ${isToday ? 'text-white' : 'text-gray-700'}`}
                      style={isToday ? { backgroundColor: '#1E3A5F' } : {}}>
                      {day}
                    </div>
                    {items?.hearings.slice(0, 2).map((h: any, hi: number) => (
                      <div key={hi} className={`text-xs px-1 py-0.5 rounded mb-0.5 truncate border ${HEARING_PURPOSE_COLORS[h.purpose] || HEARING_PURPOSE_COLORS.default}`}>
                        {h.time ? h.time + ' ' : ''}{h.case?.title?.split(' ').slice(0, 2).join(' ')}
                      </div>
                    ))}
                    {items?.tasks.slice(0, 1).map((t: any, ti: number) => (
                      <div key={ti} className="text-xs px-1 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200 truncate">
                        ✓ {t.title}
                      </div>
                    ))}
                    {((items?.hearings.length || 0) + (items?.tasks.length || 0)) > 3 && (
                      <div className="text-xs text-gray-400">+{(items?.hearings.length || 0) + (items?.tasks.length || 0) - 3} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {[
              { label: 'Bail', color: 'bg-red-100 border-red-200' },
              { label: 'Arguments', color: 'bg-purple-100 border-purple-200' },
              { label: 'Judgment', color: 'bg-green-100 border-green-200' },
              { label: 'Other hearing', color: 'bg-gray-100 border-gray-200' },
              { label: 'Task due', color: 'bg-yellow-50 border-yellow-200' },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded border ${color}`} />
                <span className="text-xs text-gray-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Side panel */}
        <div className="lg:col-span-1">
          {selectedDate ? (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="font-semibold text-gray-900">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
                {selectedDate === today && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white mt-1 inline-block" style={{ backgroundColor: '#1E3A5F', color: '#fff' }}>
                    Today
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3">
                {!selectedItems && (
                  <p className="text-sm text-gray-400 text-center py-4">No events</p>
                )}
                {selectedItems?.hearings.map((h: any) => (
                  <Link key={h.id} href={`/cases/${h.case?.id}`}
                    className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-2">
                      <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{h.case?.title}</p>
                        <p className="text-xs text-gray-500 truncate">{h.case?.court}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded border capitalize ${HEARING_PURPOSE_COLORS[h.purpose] || HEARING_PURPOSE_COLORS.default}`}>
                            {h.purpose?.replace(/_/g, ' ')}
                          </span>
                          {h.time && <span className="text-xs text-gray-400">{h.time} IST</span>}
                        </div>
                        {h.court_room && <p className="text-xs text-gray-400 mt-0.5">Room: {h.court_room}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
                {selectedItems?.tasks.map((t: any) => (
                  <Link key={t.id} href={`/cases/${t.case?.id}`}
                    className="block rounded-lg border border-yellow-200 bg-yellow-50 p-3 hover:bg-yellow-100 transition-colors">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-yellow-900 truncate">{t.title}</p>
                        <p className="text-xs text-yellow-700 truncate">{t.case?.title}</p>
                        <span className={`text-xs font-medium mt-1 inline-block capitalize
                          ${t.priority === 'urgent' ? 'text-red-600' : t.priority === 'high' ? 'text-orange-600' : 'text-gray-500'}`}>
                          {t.priority} priority
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <Calendar size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">Click a date to see events</p>
              {isLoading && <p className="text-xs text-gray-400 mt-2">Loading calendar...</p>}
            </div>
          )}

          {/* Upcoming hearings list */}
          {hearings.filter(h => h.date.split('T')[0] >= today).slice(0, 5).length > 0 && (
            <div className="mt-4 bg-white rounded-xl border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase">Next hearings</p>
              </div>
              <div className="divide-y divide-gray-50">
                {hearings
                  .filter(h => h.date.split('T')[0] >= today)
                  .slice(0, 5)
                  .map((h: any) => {
                    const daysUntil = Math.ceil((new Date(h.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <Link key={h.id} href={`/cases/${h.case?.id}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium text-gray-900 truncate">{h.case?.title}</p>
                          <p className="text-xs text-gray-400 capitalize">{h.purpose?.replace(/_/g, ' ')}</p>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-xs font-bold" style={{ color: daysUntil <= 1 ? '#B7231A' : '#1E3A5F' }}>
                            {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-xs text-gray-400">
                            {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`}
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
