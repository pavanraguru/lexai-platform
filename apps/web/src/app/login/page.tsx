'use client';
export const dynamic = 'force-dynamic';
// ============================================================
// LexAI India — Login Page
// PRD v1.1 Section 6.1 — Authentication (OTP + Email)
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/hooks/useAuth';
import { Scale, Phone, Mail, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

type Step = 'method' | 'email' | 'otp-phone' | 'otp-verify';

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
  const [otpSent, setOtpSent] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        // TODO: fetch user profile from our API
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Format Indian phone number
      const formatted = phone.startsWith('+91') ? phone : `+91${phone.replace(/^0/, '')}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (error) throw error;
      setOtpSent(true);
      setStep('otp-verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const formatted = phone.startsWith('+91') ? phone : `+91${phone.replace(/^0/, '')}`;
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatted, token: otp, type: 'sms',
      });
      if (error) throw error;
      if (data.session) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F4F7FF' }}>

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2E5F8A 100%)' }}>
        <div className="flex items-center gap-3">
          <Scale size={32} color="#D4AF37" />
          <span className="text-white font-bold text-2xl">LexAI India</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-6">
            The AI operating system<br />for Indian advocates.
          </h1>
          <div className="space-y-4">
            {[
              { icon: '⚖', text: 'Evidence extraction from FIRs, chargesheets and depositions' },
              { icon: '📅', text: 'eCourts sync — hearing dates updated automatically' },
              { icon: '📱', text: 'Client reminders via WhatsApp, 7 days and 2 days before hearings' },
              { icon: '📄', text: 'Opening statements and bench Q&A generated in seconds' },
              { icon: '💰', text: 'Professional invoices with GST, UPI QR code, payment tracking' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl">{item.icon}</span>
                <p className="text-blue-100 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-blue-200 text-sm">
            Compliant with Advocates Act 1961 · Bar Council of India Rules · DPDP Act 2023
          </p>
          <p className="text-blue-300 text-xs mt-1">Data stored in AWS Mumbai (ap-south-1)</p>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Scale size={24} style={{ color: '#1E3A5F' }} />
            <span className="font-bold text-xl" style={{ color: '#1E3A5F' }}>LexAI India</span>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1E3A5F' }}>
              {step === 'otp-verify' ? 'Enter OTP' : 'Sign in to LexAI'}
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              {step === 'otp-verify'
                ? `We sent a 6-digit code to +91${phone}`
                : 'Welcome back. Access your legal workspace.'}
            </p>

            {/* Method selection */}
            {step === 'method' && (
              <div className="space-y-3">
                <button
                  onClick={() => setStep('otp-phone')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-[#1E3A5F] hover:bg-blue-50 transition-all text-left">
                  <Phone size={20} style={{ color: '#1E3A5F' }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1E3A5F' }}>Mobile OTP</p>
                    <p className="text-xs text-gray-400">Sign in with your +91 number</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-gray-400" />
                </button>

                <button
                  onClick={() => setStep('email')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-[#1E3A5F] hover:bg-blue-50 transition-all text-left">
                  <Mail size={20} style={{ color: '#1E3A5F' }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1E3A5F' }}>Email & Password</p>
                    <p className="text-xs text-gray-400">Sign in with your email address</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-gray-400" />
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-gray-400">or</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const { error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: { redirectTo: `${window.location.origin}/auth/callback` },
                    });
                    if (error) setError(error.message);
                  }}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:bg-gray-50 transition-all">
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
                    <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17z" fill="#34A853"/>
                    <path d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z" fill="#FBBC05"/>
                    <path d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.3z" fill="#EA4335"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-700">Continue with Google</span>
                </button>
              </div>
            )}

            {/* Email login */}
            {step === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="advocate@firm.in" required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: '#1E3A5F' }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  Sign In
                </button>
                <button type="button" onClick={() => setStep('method')}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
              </form>
            )}

            {/* Phone OTP - send */}
            {step === 'otp-phone' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile number</label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210" required maxLength={10}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
                {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading || phone.length !== 10}
                  className="w-full py-3 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: '#1E3A5F' }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Phone size={18} />}
                  Send OTP
                </button>
                <button type="button" onClick={() => setStep('method')}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
                  ← Back
                </button>
              </form>
            )}

            {/* OTP verify */}
            {step === 'otp-verify' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">6-digit OTP</label>
                  <input
                    type="text" inputMode="numeric" value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000" maxLength={6} required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono" />
                </div>
                {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading || otp.length !== 6}
                  className="w-full py-3 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: '#1E3A5F' }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  Verify & Sign In
                </button>
                <button type="button" onClick={() => { setStep('otp-phone'); setOtp(''); }}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600">
                  ← Resend OTP
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            By signing in you agree to our Terms of Service and Privacy Policy.<br />
            Protected under DPDP Act 2023 · Bar Council of India Rules.
          </p>
        </div>
      </div>
    </div>
  );
}
