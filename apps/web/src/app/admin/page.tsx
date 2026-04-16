'use client';

// ============================================================
// LexAI India — Admin Panel
// PRD ADMIN-01 to ADMIN-05
// Role guard: managing_partner only
// Sections: Platform Stats, Tenant List, Tenant Detail
// ============================================================

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, Scale, Bot, FileText, TrendingUp,
  ChevronRight, Search, RefreshCw, CheckCircle, XCircle,
  ToggleLeft, ToggleRight, ChevronLeft,
} from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PLAN_COLORS: Record<string, { bg: string; text: string }> = {
  starter:      { bg: '#edeef0', text: '#43474e' },
  professional: { bg: '#d5e3ff', text: '#001c3b' },
  enterprise:   { bg: '#ffe088', text: '#745c00' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:     { bg: '#dcfce7', text: '#15803d' },
  trialing:   { bg: '#fef9c3', text: '#854d0e' },
  past_due:   { bg: '#fde8e8', text: '#b91c1c' },
  cancelled:  { bg: '#edeef0', text: '#74777f' },
  suspended:  { bg: '#fde8e8', text: '#7c2d12' },
};

function StatCard({ label, value, sub, bg, icon: Icon, color }: any) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid rgba(196,198,207,0.2)', boxShadow: '0 1px 4px rgba(2,36,72,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>{label}</p>
        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <p style={{ fontFamily: 'Newsreader, serif', fontSize: '2rem', fontWeight: 700, color: '#022448', margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>{sub}</p>}
    </div>
  );
}

function Badge({ label, scheme }: { label: string; scheme: Record<string, { bg: string; text: string }>; }) {
  const s = scheme[label] || { bg: '#edeef0', text: '#43474e' };
  return (
    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: 800, background: s.bg, color: s.text, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {label}
    </span>
  );
}

export default function AdminPage() {
  const { token, user } = useAuthStore();
  const router = useRouter();

  const [stats, setStats]         = useState<any>(null);
  const [tenants, setTenants]     = useState<any[]>([]);
  const [meta, setMeta]           = useState<any>({ total: 0, page: 1, pages: 1 });
  const [selected, setSelected]   = useState<any>(null);
  const [search, setSearch]       = useState('');
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingList, setLoadingList]   = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [updating, setUpdating]   = useState<string | null>(null);
  const [page, setPage]           = useState(1);

  // Role guard
  useEffect(() => {
    if (user && user.role !== 'managing_partner') {
      router.replace('/dashboard');
    }
  }, [user]);

  const fetchStats = async () => {
    if (!token) return;
    setLoadingStats(true);
    try {
      const res = await fetch(`${BASE}/v1/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setStats(data.data);
    } catch {}
    setLoadingStats(false);
  };

  const fetchTenants = async (p = 1, q = '') => {
    if (!token) return;
    setLoadingList(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: '15' });
      if (q.trim()) params.set('search', q.trim());
      const res = await fetch(`${BASE}/v1/admin/tenants?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) { setTenants(data.data); setMeta(data.meta); }
    } catch {}
    setLoadingList(false);
  };

  const fetchTenantDetail = async (id: string) => {
    if (!token) return;
    setLoadingDetail(true);
    try {
      const res = await fetch(`${BASE}/v1/admin/tenants/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setSelected(data.data);
    } catch {}
    setLoadingDetail(false);
  };

  const updateTenant = async (id: string, payload: any) => {
    if (!token) return;
    setUpdating(id);
    try {
      const res = await fetch(`${BASE}/v1/admin/tenants/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        // Update the list in-place
        setTenants(prev => prev.map(t => t.id === id ? { ...t, ...data.data } : t));
        if (selected?.id === id) setSelected((prev: any) => ({ ...prev, ...data.data }));
      } else {
        alert('Update failed: ' + (data.error?.message || 'Unknown error'));
      }
    } catch {}
    setUpdating(null);
  };

  useEffect(() => { fetchStats(); fetchTenants(1, ''); }, [token]);

  const handleSearch = (q: string) => {
    setSearch(q);
    setPage(1);
    fetchTenants(1, q);
  };

  const card: React.CSSProperties = {
    background: '#fff', borderRadius: '12px', border: '1px solid rgba(196,198,207,0.2)',
    boxShadow: '0 1px 4px rgba(2,36,72,0.04)',
  };

  if (!user || user.role !== 'managing_partner') {
    return <div style={{ padding: '48px', textAlign: 'center', fontFamily: 'Manrope, sans-serif', color: '#74777f' }}>Checking access...</div>;
  }

  return (
    <div style={{ padding: '32px 28px', fontFamily: 'Manrope, sans-serif', background: '#f4f5f7', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2rem', fontWeight: 700, color: '#022448', margin: '0 0 4px' }}>
            Admin Panel
          </h1>
          <p style={{ fontSize: '13px', color: '#74777f', margin: 0 }}>Platform management · Sovereign Counsel</p>
        </div>
        <button onClick={() => { fetchStats(); fetchTenants(page, search); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(196,198,207,0.4)', background: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#022448', fontFamily: 'Manrope, sans-serif' }}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        <StatCard label="Total Tenants"   value={loadingStats ? '…' : stats?.tenants?.total || 0}      sub={`${stats?.tenants?.active || 0} active`}          bg="#d5e3ff" color="#022448" icon={Building2} />
        <StatCard label="Total Users"     value={loadingStats ? '…' : stats?.users?.total || 0}        sub={`${stats?.users?.active || 0} active`}            bg="#dcfce7" color="#15803d" icon={Users} />
        <StatCard label="Total Cases"     value={loadingStats ? '…' : stats?.cases?.total || 0}        sub={`${stats?.cases?.active || 0} active`}            bg="#ffe088" color="#745c00" icon={Scale} />
        <StatCard label="Agent Runs"      value={loadingStats ? '…' : stats?.agent_runs?.total || 0}   sub={`${stats?.agent_runs?.this_month || 0} this month`} bg="#ede9fe" color="#5b21b6" icon={Bot} />
        <StatCard label="Documents"       value={loadingStats ? '…' : stats?.documents?.total || 0}    sub="all time"                                          bg="#edeef0" color="#43474e" icon={FileText} />
        <StatCard label="Drafts"          value={loadingStats ? '…' : stats?.drafts?.total || 0}       sub="all time"                                          bg="#fdddb9" color="#322109" icon={FileText} />
        <StatCard label="Hearings"        value={loadingStats ? '…' : stats?.hearings?.total || 0}     sub="all time"                                          bg="#fde8e8" color="#b91c1c" icon={Scale} />
        <div style={{ ...card, padding: '20px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>Plan Breakdown</p>
          {loadingStats ? <p style={{ color: '#74777f', fontSize: '12px' }}>Loading...</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {['starter', 'professional', 'enterprise'].map(plan => (
                <div key={plan} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Badge label={plan} scheme={PLAN_COLORS} />
                  <span style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448' }}>
                    {stats?.plan_breakdown?.[plan] || 0}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tenant List + Detail Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '380px 1fr' : '1fr', gap: '20px', alignItems: 'flex-start' }}>

        {/* Tenant List */}
        <div style={card}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(196,198,207,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, color: '#022448', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
                Tenants ({meta.total})
              </p>
              {selected && (
                <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#74777f', fontSize: '12px', fontWeight: 600 }}>
                  ✕ Close
                </button>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <Search size={13} color="#74777f" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by name or slug…"
                style={{ width: '100%', paddingLeft: '30px', paddingRight: '10px', paddingTop: '8px', paddingBottom: '8px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '8px', fontSize: '12px', fontFamily: 'Manrope, sans-serif', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: selected ? '600px' : '520px', overflowY: 'auto' }}>
            {loadingList ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#74777f', fontSize: '13px' }}>Loading tenants…</div>
            ) : tenants.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#74777f', fontSize: '13px' }}>No tenants found</div>
            ) : tenants.map(t => {
              const sub = t.subscription;
              const isSelected = selected?.id === t.id;
              return (
                <div key={t.id} onClick={() => { setSelected(null); fetchTenantDetail(t.id); }}
                  style={{ padding: '14px 20px', borderBottom: '1px solid rgba(196,198,207,0.1)', cursor: 'pointer', background: isSelected ? 'rgba(2,36,72,0.03)' : 'transparent', transition: 'background 0.1s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        {t.active
                          ? <CheckCircle size={12} color="#16a34a" style={{ flexShrink: 0 }} />
                          : <XCircle size={12} color="#dc2626" style={{ flexShrink: 0 }} />
                        }
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#022448', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.name}
                        </p>
                      </div>
                      <p style={{ fontSize: '10px', color: '#74777f', margin: '0 0 4px', fontFamily: 'monospace' }}>{t.slug}</p>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <Badge label={t.plan} scheme={PLAN_COLORS} />
                        {sub?.status && <Badge label={sub.status} scheme={STATUS_COLORS} />}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <p style={{ fontSize: '11px', color: '#74777f', margin: '0 0 2px' }}>{t._count?.users || 0} users</p>
                      <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>{t._count?.cases || 0} cases</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {meta.pages > 1 && (
            <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(196,198,207,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button onClick={() => { const p = Math.max(1, page - 1); setPage(p); fetchTenants(p, search); }}
                disabled={page <= 1}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(196,198,207,0.4)', background: '#fff', fontSize: '12px', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontFamily: 'Manrope, sans-serif' }}>
                <ChevronLeft size={13} /> Prev
              </button>
              <span style={{ fontSize: '11px', color: '#74777f' }}>Page {page} of {meta.pages}</span>
              <button onClick={() => { const p = Math.min(meta.pages, page + 1); setPage(p); fetchTenants(p, search); }}
                disabled={page >= meta.pages}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(196,198,207,0.4)', background: '#fff', fontSize: '12px', cursor: page >= meta.pages ? 'not-allowed' : 'pointer', opacity: page >= meta.pages ? 0.4 : 1, fontFamily: 'Manrope, sans-serif' }}>
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Tenant Detail Panel */}
        {selected && (
          <div style={card}>
            {loadingDetail ? (
              <div style={{ padding: '48px', textAlign: 'center', color: '#74777f', fontSize: '13px' }}>Loading tenant details…</div>
            ) : (
              <>
                {/* Header */}
                <div style={{ padding: '20px', borderBottom: '1px solid rgba(196,198,207,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                      <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.4rem', color: '#022448', margin: '0 0 4px' }}>
                        {selected.name}
                      </h2>
                      <p style={{ fontSize: '11px', color: '#74777f', margin: '0 0 8px', fontFamily: 'monospace' }}>{selected.id}</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <Badge label={selected.plan} scheme={PLAN_COLORS} />
                        {selected.subscriptions?.[0]?.status && (
                          <Badge label={selected.subscriptions[0].status} scheme={STATUS_COLORS} />
                        )}
                        <span style={{ fontSize: '11px', color: selected.active ? '#15803d' : '#dc2626', fontWeight: 700 }}>
                          {selected.active ? '● Active' : '● Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Toggle active */}
                      <button
                        onClick={() => updateTenant(selected.id, { active: !selected.active })}
                        disabled={updating === selected.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '8px', border: `1px solid ${selected.active ? '#fca5a5' : '#86efac'}`, background: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: selected.active ? '#dc2626' : '#15803d', fontFamily: 'Manrope, sans-serif' }}>
                        {selected.active ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        {selected.active ? 'Deactivate' : 'Activate'}
                      </button>

                      {/* Change plan */}
                      <select
                        value={selected.plan}
                        disabled={updating === selected.id}
                        onChange={e => updateTenant(selected.id, { plan: e.target.value })}
                        style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid rgba(196,198,207,0.4)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: '#022448', fontFamily: 'Manrope, sans-serif', background: '#fff' }}>
                        <option value="starter">Starter</option>
                        <option value="professional">Professional</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Usage stats */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(196,198,207,0.15)' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>Usage</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Users',     value: selected._count?.users || selected.users?.length || 0 },
                      { label: 'Cases',     value: selected._count?.cases || 0 },
                      { label: 'Docs',      value: selected._count?.documents || 0 },
                      { label: 'AI Runs',   value: selected._count?.agent_jobs || 0 },
                    ].map(item => (
                      <div key={item.label} style={{ background: '#f4f5f7', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                        <p style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.6rem', color: '#022448', margin: '0 0 2px', lineHeight: 1 }}>{item.value}</p>
                        <p style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', margin: 0, letterSpacing: '0.06em' }}>{item.label.toUpperCase()}</p>
                      </div>
                    ))}
                  </div>

                  {/* Subscription details */}
                  {selected.subscriptions?.[0] && (
                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        ['Trial ends', selected.subscriptions[0].trial_ends_at ? new Date(selected.subscriptions[0].trial_ends_at).toLocaleDateString('en-IN') : '—'],
                        ['Period end', selected.subscriptions[0].current_period_end ? new Date(selected.subscriptions[0].current_period_end).toLocaleDateString('en-IN') : '—'],
                        ['Agent runs / period', selected.subscriptions[0].agent_runs_this_period || 0],
                        ['Storage used', selected.subscriptions[0].storage_bytes_used ? `${(Number(selected.subscriptions[0].storage_bytes_used) / 1e6).toFixed(1)} MB` : '0 MB'],
                      ].map(([label, value]) => (
                        <div key={label as string}>
                          <p style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 2px' }}>{label as string}</p>
                          <p style={{ fontSize: '13px', color: '#191c1e', margin: 0, fontWeight: 500 }}>{value as string}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* User List */}
                <div style={{ padding: '16px 20px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                    Users ({selected.users?.length || 0})
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                    {(selected.users || []).map((u: any) => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#f4f5f7', borderRadius: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <p style={{ fontSize: '12px', fontWeight: 700, color: '#022448', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</p>
                            {!u.is_active && <span style={{ fontSize: '9px', background: '#fde8e8', color: '#b91c1c', padding: '1px 5px', borderRadius: '99px', fontWeight: 800 }}>INACTIVE</span>}
                          </div>
                          <p style={{ fontSize: '10px', color: '#74777f', margin: '1px 0 0' }}>{u.email}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 800, color: '#74777f', background: '#edeef0', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {u.role?.replace(/_/g, ' ')}
                          </span>
                          <p style={{ fontSize: '9px', color: '#74777f', margin: '3px 0 0' }}>
                            {u.last_seen_at ? `Last seen ${new Date(u.last_seen_at).toLocaleDateString('en-IN')}` : 'Never logged in'}
                          </p>
                        </div>
                      </div>
                    ))}
                    {(selected.users || []).length === 0 && (
                      <p style={{ fontSize: '12px', color: '#74777f', textAlign: 'center', padding: '16px' }}>No users in this tenant</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
