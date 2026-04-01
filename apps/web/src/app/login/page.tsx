'use client';
// ============================================================
// LexAI India — Login Page (Fixed Auth Flow)
// Properly stores JWT token in auth store after login
// ============================================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/hooks/useAuth';
import { Scale, Phone, Mail, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Step = 'method' | 'email' | 'otp-phone' | 'otp-verify';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, isAuthenticated } = useAuthStore();
  const supabase = getSupabase();

  const [step, setStep] = useState<Step>('method');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated()) {
      router.push('/dashboard');
    }
  }, []);

  // Handle successful login — fetch user profile and store JWT
  const handleSession = async (accessToken: string, userId: string) => {
    try {
      // Fetch user profile from our API
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/users/me`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (res.ok) {
        const { data: user } = await res.json();
        setUser({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          tenant_id: user.tenant_id,
          tenant_name: user.tenant?.name || 'My Firm',
          tenant_plan: user.tenant?.plan || 'starter',
        }, accessToken);
      } else {
        // User profile not found in our DB yet — store basic info from Supabase
        // This handles the case where the user exists in Supabase Auth but
        // hasn't been inserted into our users table yet
        const { data: { user: supaUser } } = await supabase.auth.getUser(accessToken);
        setUser({
          id: userId,
          email: supaUser?.email || email,
          full_name: supaUser?.email?.split('@')[0] || 'User',
          role: 'managing_partner',
          tenant_id: '',
          tenant_name: 'My Firm',
          tenant_plan: 'starter',
        }, accessToken);
      }
      router.push('/dashboard');
    } catch (err) {
      // Fallback — store the token at minimum so API calls work
      setUser({
        id: userId,
        email: email,
        full_name: 'User',
        role: 'managing_partner',
        tenant_id: '',
        tenant_name: 'My Firm',
        tenant_plan: 'starter',
      }, accessToken);
      router.push('/dashboard');
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.session) {
        await handleSession(data.session.access_token, data.session.user.id);
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
      const formatted = phone.startsWith('+91') ? phone : `+91${phone.replace(/^0/, '')}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (error) throw error;
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
        await handleSession(data.session.access_token, data.session.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F4F7FF' }}>
      {/* Left panel */}
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
        <p className="text-blue-300 text-xs">Data stored in AWS Mumbai (ap-south-1)</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
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
                <button onClick={() => setStep('otp-phone')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-[#1E3A5F] hover:bg-blue-50 transition-all text-left">
                  <Phone size={20} style={{ color: '#1E3A5F' }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1E3A5F' }}>Mobile OTP</p>
                    <p className="text-xs text-gray-400">Sign in with your +91 number</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-gray-400" />
                </button>
                <button onClick={() => setStep('email')}
                  className="w-full flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-[#1E3A5F] hover:bg-blue-50 transition-all text-left">
                  <Mail size={20} style={{ color: '#1E3A5F' }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1E3A5F' }}>Email & Password</p>
                    <p className="text-xs text-gray-400">Sign in with your email address</p>
                  </div>
                  <ArrowRight size={16} className="ml-auto text-gray-400" />
                </button>
              </div>
            )}

            {/* Email login */}
            {step === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    placeholder="advocate@firm.in" required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input type="password" value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                {error && <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <button type="submit" disabled={loading}
                  className="w-full py-3 px-4 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ backgroundColor: '#1E3A5F' }}>
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
                  Sign In
                </button>
                <button type="button" onClick={() => setStep('method')}
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600">← Back</button>
              </form>
            )}

            {/* Phone OTP */}
            {step === 'otp-phone' && (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile number</label>
                  <div className="flex gap-2">
                    <span className="flex items-center px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-600">
                      🇮🇳 +91
                    </span>
                    <input type="tel" value={phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
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
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600">← Back</button>
              </form>
            )}

            {/* OTP verify */}
            {step === 'otp-verify' && (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">6-digit OTP</label>
                  <input type="text" inputMode="numeric" value={otp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
                  className="w-full text-center text-sm text-gray-400 hover:text-gray-600">← Resend OTP</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
