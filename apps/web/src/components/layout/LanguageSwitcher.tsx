'use client';
import { useState, useRef, useEffect } from 'react';
import { LANGUAGES, useLang } from '@/hooks/useLanguage';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Change language"
        style={{
          display: 'flex', alignItems: 'center', gap: '5px',
          padding: '5px 10px', borderRadius: '7px', border: '1px solid rgba(196,198,207,0.3)',
          background: open ? '#f0f4ff' : '#fff', cursor: 'pointer',
          fontSize: '12px', fontWeight: 600, color: '#022448', fontFamily: 'Manrope, sans-serif',
        }}>
        <Globe size={13} />
        <span>{current.nativeName}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '38px', right: 0, background: '#fff',
          borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          border: '1px solid rgba(196,198,207,0.25)', zIndex: 500, minWidth: '180px', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(196,198,207,0.15)' }}>
            <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', margin: 0, letterSpacing: '0.08em' }}>INTERFACE LANGUAGE</p>
          </div>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '9px 14px', border: 'none', cursor: 'pointer',
                background: lang === l.code ? '#f0f4ff' : 'transparent',
                fontFamily: 'Manrope, sans-serif',
              }}>
              <span style={{ fontSize: '16px' }}>{l.flag}</span>
              <div style={{ textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: lang === l.code ? 700 : 400, color: lang === l.code ? '#022448' : '#43474e' }}>
                  {l.nativeName}
                </p>
                <p style={{ margin: 0, fontSize: '10px', color: '#74777f' }}>{l.name}</p>
              </div>
              {lang === l.code && <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#022448' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
