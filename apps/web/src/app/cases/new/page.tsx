'use client';
// ============================================================
// LexAI India — New Case Creation Wizard
// PRD v1.1 CM-01 — Multi-step case creation
// Steps: Type → Court → Parties → Details → Assign
// ============================================================

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import { casesApi, userApi } from '@/lib/api';
import { INDIAN_COURTS } from '@/lib/constants';
import { ChevronRight, ChevronLeft, Check, Scale, AlertCircle, Loader2 } from 'lucide-react';

const CASE_TYPES = [
  { value: 'criminal_sessions',   label: 'Criminal — Sessions Court',          icon: '⚖️', desc: 'Murder, NDPS, serious offences' },
  { value: 'criminal_magistrate', label: 'Criminal — Magistrate Court',         icon: '🔨', desc: 'Bailable offences, NI Act Section 138' },
  { value: 'civil_district',      label: 'Civil — District Court',              icon: '📋', desc: 'Recovery, injunction, property disputes' },
  { value: 'writ_hc',             label: 'Writ — High Court',                   icon: '📜', desc: 'Writ petitions, habeas corpus, mandamus' },
  { value: 'corporate_nclt',      label: 'Corporate — NCLT / NCLAT',            icon: '🏢', desc: 'Insolvency, oppression, mergers' },
  { value: 'family',              label: 'Family Court',                         icon: '👨‍👩‍👧', desc: 'Divorce, maintenance, custody, RCR' },
  { value: 'labour',              label: 'Labour / Industrial Dispute',          icon: '👷', desc: 'Workmen disputes, PF, ESI' },
  { value: 'ip',                  label: 'Intellectual Property',                icon: '💡', desc: 'Patents, trademarks, copyright' },
  { value: 'tax',                 label: 'Tax — Income Tax / GST',              icon: '💰', desc: 'ITAT, CESTAT, Tax tribunals' },
  { value: 'arbitration',         label: 'Arbitration',                          icon: '🤝', desc: 'Domestic and international arbitration' },
  { value: 'consumer',            label: 'Consumer Forum',                       icon: '🛍️', desc: 'District, State, National Consumer Forums' },
];

const PERSPECTIVES = [
  { value: 'defence',      label: 'Defence / Accused',   desc: 'Representing the accused or defendant' },
  { value: 'prosecution',  label: 'Prosecution',          desc: 'Representing the state/complainant' },
  { value: 'petitioner',   label: 'Petitioner',           desc: 'Filing the case / writ petition' },
  { value: 'respondent',   label: 'Respondent',           desc: 'Contesting the case' },
  { value: 'appellant',    label: 'Appellant',            desc: 'Filing an appeal against a lower court order' },
  { value: 'claimant',     label: 'Claimant',             desc: 'Claiming relief in arbitration or tribunal' },
];

const STEPS = ['Case Type', 'Court', 'Parties', 'Details', 'Review'];

interface FormData {
  case_type: string; court: string; court_level: string; perspective: string;
  title: string; cnr_number: string; judge_name: string; priority: string;
  filed_date: string;
  fir_number: string; police_station: string; complainant_name: string;
  accused_names: string; sections_charged: string; opposing_counsel: string;
  case_value_inr: string;
  assigned_advocates: string[];
}

export default function NewCasePage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    case_type: '', court: '', court_level: '', perspective: 'defence',
    title: '', cnr_number: '', judge_name: '', priority: 'normal',
    filed_date: '', fir_number: '', police_station: '',
    complainant_name: '', accused_names: '', sections_charged: '',
    opposing_counsel: '', case_value_inr: '', assigned_advocates: [],
  });
  const [error, setError] = useState('');

  const courtList = Object.entries(INDIAN_COURTS).map(([name, info]) => ({ name, ...info }));

  const createCase = useMutation({
    mutationFn: () => {
      const sections = form.sections_charged ? form.sections_charged.split(',').map(s => s.trim()).filter(Boolean) : [];
      const accused = form.accused_names ? form.accused_names.split('\n').map(s => s.trim()).filter(Boolean) : [];

      return casesApi.create(token!, {
        title: form.title || `${form.case_type?.replace(/_/g, ' ')} — ${new Date().getFullYear()}`,
        case_type: form.case_type as any,
        court: form.court,
        court_level: form.court_level as any,
        perspective: form.perspective as any,
        cnr_number: form.cnr_number || undefined,
        judge_name: form.judge_name || undefined,
        priority: form.priority as any,
        filed_date: form.filed_date || undefined,
        assigned_advocates: form.assigned_advocates.length > 0 ? form.assigned_advocates : (user?.id ? [user.id] : []),
        metadata: {
          fir_number: form.fir_number || undefined,
          police_station: form.police_station || undefined,
          complainant_name: form.complainant_name || undefined,
          accused_names: accused.length > 0 ? accused : undefined,
          sections_charged: sections.length > 0 ? sections : undefined,
          opposing_counsel: form.opposing_counsel || undefined,
          case_value_inr: form.case_value_inr ? parseFloat(form.case_value_inr) : undefined,
        },
      });
    },
    onSuccess: (res) => {
      router.push(`/cases/${res.data.id}`);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create case');
    },
  });

  const set = (key: keyof FormData, val: any) => setForm(f => ({ ...f, [key]: val }));

  const isCriminal = form.case_type?.startsWith('criminal');
  const isCivil = form.case_type === 'civil_district';
  const isCorporate = form.case_type === 'corporate_nclt';

  const canNext = [
    () => !!form.case_type,
    () => !!form.court && !!form.perspective,
    () => !!form.title,
    () => true,
  ][step]?.() ?? true;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1E3A5F' }}>
          <Scale size={20} color="white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1E3A5F' }}>New Case</h1>
          <p className="text-gray-400 text-sm">Step {step + 1} of {STEPS.length}</p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${i < step ? 'text-white' : i === step ? 'text-white' : 'bg-gray-100 text-gray-400'}`}
              style={i <= step ? { backgroundColor: '#1E3A5F' } : {}}>
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? 'bg-[#1E3A5F]' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Form card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">

        {/* Step 0: Case Type */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">What type of case is this?</h2>
            <p className="text-sm text-gray-400 mb-5">The case type determines which AI agents and task templates are used.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CASE_TYPES.map(ct => (
                <button key={ct.value}
                  onClick={() => set('case_type', ct.value)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all
                    ${form.case_type === ct.value ? 'border-[#1E3A5F] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <span className="text-xl">{ct.icon}</span>
                  <div>
                    <p className={`text-sm font-semibold ${form.case_type === ct.value ? 'text-[#1E3A5F]' : 'text-gray-800'}`}>
                      {ct.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{ct.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Court + Perspective */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Which court?</h2>
              <p className="text-sm text-gray-400 mb-4">Select the court where this case is filed.</p>
              <select
                value={form.court}
                onChange={e => {
                  const court = courtList.find(c => c.name === e.target.value);
                  set('court', e.target.value);
                  if (court) set('court_level', court.level);
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                <option value="">Select court...</option>
                {courtList.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
                <option value="__other__">Other court (type below)</option>
              </select>
              {form.court === '__other__' && (
                <input type="text" placeholder="Enter court name"
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  onChange={e => set('court', e.target.value)} />
              )}
              {form.court && form.court !== '__other__' && (
                <div className="mt-2 text-xs text-gray-400">
                  Address judge as: <strong>{courtList.find(c => c.name === form.court)?.address_as}</strong>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Which side are you on?</label>
              <div className="grid grid-cols-2 gap-2">
                {PERSPECTIVES.map(p => (
                  <button key={p.value} onClick={() => set('perspective', p.value)}
                    className={`p-3 rounded-xl border-2 text-left transition-all
                      ${form.perspective === p.value ? 'border-[#1E3A5F] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className={`text-sm font-semibold ${form.perspective === p.value ? 'text-[#1E3A5F]' : 'text-gray-800'}`}>
                      {p.label}
                    </p>
                    <p className="text-xs text-gray-400">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Parties + Title */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Party names & case title</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Case title <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. State vs Ramesh Kumar or Mehta Pvt Ltd vs SEBI"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              <p className="text-xs text-gray-400 mt-1">This is the name shown everywhere in the app.</p>
            </div>

            {isCriminal && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Complainant name</label>
                    <input type="text" value={form.complainant_name} onChange={e => set('complainant_name', e.target.value)}
                      placeholder="Sita Devi w/o Ram Prasad"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">FIR number</label>
                    <input type="text" value={form.fir_number} onChange={e => set('fir_number', e.target.value)}
                      placeholder="FIR No. 456/2024, PS CP"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accused name(s)</label>
                  <textarea value={form.accused_names} onChange={e => set('accused_names', e.target.value)}
                    placeholder="One name per line:&#10;Ramesh Kumar s/o Mohan Kumar&#10;Suresh Kumar s/o Mohan Kumar"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sections charged</label>
                  <input type="text" value={form.sections_charged} onChange={e => set('sections_charged', e.target.value)}
                    placeholder="BNS 103, BNS 316 (comma-separated)"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opposing counsel</label>
              <input type="text" value={form.opposing_counsel} onChange={e => set('opposing_counsel', e.target.value)}
                placeholder="Adv. Rajiv Malhotra / APP Suresh Tiwari"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>
        )}

        {/* Step 3: Additional details */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Additional details</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNR Number</label>
                <input type="text" value={form.cnr_number} onChange={e => set('cnr_number', e.target.value)}
                  placeholder="DLHC01-001234-2024"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" />
                <p className="text-xs text-gray-400 mt-1">eCourts Case Number Register — enables auto-sync</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={form.priority} onChange={e => set('priority', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filed Date</label>
                <input type="date" value={form.filed_date} onChange={e => set('filed_date', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judge Name</label>
                <input type="text" value={form.judge_name} onChange={e => set('judge_name', e.target.value)}
                  placeholder="Sh. Suresh Verma, ASJ"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Review & Create</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Case Title', value: form.title },
                { label: 'Case Type', value: form.case_type?.replace(/_/g, ' ') },
                { label: 'Court', value: form.court },
                { label: 'Perspective', value: form.perspective },
                { label: 'Priority', value: form.priority },
                { label: 'CNR Number', value: form.cnr_number || '—' },
                { label: 'FIR Number', value: form.fir_number || '—' },
                { label: 'Sections', value: form.sections_charged || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-gray-500 w-32 flex-shrink-0">{label}</span>
                  <span className="text-gray-900 font-medium text-right capitalize">{value}</span>
                </div>
              ))}
            </div>
            {form.cnr_number && (
              <div className="mt-4 flex items-start gap-2 bg-green-50 text-green-700 rounded-xl px-4 py-3 text-sm">
                <Check size={16} className="flex-shrink-0 mt-0.5" />
                <p>CNR number provided — eCourts auto-sync will be enabled for this case.</p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm mt-4">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : router.push('/cases')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
          <ChevronLeft size={16} />
          {step === 0 ? 'Cancel' : 'Back'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={!canNext}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: '#1E3A5F' }}>
            Next
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            onClick={() => createCase.mutate()}
            disabled={createCase.isPending}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-40"
            style={{ backgroundColor: '#1A6B3A' }}>
            {createCase.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Create Case
          </button>
        )}
      </div>
    </div>
  );
}
