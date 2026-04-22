'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/hooks/useAuth';
import { Scale, Phone, Mail, ArrowRight, Loader2, Check, Building2, MapPin, User, Eye, EyeOff } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
type Step = 'form' | 'otp-verify';

const inp: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1px solid rgba(196,198,207,0.5)',
  borderRadius: '10px', fontSize: '15px', color: '#191c1e', background: '#fff',
  outline: 'none', fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: '#43474e',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px',
};

const TRIAL_FEATURES = [
  { text: 'Unlimited cases & documents', pro: false },
  { text: 'Court calendar — all 25 High Courts', pro: false },
  { text: 'Client management & billing', pro: false },
  { text: 'Filing repository — 26 standard filings', pro: false },
  { text: 'Hearings, tasks & notifications', pro: false },
  { text: 'AI Agents & AI Drafts', pro: true },
];

export default function SignupPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const supabase = getSupabase();

  const [step, setStep] = useState<Step>('form');
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firmName, setFirmName] = useState('');
  const [location, setLocation] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  const finishAuth = async (supabaseToken: string, userId: string) => {
    await fetch(`${BASE}/v1/billing/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabase_user_id: userId,
        full_name: fullName,
        email: email || undefined,
        phone: phone ? `+91${phone}` : undefined,
        firm_name: firmName,
        location,
      }),
    }).catch(() => {});

    const tokenRes = await fetch(`${BASE}/v1/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_token: supabaseToken }),
    });
    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      throw new Error(err.error?.message || 'Failed to authenticate. Please try signing in.');
    }
    const data = await tokenRes.json();
    const { token, user } = data.data;
    setUser({
      id: user.id, email: user.email, full_name: user.full_name,
      role: user.role, tenant_id: user.tenant_id,
      tenant_name: user.tenant_name || '',
      tenant_plan: user.tenant_plan || 'starter',
      is_pro: user.is_pro || false,
      trial_days_left: user.trial_days_left ?? 5,
      trial_ends_at: user.trial_ends_at || null,
      subscription_status: user.subscription_status || 'trialing',
    }, token);
    router.push('/dashboard');
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } },
      });
      if (authError) throw authError;
      if (data.session?.access_token && data.user) {
        await finishAuth(data.session.access_token, data.user.id);
      } else {
        setError('Check your email to confirm your account, then sign in.');
      }
    } catch (err: any) { setError(err.message || 'Signup failed'); }
    setLoading(false);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { setError('Please enter your full name'); return; }
    setLoading(true); setError('');
    try {
      const { error: authError } = await supabase.auth.signInWithOtp({ phone: `+91${phone}` });
      if (authError) throw authError;
      setStep('otp-verify');
    } catch (err: any) { setError(err.message || 'Failed to send OTP'); }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data, error: authError } = await supabase.auth.verifyOtp({ phone: `+91${phone}`, token: otp, type: 'sms' });
      if (authError) throw authError;
      if (data.session?.access_token && data.user) {
        await finishAuth(data.session.access_token, data.user.id);
      }
    } catch (err: any) { setError(err.message || 'Invalid OTP'); }
    setLoading(false);
  };

  const handleGoogle = async () => {
    if (!fullName.trim()) { setError('Please enter your name first'); return; }
    setLoading(true); setError('');
    try {
      sessionStorage.setItem('signup_data', JSON.stringify({ fullName, firmName, location }));
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback?signup=1` },
      });
    } catch (err: any) { setError(err.message); setLoading(false); }
  };

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '14px', background: '#022448', border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: 700, color: '#fff',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'Manrope, sans-serif', width: '100%', opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', fontFamily: 'Manrope, sans-serif', background: '#f8f9fb' }}>

      {/* Left panel */}
      <div style={{ width: '44%', background: 'linear-gradient(160deg, #022448 0%, #1a4b7a 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 52px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={24} color="#ffe088" />
            </div>
            <span style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', fontWeight: 700, color: '#fff' }}>Sovereign Counsel</span>
          </div>

          <div style={{ background: 'rgba(255,224,136,0.12)', border: '1px solid rgba(255,224,136,0.3)', borderRadius: '12px', padding: '18px 20px', marginBottom: '32px' }}>
            <p style={{ fontSize: '12px', fontWeight: 800, color: '#ffe088', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 6px' }}>5-Day Free Trial</p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.6 }}>Full access to your legal workspace. No credit card required to start.</p>
          </div>

          <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 14px' }}>What's included</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {TRIAL_FEATURES.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: f.pro ? 'rgba(255,224,136,0.15)' : 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {f.pro ? <span style={{ fontSize: '10px' }}>⚡</span> : <Check size={10} color="#ffe088" />}
                </div>
                <span style={{ fontSize: '13px', color: f.pro ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                  {f.text}
                  {f.pro && <span style={{ marginLeft: '6px', fontSize: '10px', fontWeight: 800, color: '#ffe088', padding: '1px 6px', borderRadius: '3px', border: '1px solid rgba(255,224,136,0.4)' }}>PRO</span>}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '32px', padding: '16px 18px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '14px', fontWeight: 800, color: '#fff', margin: '0 0 2px' }}>Pro Plan — ₹2,999/month</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: 0 }}>Unlocks AI Agents + AI Drafts. Cancel anytime.</p>
          </div>
        </div>
      </div>

      {/* Right — Form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '1.8rem', fontWeight: 700, color: '#022448', margin: '0 0 4px' }}>
            {step === 'otp-verify' ? 'Verify your number' : 'Start your free trial'}
          </h2>
          <p style={{ fontSize: '14px', color: '#74777f', margin: '0 0 24px' }}>
            {step === 'otp-verify' ? `Code sent to +91 ${phone}` : '5 days free. No credit card needed.'}
          </p>

          {error && (
            <div style={{ padding: '12px 14px', background: '#ffdad6', borderRadius: '10px', marginBottom: '16px', fontSize: '13px', color: '#93000a' }}>
              {error}
            </div>
          )}

          {step === 'otp-verify' ? (
            <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>6-Digit OTP</label>
                <input type="text" required autoFocus value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  style={{ ...inp, fontSize: '22px', letterSpacing: '0.3em', textAlign: 'center', fontWeight: 800 }} />
              </div>
              <button type="submit" disabled={loading || otp.length < 6} style={{ ...btnPrimary, opacity: loading || otp.length < 6 ? 0.6 : 1 }}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                {loading ? 'Verifying...' : 'Verify & Start Trial'}
              </button>
              <button type="button" onClick={() => { setStep('form'); setOtp(''); setError(''); }}
                style={{ background: 'none', border: 'none', color: '#74777f', fontSize: '13px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', textDecoration: 'underline' }}>
                ← Change number
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Common fields */}
              <div>
                <label style={lbl}><User size={10} style={{ display: 'inline', marginRight: '4px' }} />Full Name *</label>
                <input type="text" required value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Adv. Pavan Kumar" style={inp} autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lbl}><Building2 size={10} style={{ display: 'inline', marginRight: '4px' }} />Firm Name</label>
                  <input type="text" value={firmName} onChange={e => setFirmName(e.target.value)}
                    placeholder="Kumar & Associates" style={inp} />
                </div>
                <div>
                  <label style={lbl}><MapPin size={10} style={{ display: 'inline', marginRight: '4px' }} />Location</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="Hyderabad" style={inp} />
                </div>
              </div>

              {/* Auth method tabs */}
              <div style={{ display: 'flex', gap: '6px', padding: '4px 0' }}>
                {(['email', 'phone'] as const).map(m => (
                  <button key={m} onClick={() => { setAuthMethod(m); setError(''); }}
                    style={{ flex: 1, padding: '9px', background: authMethod === m ? '#022448' : '#fff', color: authMethod === m ? '#fff' : '#74777f', border: authMethod === m ? 'none' : '1px solid rgba(196,198,207,0.5)', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {m === 'email' ? <Mail size={13} /> : <Phone size={13} />}
                    {m === 'email' ? 'Email' : 'Mobile OTP'}
                  </button>
                ))}
              </div>

              {authMethod === 'email' ? (
                <form onSubmit={handleEmailSignup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Email Address *</label>
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="advocate@example.com" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input type={showPassword ? 'text' : 'password'} required value={password}
                        onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                        style={{ ...inp, paddingRight: '44px' }} />
                      <button type="button" onClick={() => setShowPassword(s => !s)}
                        style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#74777f', padding: '4px' }}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} style={btnPrimary}>
                    {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <ArrowRight size={16} />}
                    {loading ? 'Creating account...' : 'Start 5-Day Free Trial →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={lbl}>Mobile Number *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ ...inp, width: 'auto', padding: '12px 14px', background: '#edeef0', borderRadius: '10px', fontWeight: 700, color: '#022448', flexShrink: 0, boxSizing: 'border-box' }}>+91</div>
                      <input type="tel" required value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="9876543210" style={{ ...inp, flex: 1 }} />
                    </div>
                  </div>
                  <button type="submit" disabled={loading || phone.length < 10} style={{ ...btnPrimary, opacity: loading || phone.length < 10 ? 0.6 : 1 }}>
                    {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Phone size={16} />}
                    {loading ? 'Sending OTP...' : 'Send OTP →'}
                  </button>
                </form>
              )}

              {/* Google */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(196,198,207,0.4)' }} />
                <span style={{ fontSize: '12px', color: '#74777f' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(196,198,207,0.4)' }} />
              </div>
              <button onClick={handleGoogle} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px', background: '#fff', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '12px', cursor: 'pointer', width: '100%', fontSize: '14px', fontWeight: 700, color: '#022448', fontFamily: 'Manrope, sans-serif' }}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
                Continue with Google
              </button>

              <p style={{ fontSize: '13px', color: '#74777f', textAlign: 'center' }}>
                Already have an account?{' '}
                <Link href="/login" style={{ color: '#022448', fontWeight: 700, textDecoration: 'none' }}>Sign in →</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
