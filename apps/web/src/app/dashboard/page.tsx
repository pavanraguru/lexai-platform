'use client';
// ============================================================
// LexAI India — Dashboard Page (Phase 1b — Live Stats)
// PRD v1.1 CM-02 — Case Dashboard
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderOpen, Calendar, AlertCircle, Bot,
  ChevronRight, Loader2, Clock, CheckCircle2
} from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CASE_STATUS_LABELS: Record<string, string> = {
  intake: 'Intake', filed: 'Filed', pending_hearing: 'Pending Hearing',
  arguments: 'Arguments', reserved: 'Reserved', decided: 'Decided',
  appeal: 'Appeal', closed: 'Closed',
};

function StatCard({ icon: Icon, label, value, sub, color = 'navy', loading }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string; loading?: boolean;
}) {
  const colors: Record<string, string> = {
    navy:  'border-l-[#1E3A5F]',
    gold:  'border-l-[#D4AF37]',
    green: 'border-l-green-600',
    red:   'border-l-red-600',
  };
  return (
    <div className={`bg-white rounded-lg border border-gray-200 border-l-4 ${colors[color]} p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          {loading
            ? <div className="h-9 w-12 bg-gray-100 rounded mt-1 animate-pulse" />
            : <p className="text-3xl font-bold mt-1" style={{ color: '#1E3A5F' }}>{value}</p>
          }
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-gray-50">
          <Icon size={22} className="opacity-50" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    intake: 'bg-gray-100 text-gray-600', filed: 'bg-blue-100 text-blue-700',
    pending_hearing: 'bg-yellow-100 text-yellow-700', arguments: 'bg-purple-100 text-purple-700',
    reserved: 'bg-orange-100 text-orange-700', decided: 'bg-green-100 text-green-700',
    appeal: 'bg-red-100 text-red-700', closed: 'bg-gray-100 text-gray-400',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes[status] || classes.intake}`}>
      {CASE_STATUS_LABELS[status] || status}
    </span>
  );
}

export default function DashboardPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      return json.data;
    },
    enabled: !!token,
    refetchInterval: 60000, // refresh every minute
  });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>
          {greeting()}, {user?.full_name?.split(' ')[0] || 'Advocate'} ⚖
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {data?.today_hearings > 0 && (
            <> · <span className="font-semibold text-red-600">{data.today_hearings} hearing{data.today_hearings > 1 ? 's' : ''} today</span></>
          )}
          {data?.today_hearings === 0 && data?.hearings_this_week > 0 && (
            <> · <span className="font-semibold text-yellow-600">{data.hearings_this_week} hearing{data.hearings_this_week > 1 ? 's' : ''} this week</span></>
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FolderOpen}  label="Active Cases"          value={data?.active_cases ?? '—'}          sub="Open matters"              color="navy"  loading={isLoading} />
        <StatCard icon={Calendar}    label="Hearings This Week"    value={data?.hearings_this_week ?? '—'}    sub={data?.today_hearings > 0 ? `${data.today_hearings} today` : 'No hearings today'} color="gold"  loading={isLoading} />
        <StatCard icon={AlertCircle} label="Pending Tasks"         value={data?.pending_tasks ?? '—'}         sub={data?.overdue_tasks > 0 ? `${data.overdue_tasks} overdue` : 'None overdue'} color={data?.overdue_tasks > 0 ? 'red' : 'navy'} loading={isLoading} />
        <StatCard icon={Bot}         label="Agent Runs This Month" value={data?.agent_runs_this_month ?? '—'} sub={`Plan: ${data?.plan || '—'}`}  color="green" loading={isLoading} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming Hearings */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={16} style={{ color: '#1E3A5F' }} />
                Upcoming Hearings
              </h2>
              <Link href="/calendar" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            <div className="p-4 space-y-3">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-50 rounded-lg animate-pulse" />
                ))
              ) : data?.upcoming_hearings?.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No upcoming hearings</p>
              ) : (
                data?.upcoming_hearings?.map((h: any) => {
                  const daysUntil = Math.ceil((new Date(h.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const urgentColor = daysUntil <= 1 ? 'bg-red-50 border-red-200' : daysUntil <= 7 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200';
                  return (
                    <Link key={h.id} href={`/cases/${h.case?.id}`}
                      className={`block rounded-lg border p-3 hover:shadow-sm transition-shadow ${urgentColor}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{h.case?.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{h.case?.court}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                              {h.purpose?.replace(/_/g, ' ')}
                            </span>
                            {h.time && <span className="text-xs text-gray-400">{h.time} IST</span>}
                          </div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-sm font-bold" style={{ color: daysUntil <= 1 ? '#B7231A' : '#1E3A5F' }}>
                            {new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                          <p className="text-xs text-gray-400">
                            {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil}d`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Recent Cases */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FolderOpen size={16} style={{ color: '#1E3A5F' }} />
                Recent Cases
              </h2>
              <Link href="/cases" className="text-xs text-blue-600 hover:underline">All cases</Link>
            </div>
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : data?.recent_cases?.length === 0 ? (
              <div className="p-8 text-center">
                <FolderOpen size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">No cases yet</p>
                <Link href="/cases/new" className="mt-2 inline-block text-sm text-blue-600 hover:underline">Create your first case</Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data?.recent_cases?.map((c: any) => (
                  <Link key={c.id} href={`/cases/${c.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{c.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {c.court} · {c.case_type?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                      <StatusBadge status={c.status} />
                      {c.next_hearing_date && (
                        <span className="text-xs text-gray-400">
                          {new Date(c.next_hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                      <ChevronRight size={14} className="text-gray-300" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="px-5 py-3 border-t border-gray-100 text-center">
              <Link href="/cases/new"
                className="text-sm font-medium hover:underline"
                style={{ color: '#1E3A5F' }}>
                + Add New Case
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* AI Agents Quick Launch */}
      <div className="mt-6 rounded-xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2E5F8A 100%)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Bot size={20} color="#D4AF37" />
              AI Agents Ready
            </h3>
            <p className="text-blue-200 text-sm mt-1">
              {data?.agent_runs_this_month || 0} runs this month · {data?.active_cases || 0} active cases
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Evidence', 'Timeline', 'Research', 'Deposition', 'Strategy'].map(agent => (
              <Link key={agent} href="/cases"
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                {agent} →
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
