'use client';
// apps/web/src/app/portal/settings/page.tsx

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, LogOut } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PortalSettingsPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('portal_token');
    const n = localStorage.getItem('portal_name');
    if (!t) { router.push('/portal/login'); return; }
    setToken(t);
    setName(n || '');
    setNewName(n || '');

    fetch(`${BASE}/v1/portal/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(d => { if (d.user?.email) setEmail(d.user.email); })
      .catch(() => {});
  }, []);

  async function handleNameSave() {
    if (!newName.trim()) return;
    setNameSaving(true); setNameMsg('');
    try {
      // Update local storage — full name update endpoint not required for MVP
      localStorage.setItem('portal_name', newName.trim());
      setName(newName.trim());
      setNameMsg('Name updated successfully.');
    } catch { setNameMsg('Failed to update name.'); }
    setNameSaving(false);
    setTimeout(() => setNameMsg(''), 3000);
  }

  async function handlePasswordChange() {
    if (!oldPassword || !newPassword) return setPwError('All fields required');
    if (newPassword.length < 8) return setPwError('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) return setPwError('Passwords do not match');
    setPwSaving(true); setPwError(''); setPwMsg('');
    try {
      const res = await fetch(`${BASE}/v1/portal/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setPwMsg('Password changed successfully.');
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e: any) { setPwError(e.message); }
    setPwSaving(false);
    setTimeout(() => setPwMsg(''), 3000);
  }

  function handleLogout() {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_name');
    router.push('/portal/login');
  }

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '600px' },
    heading: { fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '8px' },
    sub: { fontSize: '14px', color: '#64748b', marginBottom: '28px' },
    card: { background: '#fff', borderRadius: '14px', border: '1px solid rgba(196,198,207,0.2)', marginBottom: '16px', overflow: 'hidden' },
    cardHeader: { display: 'flex', alignItems: 'center', gap: '8px', padding: '14px 20px', borderBottom: '1px solid #f1f5f9' },
    cardTitle: { fontSize: '13px', fontWeight: 700, color: '#022448' },
    cardBody: { padding: '20px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' },
    input: { width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', color: '#111827', fontFamily: 'Manrope, sans-serif', marginBottom: '14px', boxSizing: 'border-box' as const, outline: 'none' },
    btn: { padding: '11px 22px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
    success: { fontSize: '13px', color: '#15803d', background: '#dcfce7', padding: '8px 12px', borderRadius: '8px', marginTop: '8px' },
    error: { fontSize: '13px', color: '#ba1a1a', background: '#ffdad6', padding: '8px 12px', borderRadius: '8px', marginBottom: '12px' },
    logoutBtn: { display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', color: '#ba1a1a', fontSize: '14px', fontWeight: 600, fontFamily: 'Manrope, sans-serif', width: '100%' },
  };

  return (
    <div style={s.page}>
      <div style={s.heading}>Settings</div>
      <div style={s.sub}>Manage your portal account</div>

      {/* Profile */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <User size={14} color="#022448" />
          <span style={s.cardTitle}>YOUR PROFILE</span>
        </div>
        <div style={s.cardBody}>
          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
            Email: <strong style={{ color: '#022448' }}>{email || '—'}</strong>
          </div>
          <label style={s.label}>Display Name</label>
          <input style={s.input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Your name" />
          <button style={s.btn} onClick={handleNameSave} disabled={nameSaving}>
            {nameSaving ? 'Saving...' : 'Save Name'}
          </button>
          {nameMsg && <div style={s.success}>{nameMsg}</div>}
        </div>
      </div>

      {/* Password */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <Lock size={14} color="#022448" />
          <span style={s.cardTitle}>CHANGE PASSWORD</span>
        </div>
        <div style={s.cardBody}>
          {pwError && <div style={s.error}>{pwError}</div>}
          <label style={s.label}>Current Password</label>
          <input style={s.input} type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="Current password" />
          <label style={s.label}>New Password</label>
          <input style={s.input} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 characters" />
          <label style={s.label}>Confirm New Password</label>
          <input style={{ ...s.input, marginBottom: '14px' }} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
          <button style={s.btn} onClick={handlePasswordChange} disabled={pwSaving}>
            {pwSaving ? 'Changing...' : 'Change Password'}
          </button>
          {pwMsg && <div style={s.success}>{pwMsg}</div>}
        </div>
      </div>

      {/* Sign out */}
      <div style={s.card}>
        <button style={s.logoutBtn} onClick={handleLogout}>
          <LogOut size={16} /> Sign out of portal
        </button>
      </div>
    </div>
  );
}
