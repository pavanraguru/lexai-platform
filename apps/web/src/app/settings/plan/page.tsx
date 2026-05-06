'use client';
// apps/web/src/app/settings/plan/page.tsx

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { Check, Zap, Building2, Mail } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '₹2,999',
    period: '/month',
    desc: 'For solo advocates just getting started',
    color: '#022448',
    features: [
      '1 user',
      'Up to 25 active cases',
      '5 GB document storage',
      '50 AI agent runs/month',
      'Basic audit log (30 days)',
      'Client portal (5 clients)',
      'Email support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '₹7,999',
    period: '/month',
    desc: 'For growing law firms with a team',
    color: '#7c3aed',
    popular: true,
    features: [
      'Up to 10 users',
      'Unlimited active cases',
      '50 GB document storage',
      '500 AI agent runs/month',
      'Full audit log (1 year)',
      'Unlimited client portal',
      'Custom permission roles',
      'Priority email & chat support',
      'Bulk document upload',
      'Hearing reminders (WhatsApp + email)',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For large firms and legal departments',
    color: '#022448',
    features: [
      'Unlimited users',
      'Unlimited storage',
      'Unlimited AI agent runs',
      'Full audit log (unlimited)',
      'IP allowlisting',
      'SSO / SAML integration',
      'Custom onboarding',
      'Dedicated account manager',
      'SLA guarantee',
      'Custom integrations',
    ],
  },
];

export default function PlanPage() {
  const { token, user } = useAuthStore();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEnterprise, setShowEnterprise] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: user?.email || '', firm: '', team_size: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/v1/billing/subscription`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setSubscription(d.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const currentPlan = subscription?.plan || 'starter';

  async function handleUpgrade(planId: string) {
    if (planId === 'enterprise') { setShowEnterprise(true); return; }
    // Redirect to Razorpay / billing portal
    window.open(`mailto:sales@sovereigncounsel.in?subject=Upgrade to ${planId} plan`, '_blank');
  }

  async function handleContactSubmit() {
    setSending(true);
    // In production, call an API endpoint to send the contact form
    await new Promise(r => setTimeout(r, 1200));
    setSent(true);
    setSending(false);
  }

  const s: Record<string, React.CSSProperties> = {
    page: { padding: 'clamp(20px,4vw,40px)', fontFamily: 'Manrope, sans-serif', maxWidth: '960px' },
    heading: { fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', marginBottom: '4px' },
    sub: { fontSize: '14px', color: '#64748b', marginBottom: '28px' },
    currentBadge: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#dcfce7', color: '#15803d', fontSize: '13px', fontWeight: 700, padding: '6px 14px', borderRadius: '20px', marginBottom: '28px' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '32px' },
    planCard: (isCurrent: boolean, isPopular: boolean): React.CSSProperties => ({
      background: '#fff', borderRadius: '16px',
      border: `2px solid ${isCurrent ? '#022448' : isPopular ? '#7c3aed' : 'rgba(196,198,207,0.2)'}`,
      padding: '24px', position: 'relative' as const,
      boxShadow: isCurrent ? '0 4px 20px rgba(2,36,72,0.12)' : '0 1px 4px rgba(2,36,72,0.04)',
    }),
    popularBadge: { position: 'absolute' as const, top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#7c3aed', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap' as const },
    currentLabel: { position: 'absolute' as const, top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#022448', color: '#ffe088', fontSize: '11px', fontWeight: 700, padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap' as const },
    planName: { fontFamily: 'Newsreader, serif', fontSize: '20px', fontWeight: 700, color: '#022448', marginBottom: '4px' },
    planDesc: { fontSize: '13px', color: '#64748b', marginBottom: '16px' },
    price: { fontFamily: 'Newsreader, serif', fontSize: '32px', fontWeight: 700, color: '#022448' },
    period: { fontSize: '14px', color: '#64748b', marginLeft: '2px' },
    divider: { height: '1px', background: '#f1f5f9', margin: '16px 0' },
    featureList: { listStyle: 'none', padding: 0, margin: '0 0 20px' },
    featureItem: { display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', fontSize: '13px', color: '#374151' },
    upgradeBtn: (isCurrent: boolean, color: string): React.CSSProperties => ({
      width: '100%', padding: '11px', background: isCurrent ? '#f1f5f9' : color,
      color: isCurrent ? '#94a3b8' : color === '#022448' ? '#ffe088' : '#fff',
      border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
      cursor: isCurrent ? 'not-allowed' : 'pointer', fontFamily: 'Manrope, sans-serif',
    }),
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(2,36,72,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' },
    modalBox: { background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(2,36,72,0.2)', maxHeight: '90vh', overflowY: 'auto' as const },
    modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #f1f5f9' },
    modalTitle: { fontFamily: 'Newsreader, serif', fontSize: '18px', fontWeight: 700, color: '#022448' },
    modalBody: { padding: '20px 24px' },
    label: { display: 'block', fontSize: '11px', fontWeight: 700, color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: '6px' },
    input: { width: '100%', padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', fontFamily: 'Manrope, sans-serif', color: '#111827', boxSizing: 'border-box' as const, outline: 'none', marginBottom: '14px' },
    submitBtn: { width: '100%', padding: '12px', background: '#022448', color: '#ffe088', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' },
  };

  return (
    <div style={s.page}>
      <div style={s.heading}>Plan & Billing</div>
      <div style={s.sub}>Choose the right plan for your firm. Upgrade or downgrade at any time.</div>

      {!loading && (
        <div style={s.currentBadge}>
          <Zap size={14} />
          Current plan: {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}
          {subscription?.status === 'trialing' && ' (Trial)'}
        </div>
      )}

      <div style={s.grid}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div key={plan.id} style={s.planCard(isCurrent, !!plan.popular)}>
              {isCurrent && <div style={s.currentLabel}>Current Plan</div>}
              {plan.popular && !isCurrent && <div style={s.popularBadge}>Most Popular</div>}

              <div style={s.planName}>{plan.name}</div>
              <div style={s.planDesc}>{plan.desc}</div>
              <div>
                <span style={s.price}>{plan.price}</span>
                <span style={s.period}>{plan.period}</span>
              </div>

              <div style={s.divider} />

              <ul style={s.featureList}>
                {plan.features.map(f => (
                  <li key={f} style={s.featureItem}>
                    <Check size={14} color="#15803d" style={{ marginTop: '1px', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                style={s.upgradeBtn(isCurrent, plan.color)}
                disabled={isCurrent}
                onClick={() => handleUpgrade(plan.id)}
              >
                {isCurrent ? 'Current Plan' : plan.id === 'enterprise' ? 'Contact Sales' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Enterprise contact modal */}
      {showEnterprise && (
        <div style={s.modal} onClick={e => e.target === e.currentTarget && setShowEnterprise(false)}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <div style={s.modalTitle}>Contact Enterprise Sales</div>
              <button onClick={() => setShowEnterprise(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#74777f', fontSize: '20px' }}>✕</button>
            </div>
            <div style={s.modalBody}>
              {sent ? (
                <div style={{ textAlign: 'center' as const, padding: '20px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                  <div style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '18px', color: '#022448', marginBottom: '8px' }}>Request sent!</div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Our team will reach out within 24 hours.</div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px' }}>
                    Tell us about your firm and we'll get back to you with a custom quote within 24 hours.
                  </p>
                  <label style={s.label}>Your Name</label>
                  <input style={s.input} value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} placeholder="Advocate name" />
                  <label style={s.label}>Email</label>
                  <input style={s.input} type="email" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} placeholder="your@firm.com" />
                  <label style={s.label}>Firm Name</label>
                  <input style={s.input} value={contactForm.firm} onChange={e => setContactForm(p => ({ ...p, firm: e.target.value }))} placeholder="Your law firm" />
                  <label style={s.label}>Team Size</label>
                  <input style={s.input} value={contactForm.team_size} onChange={e => setContactForm(p => ({ ...p, team_size: e.target.value }))} placeholder="e.g. 15-20 advocates" />
                  <label style={s.label}>What do you need?</label>
                  <textarea
                    style={{ ...s.input, resize: 'none' as const, height: '80px' }}
                    value={contactForm.message}
                    onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us about your requirements..."
                  />
                  <button style={{ ...s.submitBtn, opacity: sending ? 0.7 : 1 }} disabled={sending} onClick={handleContactSubmit}>
                    {sending ? 'Sending...' : 'Send Request'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
