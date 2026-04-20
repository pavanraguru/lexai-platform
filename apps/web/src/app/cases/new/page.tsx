'use client';
import { useLang } from '@/hooks/useLanguage';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { INDIAN_COURTS } from '@/lib/constants';
import { Scale, ChevronRight, ChevronLeft, Check, AlertCircle, Loader2 } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const CASE_TYPES = [
  { value: 'criminal_sessions',   label: 'Criminal — Sessions Court',    desc: 'Murder, NDPS, serious offences' },
  { value: 'criminal_magistrate', label: 'Criminal — Magistrate Court',  desc: 'Bailable offences, NI Act 138' },
  { value: 'civil_district',      label: 'Civil — District Court',       desc: 'Recovery, injunction, property' },
  { value: 'writ_hc',             label: 'Writ — High Court',            desc: 'Writ petitions, habeas corpus' },
  { value: 'corporate_nclt',      label: 'Corporate — NCLT / NCLAT',     desc: 'Insolvency, mergers, oppression' },
  { value: 'family',              label: 'Family Court',                  desc: 'Divorce, custody, maintenance' },
  { value: 'labour',              label: 'Labour / Industrial',           desc: 'Workmen disputes, PF, ESI' },
  { value: 'ip',                  label: 'Intellectual Property',         desc: 'Patents, trademarks, copyright' },
  { value: 'tax',                 label: 'Tax — Income Tax / GST',       desc: 'ITAT, CESTAT, Tax tribunals' },
  { value: 'arbitration',         label: 'Arbitration',                   desc: 'Domestic and international' },
  { value: 'consumer',            label: 'Consumer Forum',                desc: 'District, State, National forums' },
];

const PERSPECTIVES = [
  { value: 'defence',     label: 'Defence / Accused',  desc: 'Representing the accused or defendant' },
  { value: 'prosecution', label: 'Prosecution',         desc: 'Representing the state or complainant' },
  { value: 'petitioner',  label: 'Petitioner',          desc: 'Filing the case or writ petition' },
  { value: 'respondent',  label: 'Respondent',          desc: 'Contesting the case' },
  { value: 'appellant',   label: 'Appellant',           desc: 'Filing an appeal' },
  { value: 'claimant',    label: 'Claimant',            desc: 'Claiming relief in arbitration' },
];

const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'high',   label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'low',    label: 'Low' },
];

const STEPS = ['Case Type', 'Court & Role', 'Details', 'Review'];

const courtList = Object.entries(INDIAN_COURTS).map(([name, info]) => ({ name, ...(info as any) }));

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1px solid rgba(196,198,207,0.5)', borderRadius: '8px',
  fontSize: '14px', color: '#191c1e', background: '#fff',
  outline: 'none', fontFamily: 'Manrope, sans-serif', boxSizing: 'border-box',
};

const lbl: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: 700,
  color: '#43474e', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '6px',
};

export default function NewCasePage() {
  const { token, user } = useAuthStore();
  const router = useRouter();
  const { tr } = useLang();

  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    case_type: '',
    court: '',
    court_level: 'district_court',
    perspective: 'petitioner',
    title: '',
    cnr_number: '',
    judge_name: '',
    priority: 'normal',
    filed_date: '',
    fir_number: '',
    complainant_name: '',
    accused_names: '',
    sections_charged: '',
    opposing_counsel: '',
  });

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const canNext = [
    () => !!form.case_type,
    () => !!form.court && !!form.perspective,
    () => !!form.title,
    () => true,
  ][step]?.() ?? true;

  const isCriminal = form.case_type?.startsWith('criminal');

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const sections = form.sections_charged
        ? form.sections_charged.split(',').map(s => s.trim()).filter(Boolean)
        : [];
      const accused = form.accused_names
        ? form.accused_names.split('\n').map(s => s.trim()).filter(Boolean)
        : [];

      const body = {
        title: form.title,
        case_type: form.case_type,
        court: form.court,
        court_level: form.court_level,
        perspective: form.perspective,
        priority: form.priority,
        cnr_number: form.cnr_number || undefined,
        judge_name: form.judge_name || undefined,
        filed_date: form.filed_date || undefined,
        assigned_advocates: user?.id ? [user.id] : [],
        metadata: {
          fir_number: form.fir_number || undefined,
          complainant_name: form.complainant_name || undefined,
          accused_names: accused.length > 0 ? accused : undefined,
          sections_charged: sections.length > 0 ? sections : undefined,
          opposing_counsel: form.opposing_counsel || undefined,
        },
      };

      const res = await fetch(`${BASE}/v1/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (res.status === 401) {
        // Token expired — clear auth and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lexai-auth');
          window.location.href = '/login';
        }
        throw new Error('Session expired. Please log in again.');
      }
      if (!res.ok) throw new Error(json.message || json.error?.message || JSON.stringify(json.error) || 'Failed to create case');

      router.push(`/cases/${json.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff', borderRadius: '16px',
    border: '1px solid rgba(196,198,207,0.2)',
    boxShadow: '0px 2px 12px rgba(2,36,72,0.05)',
  };

  const selectedChip = (active: boolean): React.CSSProperties => ({
    border: `2px solid ${active ? '#022448' : 'rgba(196,198,207,0.4)'}`,
    borderRadius: '12px', padding: '20px', cursor: 'pointer',
    background: active ? 'rgba(2,36,72,0.04)' : '#fff',
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ padding: '32px 28px', fontFamily: 'Manrope, sans-serif', maxWidth: '680px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#022448', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Scale size={22} color="#ffe088" />
        </div>
        <div>
          <h1 style={{ fontFamily: 'Newsreader, serif', fontSize: '1.6rem', fontWeight: 700, color: '#022448', margin: 0 }}>{tr('new_case')}</h1>
          <p style={{ fontSize: '13px', color: '#74777f', margin: 0 }}>Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0', marginBottom: '28px' }}>
        {STEPS.map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: i < step ? '#022448' : i === step ? '#022448' : '#edeef0',
                color: i <= step ? '#fff' : '#74777f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700,
              }}>
                {i < step ? <Check size={13} /> : i + 1}
              </div>
              <span style={{ fontSize: '12px', fontWeight: i === step ? 700 : 400, color: i === step ? '#022448' : '#74777f', display: 'none' }}
                className="sm:block">{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: '2px', background: i < step ? '#022448' : '#edeef0', margin: '0 8px' }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 0: Case Type ─────────────────────────────── */}
      {step === 0 && (
        <div>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 20px' }}>
            What type of case is this?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {CASE_TYPES.map(ct => (
              <div key={ct.value} onClick={() => set('case_type', ct.value)} style={selectedChip(form.case_type === ct.value)}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#022448', margin: '0 0 3px' }}>{ct.label}</p>
                <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>{ct.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 1: Court & Role ──────────────────────────── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={lbl}>Court *</label>
            <select value={form.court} onChange={e => {
              const court = courtList.find(c => c.name === e.target.value);
              set('court', e.target.value);
              if (court) set('court_level', (court as any).level || 'district_court');
            }} style={{ ...inp, appearance: 'none' }}>
              <option value="">Select court...</option>
              {['Supreme Court', 'High Courts', 'Tribunals', 'District Courts'].map(group => {
                const courts = courtList.filter(c => {
                  if (group === 'Supreme Court') return (c as any).level === 'supreme_court';
                  if (group === 'High Courts') return (c as any).level === 'high_court';
                  if (group === 'Tribunals') return (c as any).level === 'tribunal';
                  return (c as any).level === 'district_court' || (c as any).level === 'magistrate';
                });
                if (!courts.length) return null;
                return (
                  <optgroup key={group} label={group}>
                    {courts.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </div>

          <div>
            <label style={lbl}>Your Role / Perspective *</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {PERSPECTIVES.map(p => (
                <div key={p.value} onClick={() => set('perspective', p.value)} style={selectedChip(form.perspective === p.value)}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#022448', margin: '0 0 2px' }}>{p.label}</p>
                  <p style={{ fontSize: '11px', color: '#74777f', margin: 0 }}>{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Details ───────────────────────────────── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={lbl}>Case Title *</label>
            <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="e.g. State vs Ramesh Kumar, M/S Sharma vs BMC Estate"
              style={inp} />
            <p style={{ fontSize: '11px', color: '#74777f', marginTop: '4px' }}>Use the standard legal case name format</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={lbl}>CNR Number</label>
              <input type="text" value={form.cnr_number} onChange={e => set('cnr_number', e.target.value)}
                placeholder="DLHC01-000000-2024" style={inp} />
            </div>
            <div>
              <label style={lbl}>Filed Date</label>
              <input type="date" value={form.filed_date} onChange={e => set('filed_date', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={lbl}>Judge Name</label>
              <input type="text" value={form.judge_name} onChange={e => set('judge_name', e.target.value)}
                placeholder="Hon. Justice..." style={inp} />
            </div>
            <div>
              <label style={lbl}>{tr('priority')}</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} style={{ ...inp, appearance: 'none' }}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {isCriminal && (
            <div style={{ padding: '20px', background: '#ffdad610', border: '1px solid rgba(186,26,26,0.15)', borderRadius: '10px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, color: '#93000a', letterSpacing: '0.06em', margin: '0 0 12px' }}>CRIMINAL MATTER DETAILS</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={lbl}>FIR Number</label>
                  <input type="text" value={form.fir_number} onChange={e => set('fir_number', e.target.value)} placeholder="FIR No." style={inp} />
                </div>
                <div>
                  <label style={lbl}>Complainant Name</label>
                  <input type="text" value={form.complainant_name} onChange={e => set('complainant_name', e.target.value)} placeholder="State / Complainant" style={inp} />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={lbl}>Sections Charged (comma-separated)</label>
                  <input type="text" value={form.sections_charged} onChange={e => set('sections_charged', e.target.value)} placeholder="e.g. BNS 103, BNS 111, NDPS 20" style={inp} />
                </div>
              </div>
            </div>
          )}

          <div>
            <label style={lbl}>Opposing Counsel</label>
            <input type="text" value={form.opposing_counsel} onChange={e => set('opposing_counsel', e.target.value)}
              placeholder="Adv. Name, firm name" style={inp} />
          </div>
        </div>
      )}

      {/* ── Step 3: Review ───────────────────────────────── */}
      {step === 3 && (
        <div>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.2rem', color: '#022448', margin: '0 0 20px' }}>
            Review & Create
          </h2>
          <div style={{ ...cardStyle, padding: '20px', marginBottom: '16px' }}>
            {[
              ['Case Type', form.case_type?.replace(/_/g, ' ')],
              ['Court', form.court],
              ['Perspective', form.perspective],
              ['Title', form.title],
              ['CNR Number', form.cnr_number],
              ['Judge', form.judge_name],
              ['Priority', form.priority],
              ['Filed Date', form.filed_date],
              ['Sections', form.sections_charged],
              ['Opposing Counsel', form.opposing_counsel],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label as string} style={{ display: 'flex', gap: '16px', padding: '10px 0', borderBottom: '1px solid rgba(196,198,207,0.1)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#74777f', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: '120px', flexShrink: 0 }}>
                  {label as string}
                </span>
                <span style={{ fontSize: '13px', color: '#191c1e', fontWeight: 500, textTransform: 'capitalize' }}>
                  {value as string}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '12px', color: '#74777f', margin: '0 0 4px' }}>
            You will be automatically assigned as the advocate on this case. You can add documents, schedule hearings, and run AI agents after creation.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px', background: '#ffdad6', borderRadius: '10px', marginTop: '16px', color: '#93000a' }}>
          <AlertCircle size={16} />
          <span style={{ fontSize: '13px', fontWeight: 500 }}>{error}</span>
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '28px' }}>
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : router.push('/cases')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: 'transparent', border: '1px solid rgba(196,198,207,0.5)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#43474e', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
          <ChevronLeft size={16} />
          {step === 0 ? 'Cancel' : 'Back'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 22px', background: canNext ? '#022448' : '#edeef0', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: canNext ? '#fff' : '#74777f', cursor: canNext ? 'pointer' : 'not-allowed', fontFamily: 'Manrope, sans-serif', transition: 'all 0.15s' }}>
            Next
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 24px', background: loading ? '#edeef0' : '#022448', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, color: loading ? '#74777f' : '#fff', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : <><Check size={15} /> Create Case</>}
          </button>
        )}
      </div>
    </div>
  );
}
