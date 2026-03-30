'use client';
// ============================================================
// LexAI India — Cases List Page
// PRD v1.1 CM-03 — Global Case List with filters
// ============================================================

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { casesApi } from '@/lib/api';
import { CASE_STATUS_LABELS } from '@lexai/core';
import {
  Plus, Search, Filter, FolderOpen, Calendar,
  Bot, Clock, ChevronRight, AlertCircle, Loader2
} from 'lucide-react';

const CASE_TYPE_LABELS: Record<string, string> = {
  criminal_sessions: 'Criminal (Sessions)',
  criminal_magistrate: 'Criminal (Magistrate)',
  civil_district: 'Civil (District)',
  writ_hc: 'Writ / HC',
  corporate_nclt: 'Corporate / NCLT',
  family: 'Family',
  labour: 'Labour',
  ip: 'IP',
  tax: 'Tax',
  arbitration: 'Arbitration',
  consumer: 'Consumer',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  intake:           { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: '#9CA3AF' },
  filed:            { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: '#3B82F6' },
  pending_hearing:  { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: '#F59E0B' },
  arguments:        { bg: 'bg-purple-100', text: 'text-purple-700', dot: '#8B5CF6' },
  reserved:         { bg: 'bg-orange-100', text: 'text-orange-700', dot: '#F97316' },
  decided:          { bg: 'bg-green-100',  text: 'text-green-700',  dot: '#10B981' },
  appeal:           { bg: 'bg-red-100',    text: 'text-red-700',    dot: '#EF4444' },
  closed:           { bg: 'bg-gray-100',   text: 'text-gray-400',   dot: '#D1D5DB' },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  normal: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.intake;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.dot }} />
      {CASE_STATUS_LABELS[status as keyof typeof CASE_STATUS_LABELS] || status}
    </span>
  );
}

function DaysUntilHearing({ date }: { date: string | null }) {
  if (!date) return <span className="text-xs text-gray-300">—</span>;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return <span className="text-xs text-gray-300">Past</span>;
  if (days === 0) return <span className="text-xs font-bold text-red-600">TODAY</span>;
  if (days === 1) return <span className="text-xs font-bold text-orange-500">Tomorrow</span>;
  if (days <= 7) return (
    <span className="text-xs font-semibold text-orange-500">
      {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      <span className="text-gray-400 font-normal ml-1">({days}d)</span>
    </span>
  );
  return (
    <span className="text-xs text-gray-500">
      {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
    </span>
  );
}

export default function CasesPage() {
  const { token, canManageCases } = useAuthStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases', statusFilter, typeFilter, search],
    queryFn: () => casesApi.list(token!, {
      status: statusFilter || undefined,
      case_type: typeFilter || undefined,
      search: search || undefined,
    }),
    enabled: !!token,
  });

  const cases = data?.data || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>
            Cases
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isLoading ? 'Loading...' : `${cases.length} case${cases.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        {canManageCases() && (
          <Link href="/cases/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1E3A5F' }}>
            <Plus size={16} />
            New Case
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-3">
        {/* Search */}
        <div className="flex-1 min-w-48 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title, CNR, party name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All Statuses</option>
          {Object.entries(CASE_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">All Types</option>
          {Object.entries(CASE_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {(statusFilter || typeFilter || search) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
            Clear filters
          </button>
        )}
      </div>

      {/* Cases list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl">
          <AlertCircle size={16} />
          <span className="text-sm">Failed to load cases. Check your connection.</span>
        </div>
      ) : cases.length === 0 ? (
        <div className="text-center py-20">
          <FolderOpen size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No cases found</p>
          <p className="text-gray-400 text-sm mt-1">
            {search || statusFilter || typeFilter ? 'Try adjusting your filters' : 'Add your first case to get started'}
          </p>
          {canManageCases() && !search && (
            <Link href="/cases/new"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: '#1E3A5F' }}>
              <Plus size={14} /> Add First Case
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-5 py-3">Case</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden md:table-cell">Type</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden lg:table-cell">Next Hearing</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 hidden xl:table-cell">Docs / Tasks</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cases.map((c: any) => (
                <tr key={c.id}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/cases/${c.id}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#EEF3FF' }}>
                        <FolderOpen size={14} style={{ color: '#1E3A5F' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate max-w-xs">
                          {c.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {c.court}
                          {c.cnr_number && <span className="ml-2 font-mono">{c.cnr_number}</span>}
                        </p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[c.priority] || PRIORITY_COLORS.normal}`}>
                          {c.priority}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <span className="text-xs text-gray-500">
                      {CASE_TYPE_LABELS[c.case_type] || c.case_type}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <DaysUntilHearing date={c.next_hearing_date} />
                  </td>
                  <td className="px-4 py-4 hidden xl:table-cell">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <FolderOpen size={12} /> {c._count?.documents || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bot size={12} /> {c._count?.agent_jobs || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {c._count?.tasks || 0}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <ChevronRight size={16} className="text-gray-300" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
