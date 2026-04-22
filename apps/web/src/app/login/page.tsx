'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/hooks/useAuth';
import { Scale, Phone, Mail, ArrowRight, Loader2, FileText, Calendar, Bot, Receipt, Check } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
type Step = 'method' | 'email' | 'otp-phone' | 'otp-verify';

const FEATURES = [
  { Icon: FileText,  text: 'Evidence extraction from FIRs, chargesheets and depositions' },
  { Icon: Calendar,  text: 'eCourts sync — hearing dates updated automatically' },
  { Icon: Phone,     text: 'Client reminders via WhatsApp, 7 and 2 days before hearings' },
  { Icon: Bot,       text: 'Opening statements and bench Q&A generated in seconds' },
  { Icon: Receipt,   text: 'Professional invoices with GST, UPI QR code, payment tracking' },
];

const inp: React.CSSProperties = {
  width: '100%', padding: '12px 14px', border: '1px solid rgba(196,198,207,0.5)',
  borderRadius: '10px', fontSize: '15px', color: '#191c1e', background: '#fff',
  outline: 'none', fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700, color: '#43474e',
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px',
};

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const supabase = getSupabase();

  const [step, setStep] = useState<Step>('method');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finishAuth = async (supabaseToken: string) => {
    const res = await fetch(`${BASE}/v1/auth/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supabase_token: supabaseToken }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to authenticate. Check your account is registered.');
    }
    const data = await res.json();
    const { token, user } = data.data;
    setUser({ id: user.id, email: user.email, full_name: user.full_name, role: user.role, tenant_id: user.tenant_id, tenant_name: user.tenant?.name || '', tenant_plan: user.tenant?.plan || 'starter' }, token);
    router.push('/dashboard');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session?.access_token) await finishAuth(data.session.access_token);
    } catch (err: any) { setError(err.message || 'Login failed'); }
    setLoading(false);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (error) throw error;
      setStep('otp-verify');
    } catch (err: any) { setError(err.message || 'Failed to send OTP'); }
    setLoading(false);
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const formatted = phone.startsWith('+') ? phone : `+91${phone.replace(/\D/g, '')}`;
      const { data, error } = await supabase.auth.verifyOtp({ phone: formatted, token: otp, type: 'sms' });
      if (error) throw error;
      if (data.session?.access_token) await finishAuth(data.session.access_token);
    } catch (err: any) { setError(err.message || 'Invalid OTP'); }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
    } catch (err: any) { setError(err.message); setLoading(false); }
  };

  const btnPrimary: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
    padding: '14px', background: '#022448', border: 'none', borderRadius: '10px',
    fontSize: '15px', fontWeight: 700, color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
    fontFamily: 'Manrope, sans-serif', width: '100%', opacity: loading ? 0.7 : 1,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100dvh', fontFamily: 'Manrope, sans-serif', background: '#f8f9fb' }}>

      {/* Left — Brand panel */}
      <div style={{ width: '50%', background: 'linear-gradient(160deg, #022448 0%, #1a4b7a 100%)', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', position: 'relative', overflow: 'hidden' }} className="hidden md:flex">
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '56px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Scale size={24} color="#ffe088" />
            </div>
            <span style={{ fontFamily: 'Newsreader, serif', fontSize: '20px', fontWeight: 700, color: '#fff' }}>Sovereign Counsel</span>
          </div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '2.6rem', fontWeight: 700, color: '#fff', lineHeight: 1.15, margin: '0 0 20px' }}>
            The AI operating system for Indian advocates.
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.65)', margin: '0 0 48px', lineHeight: 1.7 }}>
            From FIR to final arguments — manage your entire practice with AI-powered precision.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {FEATURES.map(({ Icon, text }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="#ffe088" />
                </div>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>{text}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px', letterSpacing: '0.06em' }}>COMPLIANT WITH</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {['Advocates Act 1961', 'Bar Council Rules', 'DPDP Act 2023', 'AWS Mumbai (ap-south-1)'].map(b => (
                <span key={b} style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)' }}>{b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right — Auth form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }} className="md:hidden">
            <Scale size={20} color="#022448" />
            <span style={{ fontFamily: 'Newsreader, serif', fontSize: '17px', fontWeight: 700, color: '#022448' }}>Sovereign Counsel</span>
          </div>

          <h2 style={{ fontFamily: 'Newsreader, serif', fontSize: '1.7rem', fontWeight: 700, color: '#022448', margin: '0 0 6px' }}>
            {step === 'method' ? 'Sign in to LexAI' : step === 'email' ? 'Sign in with email' : step === 'otp-phone' ? 'Sign in with mobile' : 'Enter verification code'}
          </h2>
          <p style={{ fontSize: '14px', color: '#74777f', margin: '0 0 28px' }}>
            {step === 'method' ? 'Welcome back. Access your legal workspace.' :
             step === 'email' ? 'Enter your registered email and password.' :
             step === 'otp-phone' ? "We'll send a 6-digit code to your number." :
             `Code sent to +91 ${phone}. Check your SMS.`}
          </p>

          {error && (
            <div style={{ padding: '12px 14px', background: '#ffdad6', borderRadius: '10px', marginBottom: '20px', fontSize: '13px', color: '#93000a', fontWeight: 500 }}>
              {error}
            </div>
          )}

          {step === 'method' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { icon: <Phone size={18} color="#022448" />, title: 'Mobile OTP', desc: 'Sign in with your +91 number', action: () => setStep('otp-phone') },
                { icon: <Mail size={18} color="#022448" />, title: 'Email & Password', desc: 'Sign in with your email address', action: () => setStep('email') },
              ].map(item => (
                <button key={item.title} onClick={item.action} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', background: '#fff', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '12px', cursor: 'pointer', width: '100%', fontFamily: 'Manrope, sans-serif' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#d5e3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</div>
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '14px', fontWeight: 700, color: '#022448', margin: 0 }}>{item.title}</p>
                      <p style={{ fontSize: '12px', color: '#74777f', margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                  <ArrowRight size={16} color="#74777f" />
                </button>
              ))}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(196,198,207,0.4)' }} />
                <span style={{ fontSize: '12px', color: '#74777f' }}>or</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(196,198,207,0.4)' }} />
              </div>

              <button onClick={handleGoogle} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '13px 18px', background: '#fff', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '12px', cursor: 'pointer', width: '100%', fontSize: '14px', fontWeight: 700, color: '#022448', fontFamily: 'Manrope, sans-serif' }}>
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
                Continue with Google
              </button>
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleEmailLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div><label style={lbl}>Email Address</label><input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="advocate@example.com" style={inp} /></div>
              <div><label style={lbl}>Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inp} /></div>
              <button type="submit" disabled={loading} style={{ ...btnPrimary, marginTop: '4px' }}>
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
              <button type="button" onClick={() => { setStep('method'); setError(''); }} style={{ background: 'none', border: 'none', color: '#74777f', fontSize: '13px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', textDecoration: 'underline' }}>← Back</button>
            </form>
          )}

          {step === 'otp-phone' && (
            <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>Mobile Number</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ ...inp, width: 'auto', padding: '12px 14px', background: '#edeef0', borderRadius: '10px', fontWeight: 700, color: '#022448', flexShrink: 0 }}>+91</div>
                  <input type="tel" required autoFocus value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="9876543210" style={{ ...inp, flex: 1 }} />
                </div>
              </div>
              <button type="submit" disabled={loading || phone.length < 10} style={{ ...btnPrimary, opacity: loading || phone.length < 10 ? 0.6 : 1 }}>
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {loading ? 'Sending...' : 'Send OTP →'}
              </button>
              <button type="button" onClick={() => { setStep('method'); setError(''); }} style={{ background: 'none', border: 'none', color: '#74777f', fontSize: '13px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', textDecoration: 'underline' }}>← Back</button>
            </form>
          )}

          {step === 'otp-verify' && (
            <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>6-Digit OTP</label>
                <input type="text" required autoFocus value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="••••••" style={{ ...inp, fontSize: '22px', letterSpacing: '0.3em', textAlign: 'center', fontWeight: 800 }} />
              </div>
              <button type="submit" disabled={loading || otp.length < 6} style={{ ...btnPrimary, opacity: loading || otp.length < 6 ? 0.6 : 1 }}>
                {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button type="button" onClick={() => { setStep('otp-phone'); setOtp(''); setError(''); }} style={{ background: 'none', border: 'none', color: '#74777f', fontSize: '13px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', textDecoration: 'underline' }}>← Resend OTP</button>
            </form>
          )}

          <p style={{ fontSize: '13px', color: '#74777f', textAlign: 'center', marginTop: '20px' }}>
            New to Sovereign Counsel?{' '}
            <a href="/signup" style={{ color: '#022448', fontWeight: 700, textDecoration: 'none' }}>Start free trial →</a>
          </p>
          <p style={{ fontSize: '11px', color: '#74777f', textAlign: 'center', marginTop: '10px', lineHeight: 1.7 }}>
            By signing in you agree to our Terms of Service and Privacy Policy.<br />
            Protected under DPDP Act 2023 · Bar Council of India Rules.
          </p>
        </div>
      </div>
    </div>
  );
}
