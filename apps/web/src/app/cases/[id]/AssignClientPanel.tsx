'use client';
// apps/web/src/app/cases/[id]/AssignClientPanel.tsx
// Shows assigned clients on a case + assign/remove + invite to portal

import { useState, useEffect } from 'react';
import { Users, Plus, X, ExternalLink, Check } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CLIENT_ROLES = [
  { value: 'accused',     label: 'Accused' },
  { value: 'complainant', label: 'Complainant' },
  { value: 'petitioner',  label: 'Petitioner' },
  { value: 'respondent',  label: 'Respondent' },
  { value: 'witness',     label: 'Witness' },
  { value: 'other',       label: 'Other' },
];

interface AssignedClient {
  client_id: string;
  role: string;
  client: { id: string; full_name: string; phone: string; email: string | null };
}

interface AvailableClient {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
}

interface Props {
  caseId: string;
  token: string;
}

export default function AssignClientPanel({ caseId, token }: Props) {
  const [assigned, setAssigned] = useState<AssignedClient[]>([]);
  const [available, setAvailable] = useState<AvailableClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedRole, setSelectedRole] = useState('accused');
  const [assigning, setAssigning] = useState(false);
  const [inviting, setInviting] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const h = { Authorization: `Bearer ${token}` };

  function loadAssigned() {
    fetch(`${BASE}/v1/cases/${caseId}/clients`, { headers: h })
      .then(r => r.json())
      .then(d => setAssigned(d.data || []))
      .finally(() => setLoading(false));
  }

  function loadAvailable() {
    fetch(`${BASE}/v1/clients`, { headers: h })
      .then(r => r.json())
      .then(d => setAvailable(d.data || []));
  }

  useEffect(() => { loadAssigned(); loadAvailable(); }, [caseId]);

  async function handleAssign() {
    if (!selectedClient) return;
    setAssigning(true);
    try {
      await fetch(`${BASE}/v1/cases/${caseId}/clients`, {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selectedClient, role: selectedRole }),
      });
      loadAssigned();
      setShowPicker(false);
      setSelectedClient('');
      setSelectedRole('accused');
      setSearch('');
    } catch (e) { console.error(e); }
    setAssigning(false);
  }

  async function handleRemove(clientId: string) {
    await fetch(`${BASE}/v1/cases/${caseId}/clients/${clientId}`, { method: 'DELETE', headers: h });
    loadAssigned();
  }

  async function handleInvite(client: AssignedClient['client']) {
    setInviting(client.id);
    try {
      const res = await fetch(`${BASE}/v1/portal/invite`, {
        method: 'POST',
        headers: { ...h, 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: client.id, email: client.email || '', name: client.full_name }),
      });
      const data = await res.json();
      if (data.invite_url) {
        setInviteUrl(prev => ({ ...prev, [client.id]: data.invite_url }));
      }
    } catch (e) { console.error(e); }
    setInviting(null);
  }

  function copyLink(clientId: string) {
    const url = inviteUrl[clientId];
    if (!url) return;
    try { navigator.clipboard.writeText(url); } catch (e) {}
    setCopied(clientId);
    setTimeout(() => setCopied(null), 2000);
  }

  const filteredAvailable = available.filter(c =>
    !assigned.find(a => a.client_id === c.id) &&
    (c.full_name.toLowerCase().includes(search.toLowerCase()) ||
     c.phone.includes(search))
  );

  const s: Record<string, React.CSSProperties> = {
    panel: {
      background: '#fff', borderRadius: '14px', padding: '16px 20px',
      border: '1px solid rgba(196,198,207,0.2)', marginTop: '16px',
    },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' },
    title: { fontSize: '13px', fontWeight: 700, color: '#022448', display: 'flex', alignItems: 'center', gap: '6px' },
    assignBtn: {
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '6px 12px', background: '#022448', color: '#ffe088',
      border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
      cursor: 'pointer', fontFamily: 'Manrope, sans-serif',
    },
    clientRow: {
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 0', borderBottom: '1px solid #f8fafc',
    },
    avatar: {
      width: '34px', height: '34px', borderRadius: '50%',
      background: '#ffe088', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: '13px', fontWeight: 800,
      color: '#022448', flexShrink: 0,
    },
    name: { fontSize: '13px', fontWeight: 600, color: '#022448' },
    meta: { fontSize: '11px', color: '#74777f', marginTop: '1px' },
    rolePill: {
      fontSize: '10px', fontWeight: 700, padding: '2px 8px',
      borderRadius: '20px', background: '#d5e3ff', color: '#001c3b',
      flexShrink: 0, textTransform: 'capitalize' as const,
    },
    inviteBtn: {
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '5px 10px', background: '#f0f4ff',
      border: '1px solid rgba(2,36,72,0.15)', borderRadius: '7px',
      fontSize: '11px', fontWeight: 600, color: '#022448',
      cursor: 'pointer', fontFamily: 'Manrope, sans-serif', flexShrink: 0,
    },
    copyBtn: {
      display: 'flex', alignItems: 'center', gap: '4px',
      padding: '5px 10px', background: '#dcfce7',
      border: '1px solid rgba(21,128,61,0.2)', borderRadius: '7px',
      fontSize: '11px', fontWeight: 600, color: '#15803d',
      cursor: 'pointer', fontFamily: 'Manrope, sans-serif', flexShrink: 0,
    },
    removeBtn: {
      background: 'none', border: 'none', cursor: 'pointer',
      color: '#94a3b8', padding: '4px', display: 'flex', alignItems: 'center',
    },
    picker: {
      background: '#f8fafc', borderRadius: '10px', padding: '14px',
      border: '1px solid rgba(196,198,207,0.3)', marginTop: '10px',
    },
    searchInput: {
      width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb',
      borderRadius: '8px', fontSize: '13px', fontFamily: 'Manrope, sans-serif',
      marginBottom: '10px', boxSizing: 'border-box' as const, outline: 'none',
    },
    clientOption: (selected: boolean): React.CSSProperties => ({
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
      background: selected ? '#e8eeff' : 'transparent',
      border: selected ? '1.5px solid #022448' : '1.5px solid transparent',
      marginBottom: '4px',
    }),
    roleSelect: {
      width: '100%', padding: '8px 12px', border: '1.5px solid #e5e7eb',
      borderRadius: '8px', fontSize: '13px', fontFamily: 'Manrope, sans-serif',
      marginTop: '8px', marginBottom: '10px', outline: 'none',
    },
    confirmBtn: {
      width: '100%', padding: '10px', background: '#022448', color: '#ffe088',
      border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: 700,
      cursor: 'pointer', fontFamily: 'Manrope, sans-serif',
    },
    urlBox: {
      fontSize: '11px', color: '#475569', background: '#f1f5f9',
      padding: '6px 10px', borderRadius: '6px', marginTop: '4px',
      wordBreak: 'break-all' as const, fontFamily: 'monospace',
    },
    empty: { fontSize: '13px', color: '#94a3b8', padding: '8px 0' },
  };

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <div style={s.title}>
          <Users size={14} color="#022448" />
          Assigned Clients ({assigned.length})
        </div>
        <button style={s.assignBtn} onClick={() => setShowPicker(p => !p)}>
          <Plus size={12} /> Assign Client
        </button>
      </div>

      {/* Assigned clients list */}
      {loading ? (
        <div style={s.empty}>Loading...</div>
      ) : assigned.length === 0 ? (
        <div style={s.empty}>No clients assigned to this case yet.</div>
      ) : (
        assigned.map(a => (
          <div key={a.client_id} style={s.clientRow}>
            <div style={s.avatar}>{a.client.full_name.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.name}>{a.client.full_name}</div>
              <div style={s.meta}>{a.client.phone}{a.client.email ? ` · ${a.client.email}` : ''}</div>
              {inviteUrl[a.client_id] && (
                <div style={s.urlBox}>{inviteUrl[a.client_id]}</div>
              )}
            </div>
            <span style={s.rolePill}>{a.role}</span>

            {/* Invite/Copy portal link */}
            {inviteUrl[a.client_id] ? (
              <button style={s.copyBtn} onClick={() => copyLink(a.client_id)}>
                {copied === a.client_id ? <><Check size={11} /> Copied!</> : 'Copy link'}
              </button>
            ) : (
              <button
                style={{ ...s.inviteBtn, opacity: inviting === a.client_id ? 0.7 : 1 }}
                disabled={inviting === a.client_id || !a.client.email}
                onClick={() => handleInvite(a.client)}
                title={!a.client.email ? 'Add email to client first' : 'Invite to portal'}
              >
                <ExternalLink size={11} />
                {inviting === a.client_id ? '...' : 'Portal invite'}
              </button>
            )}

            <button style={s.removeBtn} onClick={() => handleRemove(a.client_id)} title="Remove from case">
              <X size={14} />
            </button>
          </div>
        ))
      )}

      {/* Client picker */}
      {showPicker && (
        <div style={s.picker}>
          <input
            style={s.searchInput}
            placeholder="Search clients by name or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />

          <div style={{ maxHeight: '180px', overflowY: 'auto' as const }}>
            {filteredAvailable.length === 0 ? (
              <div style={s.empty}>No clients found. Add clients in the Clients section first.</div>
            ) : filteredAvailable.map(c => (
              <div
                key={c.id}
                style={s.clientOption(selectedClient === c.id)}
                onClick={() => setSelectedClient(c.id)}
              >
                <div style={{ ...s.avatar, width: '28px', height: '28px', fontSize: '11px' }}>
                  {c.full_name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#022448' }}>{c.full_name}</div>
                  <div style={{ fontSize: '11px', color: '#74777f' }}>{c.phone}</div>
                </div>
                {selectedClient === c.id && <Check size={14} color="#022448" style={{ marginLeft: 'auto' }} />}
              </div>
            ))}
          </div>

          {selectedClient && (
            <>
              <select style={s.roleSelect} value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                {CLIENT_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
              <button
                style={{ ...s.confirmBtn, opacity: assigning ? 0.7 : 1 }}
                disabled={assigning}
                onClick={handleAssign}
              >
                {assigning ? 'Assigning...' : `Assign ${available.find(c => c.id === selectedClient)?.full_name} to Case`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
