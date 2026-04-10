'use client';

import { useState } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { User, Building2, Bell, Shield, CreditCard, LogOut, ChevronRight } from 'lucide-react';

const s = { padding: '32px 28px', fontFamily: 'Manrope, sans-serif', maxWidth: '720px' };

const card: React.CSSProperties = {
  background: '#fff', borderRadius: '12px',
  border: '1px solid rgba(196,198,207,0.2)',
  boxShadow: '0 1px 4px rgba(2,36,72,0.04)',
  overflow: 'hidden', marginBottom: '12px',
  maxWidth: '620px',
};

const row: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 20px', borderBottom: '1px solid rgba(196,198,207,0.08)',
  cursor: 'pointer',
};

const lbl: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#191c1e', margin: 0 };
const sub: React.CSSProperties = { fontSize: '12px', color: '#74777f', margin: '2px 0 0' };

export default function SettingsPage() {
  const { user, clearUser } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState({ email: true, whatsapp: true, sms: false });

  const handleLogout = () => {
    clearUser();
    if (typeof window !== 'undefined') localStorage.removeItem('lexai-auth');
    router.push('/login');
  };

  return (
    <div style={s}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2rem', fontWeight: 700, color: '#022448', margin: '0 0 4px' }}>Settings</h1>
        <p style={{ fontSize: '14px', color: '#74777f', margin: 0 }}>Manage your account and firm preferences</p>
      </div>

      {/* Profile */}
      <div style={{ ...card }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(196,198,207,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={14} color="#022448" />
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#022448', letterSpacing: '0.06em', margin: 0 }}>YOUR PROFILE</p>
        </div>
        <div style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800, color: '#022448', flexShrink: 0 }}>
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#022448', margin: '0 0 2px' }}>{user?.full_name || 'Advocate'}</p>
              <p style={{ fontSize: '13px', color: '#74777f', margin: '0 0 2px' }}>{user?.email}</p>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px', background: '#d5e3ff', color: '#022448', textTransform: 'capitalize' }}>
                {user?.role?.replace(/_/g, ' ')}
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { label: 'Full Name', value: user?.full_name || '—' },
              { label: 'Email', value: user?.email || '—' },
              { label: 'Role', value: user?.role?.replace(/_/g, ' ') || '—' },
              { label: 'Plan', value: user?.tenant_plan || 'Starter' },
            ].map(item => (
              <div key={item.label} style={{ background: '#f8f9fb', borderRadius: '10px', padding: '12px 14px' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px' }}>{item.label}</p>
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#022448', margin: 0, textTransform: 'capitalize' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Firm */}
      <div style={card}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(196,198,207,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={14} color="#022448" />
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#022448', letterSpacing: '0.06em', margin: 0 }}>FIRM</p>
        </div>
        {[
          { label: 'Firm Name', value: user?.tenant_name || 'Your Law Firm', sub: 'Name on invoices and client documents' },
          { label: 'Plan', value: (user?.tenant_plan || 'Starter') + ' Plan', sub: 'Upgrade for more agent runs and storage' },
        ].map((item, i) => (
          <div key={item.label} style={{ ...row, borderBottom: i === 0 ? '1px solid rgba(196,198,207,0.08)' : 'none' }}>
            <div>
              <p style={lbl}>{item.label}</p>
              <p style={sub}>{item.sub}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#74777f' }}>{item.value}</span>
              <ChevronRight size={15} color="#c4c6cf" />
            </div>
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div style={card}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(196,198,207,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={14} color="#022448" />
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#022448', letterSpacing: '0.06em', margin: 0 }}>NOTIFICATIONS</p>
        </div>
        {[
          { key: 'email', label: 'Email Reminders', sub: 'Hearing reminders D-30, D-7, D-1' },
          { key: 'whatsapp', label: 'WhatsApp Alerts', sub: 'Client notifications via WhatsApp' },
          { key: 'sms', label: 'SMS Fallback', sub: 'SMS when WhatsApp delivery fails' },
        ].map((item, i) => (
          <div key={item.key} style={{ ...row, borderBottom: i < 2 ? '1px solid rgba(196,198,207,0.08)' : 'none' }}>
            <div>
              <p style={lbl}>{item.label}</p>
              <p style={sub}>{item.sub}</p>
            </div>
            <button
              onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key as keyof typeof n] }))}
              style={{ width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'background 0.2s', background: notifications[item.key as keyof typeof notifications] ? '#022448' : '#e2e2e2', position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', transition: 'left 0.2s', left: notifications[item.key as keyof typeof notifications] ? '23px' : '3px' }} />
            </button>
          </div>
        ))}
      </div>

      {/* Security */}
      <div style={card}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(196,198,207,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Shield size={14} color="#022448" />
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#022448', letterSpacing: '0.06em', margin: 0 }}>SECURITY & COMPLIANCE</p>
        </div>
        {[
          { label: 'Data Storage', value: 'AWS Mumbai (ap-south-1)', sub: 'All data stored in India' },
          { label: 'Compliance', value: 'DPDP Act 2023, Bar Council Rules', sub: 'Advocates Act 1961 compliant' },
          { label: 'Session', value: 'Active — expires in 30 days', sub: 'Secure JWT authentication' },
        ].map((item, i) => (
          <div key={item.label} style={{ ...row, borderBottom: i < 2 ? '1px solid rgba(196,198,207,0.08)' : 'none', cursor: 'default' }}>
            <div>
              <p style={lbl}>{item.label}</p>
              <p style={sub}>{item.sub}</p>
            </div>
            <span style={{ fontSize: '11px', color: '#74777f', textAlign: 'right', maxWidth: '180px' }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Billing */}
      <div style={card}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(196,198,207,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CreditCard size={14} color="#022448" />
          <p style={{ fontSize: '11px', fontWeight: 800, color: '#022448', letterSpacing: '0.06em', margin: 0 }}>SUBSCRIPTION</p>
        </div>
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '18px', fontWeight: 800, color: '#022448', margin: '0 0 4px', textTransform: 'capitalize' }}>
              {user?.tenant_plan || 'Starter'} Plan
            </p>
            <p style={{ fontSize: '13px', color: '#74777f', margin: 0 }}>AI agents, document OCR, eCourts sync</p>
          </div>
          <button style={{ padding: '10px 20px', background: '#022448', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            Upgrade Plan
          </button>
        </div>
      </div>

      {/* Sign out */}
      <button onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '11px 20px', background: '#ffdad6', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#93000a', fontSize: '14px', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>
        <LogOut size={16} />
        Sign out of Sovereign Counsel
      </button>
    </div>
  );
}
