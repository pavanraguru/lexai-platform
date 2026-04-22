'use client';

import { useState } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { X, Zap, Shield, Bot, FileText, Check, Loader2 } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PRO_FEATURES = [
  { icon: Bot, text: 'AI Agents — Evidence, Timeline, Research, Strategy, Deposition' },
  { icon: FileText, text: 'AI Drafts — generate bail applications, plaints, writ petitions' },
  { icon: Shield, text: 'Everything in Free Trial, forever' },
];

declare global {
  interface Window { Razorpay: any; }
}

export default function UpgradeModal({ onClose, reason }: { onClose: () => void; reason?: string }) {
  const { token, user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true); setError('');
    try {
      // 1. Create Razorpay order
      const orderRes = await fetch(`${BASE}/v1/billing/razorpay/order`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error?.message || 'Failed to create order');

      const { order_id, amount, currency, key_id } = orderData.data;

      // 2. Load Razorpay script if needed
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load Razorpay'));
          document.head.appendChild(script);
        });
      }

      // 3. Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: key_id,
          amount,
          currency,
          order_id,
          name: 'Sovereign Counsel',
          description: 'LexAI Pro — Monthly Subscription',
          image: '',
          prefill: {
            name: user?.full_name || '',
            email: user?.email || '',
          },
          theme: { color: '#022448' },
          modal: { ondismiss: () => { setLoading(false); reject(new Error('Payment cancelled')); } },
          handler: async (response: any) => {
            try {
              // 4. Verify payment
              const verifyRes = await fetch(`${BASE}/v1/billing/razorpay/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error?.message || 'Payment verification failed');

              // 5. Update local auth state
              if (user) {
                setUser({ ...user, is_pro: true, subscription_status: 'active', trial_days_left: 0 }, token!);
              }
              setSuccess(true);
              resolve();
            } catch (err: any) {
              reject(err);
            }
          },
        });
        rzp.open();
      });
    } catch (err: any) {
      if (err.message !== 'Payment cancelled') {
        setError(err.message || 'Payment failed');
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,36,72,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(2,36,72,0.2)', overflow: 'hidden' }}>

        {/* Gold header */}
        <div style={{ background: 'linear-gradient(135deg, #022448 0%, #1a4b7a 100%)', padding: '28px 28px 24px', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,224,136,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={18} color="#ffe088" />
            </div>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffe088', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Upgrade to Pro</span>
          </div>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '1.6rem', fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>Unlock AI-Powered Features</h2>
          {reason && <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', margin: 0 }}>{reason}</p>}
        </div>

        <div style={{ padding: '24px 28px' }}>
          {success ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Check size={28} color="#15803d" />
              </div>
              <h3 style={{ fontFamily: 'Newsreader, serif', fontSize: '1.3rem', fontWeight: 700, color: '#022448', margin: '0 0 8px' }}>You're now Pro! 🎉</h3>
              <p style={{ fontSize: '14px', color: '#74777f', margin: '0 0 20px' }}>All AI features are now unlocked. Welcome to Sovereign Counsel Pro.</p>
              <button onClick={onClose} style={{ padding: '12px 28px', background: '#022448', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                Start using AI Agents →
              </button>
            </div>
          ) : (
            <>
              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '22px' }}>
                {PRO_FEATURES.map(({ icon: Icon, text }, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={15} color="#022448" />
                    </div>
                    <span style={{ fontSize: '13px', color: '#43474e', lineHeight: 1.6, paddingTop: '6px' }}>{text}</span>
                  </div>
                ))}
              </div>

              {/* Price */}
              <div style={{ background: '#f8f9fb', borderRadius: '12px', padding: '16px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 700, color: '#74777f', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pro Monthly</p>
                  <p style={{ fontSize: '13px', color: '#43474e', margin: 0 }}>All features · Cancel anytime</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: 'Newsreader, serif', fontSize: '1.6rem', fontWeight: 800, color: '#022448', margin: 0, lineHeight: 1 }}>₹2,999</p>
                  <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>per month + GST</p>
                </div>
              </div>

              {error && <p style={{ fontSize: '12px', color: '#ba1a1a', margin: '0 0 12px' }}>{error}</p>}

              <button onClick={handleUpgrade} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '14px', background: '#022448', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Manrope, sans-serif', opacity: loading ? 0.7 : 1 }}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={16} />}
                {loading ? 'Processing...' : 'Pay ₹2,999 & Upgrade →'}
              </button>

              <p style={{ fontSize: '11px', color: '#74777f', textAlign: 'center', marginTop: '12px', lineHeight: 1.6 }}>
                Secured by Razorpay · UPI, Cards, Net Banking accepted<br />
                GST invoice provided · Cancel before next billing date
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
