'use client';

import { useState } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { Zap } from 'lucide-react';
import dynamic from 'next/dynamic';
const UpgradeModal = dynamic(() => import('./UpgradeModal'), { ssr: false });

interface ProGateProps {
  children: React.ReactNode;
  feature?: string; // e.g. "AI Agents" or "AI Drafts"
  inline?: boolean; // show inline badge instead of blocking overlay
}

/**
 * Wraps any Pro-only feature.
 * - If user is Pro: renders children normally
 * - If user is on trial/free: shows a Pro badge overlay and upgrade modal on click
 *
 * Usage:
 *   <ProGate feature="AI Agents">
 *     <button onClick={() => runAgent()}>Run Agent</button>
 *   </ProGate>
 */
export default function ProGate({ children, feature = 'this feature', inline = false }: ProGateProps) {
  const { user } = useAuthStore();
  const [showModal, setShowModal] = useState(false);
  const isPro = user?.is_pro || user?.subscription_status === 'active';

  if (isPro) return <>{children}</>;

  if (inline) {
    return (
      <>
        <div style={{ position: 'relative', display: 'inline-flex' }} onClick={() => setShowModal(true)}>
          <div style={{ opacity: 0.4, pointerEvents: 'none' }}>{children}</div>
          <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ffe088', color: '#735c00', fontSize: '9px', fontWeight: 800, padding: '2px 5px', borderRadius: '4px', letterSpacing: '0.04em', cursor: 'pointer' }}>PRO</span>
        </div>
        {showModal && <UpgradeModal onClose={() => setShowModal(false)} reason={`${feature} requires a Pro subscription.`} />}
      </>
    );
  }

  return (
    <>
      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden' }}>
        {/* Dimmed children */}
        <div style={{ opacity: 0.35, pointerEvents: 'none', userSelect: 'none' }}>{children}</div>
        {/* Pro overlay */}
        <div onClick={() => setShowModal(true)} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,36,72,0.05)', backdropFilter: 'blur(2px)', cursor: 'pointer', gap: '8px' }}>
          <div style={{ background: '#022448', borderRadius: '10px', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(2,36,72,0.2)' }}>
            <Zap size={15} color="#ffe088" />
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff', fontFamily: 'Manrope, sans-serif' }}>Upgrade to use {feature}</span>
          </div>
          <span style={{ fontSize: '11px', color: '#43474e', fontFamily: 'Manrope, sans-serif' }}>Available on Pro — ₹2,999/month</span>
        </div>
      </div>
      {showModal && <UpgradeModal onClose={() => setShowModal(false)} reason={`${feature} requires a Pro subscription.`} />}
    </>
  );
}
