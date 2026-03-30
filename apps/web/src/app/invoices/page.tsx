'use client';
// ============================================================
// LexAI India — Invoices Page
// PRD v1.1 INV-01 to INV-05
// ============================================================

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { invoicesApi } from '@/lib/api';
import { Receipt, Plus, CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft:          { bg: 'bg-gray-100',   text: 'text-gray-500',  label: 'Draft' },
  issued:         { bg: 'bg-blue-100',   text: 'text-blue-700',  label: 'Issued' },
  paid:           { bg: 'bg-green-100',  text: 'text-green-700', label: 'Paid' },
  partially_paid: { bg: 'bg-yellow-100', text: 'text-yellow-700',label: 'Part Paid' },
  overdue:        { bg: 'bg-red-100',    text: 'text-red-700',   label: 'Overdue' },
  cancelled:      { bg: 'bg-gray-100',   text: 'text-gray-400',  label: 'Cancelled' },
};

function formatINR(paise: bigint | number): string {
  const amount = Number(paise) / 100;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
}

export default function InvoicesPage() {
  const { token, canViewBilling } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.list(token!),
    enabled: !!token,
  });

  const invoices = data?.data || [];

  if (!canViewBilling()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Invoice access requires Managing Partner role.</p>
        </div>
      </div>
    );
  }

  // Stats
  const totalOutstanding = invoices.filter((i: any) => ['issued', 'overdue', 'partially_paid'].includes(i.status))
    .reduce((sum: number, i: any) => sum + Number(i.balance_paise), 0);
  const totalCollected = invoices.filter((i: any) => ['paid', 'partially_paid'].includes(i.status))
    .reduce((sum: number, i: any) => sum + Number(i.amount_paid_paise), 0);
  const overdueCount = invoices.filter((i: any) => i.status === 'overdue').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1E3A5F' }}>Invoices</h1>
          <p className="text-gray-500 text-sm mt-0.5">{invoices.length} total invoices</p>
        </div>
        <a href="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: '#1E3A5F' }}>
          <Plus size={16} />
          New Invoice
        </a>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Outstanding</p>
          <p className="text-2xl font-bold mt-1 text-red-600">{formatINR(totalOutstanding)}</p>
          {overdueCount > 0 && <p className="text-xs text-red-400 mt-1">{overdueCount} overdue</p>}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Collected (all time)</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{formatINR(totalCollected)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Invoiced</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#1E3A5F' }}>
            {formatINR(invoices.reduce((s: number, i: any) => s + Number(i.total_paise), 0))}
          </p>
        </div>
      </div>

      {/* Invoice list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gray-400" />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20">
          <Receipt size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No invoices yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first invoice from any case or client profile</p>
          <a href="/invoices/new"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: '#1E3A5F' }}>
            <Plus size={14} /> Create Invoice
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-5 py-3">Invoice</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden sm:table-cell">Client</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase px-4 py-3">Amount</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3">Status</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase px-4 py-3 hidden md:table-cell">Due Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((inv: any) => {
                const style = STATUS_STYLES[inv.status] || STATUS_STYLES.draft;
                return (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-sm text-gray-900">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-400">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</p>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <p className="text-sm text-gray-700">{inv.client?.full_name || '—'}</p>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <p className="font-semibold text-sm text-gray-900">{formatINR(inv.total_paise)}</p>
                      {inv.balance_paise > 0 && Number(inv.balance_paise) !== Number(inv.total_paise) && (
                        <p className="text-xs text-gray-400">Balance: {formatINR(inv.balance_paise)}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <span className={`text-sm ${inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-IN') : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <a href={`/invoices/${inv.id}`} className="text-xs text-blue-600 hover:underline">View</a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
