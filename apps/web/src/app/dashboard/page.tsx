// ============================================================
// LexAI India — Dashboard Page
// PRD v1.1 CM-02 — Case Dashboard
// ============================================================


import { FolderOpen, Calendar, Bot, AlertCircle } from 'lucide-react';
import { CASE_STATUS_LABELS } from '@/lib/constants';

// Stat card component
function StatCard({ icon: Icon, label, value, sub, color = 'navy' }: {
  icon: any; label: string; value: string | number; sub?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    navy:   'border-l-[#1E3A5F] text-[#1E3A5F]',
    gold:   'border-l-[#D4AF37] text-[#D4AF37]',
    green:  'border-l-green-600 text-green-600',
    red:    'border-l-red-600 text-red-600',
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 border-l-4 ${colors[color]} p-5 shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{label}</p>
          <p className="text-3xl font-bold mt-1" style={{ color: 'var(--lexai-navy)' }}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-gray-50">
          <Icon size={22} className="opacity-60" />
        </div>
      </div>
    </div>
  );
}

// Upcoming hearing card
function HearingCard({ hearing }: { hearing: any }) {
  const daysUntil = Math.ceil(
    (new Date(hearing.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const urgentColor = daysUntil <= 1 ? 'bg-red-50 border-red-200' :
                      daysUntil <= 7 ? 'bg-yellow-50 border-yellow-200' :
                      'bg-white border-gray-200';

  return (
    <div className={`rounded-lg border p-4 ${urgentColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{hearing.case?.title || 'Unknown Case'}</p>
          <p className="text-xs text-gray-500 mt-0.5">{hearing.case?.court}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
              {hearing.purpose?.replace(/_/g, ' ')}
            </span>
            {hearing.time && <span className="text-xs text-gray-500">{hearing.time} IST</span>}
          </div>
        </div>
        <div className="text-right ml-3 flex-shrink-0">
          <p className="text-sm font-bold" style={{ color: daysUntil <= 1 ? '#B7231A' : '#1E3A5F' }}>
            {new Date(hearing.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </p>
          <p className="text-xs text-gray-400">
            {daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil}d`}
          </p>
        </div>
      </div>
    </div>
  );
}

// Case status badge
function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    intake: 'bg-gray-100 text-gray-600',
    filed: 'bg-blue-100 text-blue-700',
    pending_hearing: 'bg-yellow-100 text-yellow-700',
    arguments: 'bg-purple-100 text-purple-700',
    reserved: 'bg-orange-100 text-orange-700',
    decided: 'bg-green-100 text-green-700',
    appeal: 'bg-red-100 text-red-700',
    closed: 'bg-gray-100 text-gray-400',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${classes[status] || classes.intake}`}>
      {CASE_STATUS_LABELS[status as keyof typeof CASE_STATUS_LABELS] || status}
    </span>
  );
}

export default function DashboardPage() {
  // In production these come from the API via TanStack Query
  // For Phase 0 shell: static placeholder data that shows the layout
  const stats = {
    active_cases: 12,
    hearings_this_week: 4,
    pending_tasks: 7,
    agent_runs_this_month: 23,
    outstanding_invoices: 3,
    storage_used_gb: 1.2,
  };

  const upcomingHearings = [
    { id: '1', date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), time: '10:30', purpose: 'bail', case: { title: 'State vs Ramesh Kumar', court: 'Delhi Sessions Court' } },
    { id: '2', date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), time: '11:00', purpose: 'arguments', case: { title: 'Mehta Pvt Ltd vs NCLT', court: 'NCLT Mumbai Bench' } },
    { id: '3', date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), time: '14:00', purpose: 'judgment', case: { title: 'Priya vs Mohan (HMA Petition)', court: 'Delhi Family Court' } },
  ];

  const recentCases = [
    { id: '1', title: 'State vs Ramesh Kumar', case_type: 'criminal_sessions', court: 'Delhi Sessions Court', status: 'pending_hearing', next_hearing_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '2', title: 'Mehta Pvt Ltd vs NCLT', case_type: 'corporate_nclt', court: 'NCLT Mumbai', status: 'arguments', next_hearing_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '3', title: 'M/s Global Traders vs DRT', case_type: 'tax', court: 'DRT Delhi', status: 'filed', next_hearing_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() },
    { id: '4', title: 'Priya vs Mohan (Divorce)', case_type: 'family', court: 'Family Court, Delhi', status: 'reserved', next_hearing_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString() },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--lexai-navy)' }}>
          Good morning, Arjun ⚖
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          {' · '}You have <span className="font-semibold text-yellow-600">{stats.hearings_this_week} hearings</span> this week.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={FolderOpen}   label="Active Cases"            value={stats.active_cases}            sub="2 added this month"   color="navy"  />
        <StatCard icon={Calendar}     label="Hearings This Week"      value={stats.hearings_this_week}      sub="Next: tomorrow 10:30" color="gold"  />
        <StatCard icon={AlertCircle}  label="Pending Tasks"           value={stats.pending_tasks}           sub="3 overdue"            color="red"   />
        <StatCard icon={Bot}          label="Agent Runs This Month"   value={stats.agent_runs_this_month}   sub="27 remaining in plan" color="green" />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming Hearings */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={16} style={{ color: 'var(--lexai-navy)' }} />
                Upcoming Hearings
              </h2>
              <a href="/calendar" className="text-xs text-blue-600 hover:underline">View all</a>
            </div>
            <div className="p-4 space-y-3">
              {upcomingHearings.map(h => <HearingCard key={h.id} hearing={h} />)}
            </div>
          </div>
        </div>

        {/* Recent Cases */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <FolderOpen size={16} style={{ color: 'var(--lexai-navy)' }} />
                Recent Cases
              </h2>
              <a href="/cases" className="text-xs text-blue-600 hover:underline">All cases</a>
            </div>
            <div className="divide-y divide-gray-50">
              {recentCases.map(c => (
                <a key={c.id} href={`/cases/${c.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{c.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {c.court} · {c.case_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-gray-400">
                      {new Date(c.next_hearing_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </a>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 text-center">
              <a href="/cases/new"
                className="text-sm font-medium hover:underline"
                style={{ color: 'var(--lexai-navy)' }}>
                + Add New Case
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* AI Agents Quick Launch */}
      <div className="mt-6 bg-gradient-to-r from-[#1E3A5F] to-[#2E5F8A] rounded-lg p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Bot size={20} color="#D4AF37" />
              AI Agents Ready
            </h3>
            <p className="text-blue-200 text-sm mt-1">
              Run intelligent analysis on your case documents
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Evidence', 'Timeline', 'Research', 'Strategy'].map(agent => (
              <a key={agent} href={`/agents?type=${agent.toLowerCase()}`}
                className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                {agent} →
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
