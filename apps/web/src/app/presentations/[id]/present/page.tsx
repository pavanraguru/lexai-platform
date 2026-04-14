'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';
import { X, ChevronLeft, ChevronRight, FileText } from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type SlideType = 'title' | 'text' | 'evidence' | 'timeline' | 'arguments' | 'qa' | 'blank' | 'section';

interface Slide {
  id: string;
  type: SlideType;
  title?: string;
  content?: string;
  bullets?: string[];
  notes?: string;
  layout?: string;
  exhibit_number?: string;
}

const SLIDE_COLORS: Record<SlideType, { bg: string; text: string; accent: string; sub: string }> = {
  title:     { bg: '#022448', text: '#fff',     accent: '#ffe088', sub: 'rgba(255,255,255,0.6)' },
  section:   { bg: '#1a3a5c', text: '#fff',     accent: '#93c5fd', sub: 'rgba(255,255,255,0.5)' },
  text:      { bg: '#fff',    text: '#191c1e',  accent: '#022448', sub: '#74777f' },
  arguments: { bg: '#fff',    text: '#191c1e',  accent: '#5b21b6', sub: '#74777f' },
  evidence:  { bg: '#f8fafc', text: '#191c1e',  accent: '#022448', sub: '#74777f' },
  timeline:  { bg: '#fff',    text: '#191c1e',  accent: '#15803d', sub: '#74777f' },
  qa:        { bg: '#fff',    text: '#191c1e',  accent: '#c2410c', sub: '#74777f' },
  blank:     { bg: '#fff',    text: '#191c1e',  accent: '#74777f', sub: '#c4c6cf' },
};

function PresentationSlide({ slide, isActive }: { slide: Slide; isActive: boolean }) {
  const colors = SLIDE_COLORS[slide.type] || SLIDE_COLORS.text;

  return (
    <div style={{
      width: '100%', height: '100%',
      background: colors.bg,
      display: 'flex', flexDirection: 'column',
      justifyContent: ['title', 'section'].includes(slide.type) ? 'center' : 'flex-start',
      padding: ['title', 'section'].includes(slide.type) ? '0' : '80px 100px',
      position: 'relative', overflow: 'hidden',
      opacity: isActive ? 1 : 0,
      transition: 'opacity 0.3s ease',
    }}>
      {/* Background decoration for title/section */}
      {(slide.type === 'title' || slide.type === 'section') && (
        <>
          <div style={{ position: 'absolute', top: '-200px', right: '-200px', width: '600px', height: '600px', borderRadius: '50%', background: `${colors.accent}12`, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-150px', left: '-150px', width: '400px', height: '400px', borderRadius: '50%', background: `${colors.accent}08`, pointerEvents: 'none' }} />
          {/* Top bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: colors.accent }} />
        </>
      )}

      {/* Slide number watermark */}
      <div style={{ position: 'absolute', bottom: '24px', right: '32px', fontSize: '12px', color: colors.sub, fontFamily: 'Manrope, sans-serif', fontWeight: 600 }}>
        {slide.exhibit_number && <span style={{ marginRight: '12px', fontWeight: 800, color: colors.accent }}>{slide.exhibit_number}</span>}
      </div>

      {/* TITLE SLIDE */}
      {slide.type === 'title' && (
        <div style={{ textAlign: 'center', padding: '80px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '60px', height: '4px', background: colors.accent, borderRadius: '2px', margin: '0 auto 32px' }} />
          <h1 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '3.5rem', color: colors.text, margin: '0 0 20px', lineHeight: 1.2 }}>
            {slide.title || 'Case Title'}
          </h1>
          {slide.content && (
            <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.3rem', color: colors.sub, margin: 0 }}>
              {slide.content}
            </p>
          )}
        </div>
      )}

      {/* SECTION SLIDE */}
      {slide.type === 'section' && (
        <div style={{ textAlign: 'center', padding: '80px', position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '3rem', color: colors.accent, margin: 0 }}>
            {slide.title || 'Section'}
          </h2>
        </div>
      )}

      {/* TEXT / ARGUMENTS */}
      {(slide.type === 'text' || slide.type === 'arguments') && (
        <>
          {slide.title && (
            <div style={{ marginBottom: '36px' }}>
              <div style={{ width: '40px', height: '4px', background: colors.accent, borderRadius: '2px', marginBottom: '16px' }} />
              <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '2.2rem', color: colors.accent, margin: 0, lineHeight: 1.2 }}>
                {slide.title}
              </h2>
            </div>
          )}
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
            {(slide.bullets || []).filter(b => b).map((b, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '18px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: colors.accent, flexShrink: 0, marginTop: '10px' }} />
                <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.25rem', color: colors.text, margin: 0, lineHeight: 1.6 }}>{b}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Q&A */}
      {slide.type === 'qa' && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '32px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '20px' }}>Q</span>
            </div>
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.8rem', color: '#c2410c', margin: 0, lineHeight: 1.3 }}>
              {slide.title}
            </h2>
          </div>
          {slide.content && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', background: '#f8fafc', borderRadius: '12px', padding: '24px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#022448', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#ffe088', fontWeight: 800, fontSize: '20px' }}>A</span>
              </div>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.2rem', color: '#191c1e', margin: 0, lineHeight: 1.7 }}>
                {slide.content}
              </p>
            </div>
          )}
        </>
      )}

      {/* EVIDENCE */}
      {slide.type === 'evidence' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            {slide.exhibit_number && (
              <div style={{ background: '#022448', color: '#fff', padding: '10px 18px', borderRadius: '10px', fontSize: '18px', fontWeight: 800, flexShrink: 0, fontFamily: 'Manrope, sans-serif' }}>
                {slide.exhibit_number}
              </div>
            )}
            <div style={{ width: '3px', height: '40px', background: '#022448', borderRadius: '2px' }} />
            <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '2rem', color: '#022448', margin: 0 }}>
              {slide.title}
            </h2>
          </div>
          {slide.content && (
            <div style={{ background: '#eef2ff', borderRadius: '12px', padding: '28px', borderLeft: '4px solid #022448' }}>
              <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.2rem', color: '#191c1e', margin: 0, lineHeight: 1.8 }}>
                {slide.content}
              </p>
            </div>
          )}
        </>
      )}

      {/* TIMELINE */}
      {slide.type === 'timeline' && (
        <>
          {slide.title && (
            <div style={{ marginBottom: '36px' }}>
              <div style={{ width: '40px', height: '4px', background: '#15803d', borderRadius: '2px', marginBottom: '16px' }} />
              <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '2.2rem', color: '#15803d', margin: 0 }}>{slide.title}</h2>
            </div>
          )}
          <div style={{ position: 'relative', paddingLeft: '32px' }}>
            <div style={{ position: 'absolute', left: '8px', top: 0, bottom: 0, width: '2px', background: '#15803d30' }} />
            {(slide.bullets || []).filter(b => b).map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '20px', position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-28px', width: '14px', height: '14px', borderRadius: '50%', background: '#15803d', border: '3px solid #fff', boxShadow: '0 0 0 2px #15803d', top: '4px' }} />
                <p style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.2rem', color: '#191c1e', margin: 0, lineHeight: 1.6 }}>{b}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PresentationModePage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [showControls, setShowControls] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['presentation-present', id],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/presentations/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Not found');
      return (await res.json()).data;
    },
    enabled: !!token && !!id,
  });

  const pres = data as any;
  const slides: Slide[] = Array.isArray(pres?.slides) ? pres.slides : [];

  const prev = useCallback(() => setCurrentSlide(i => Math.max(0, i - 1)), []);
  const next = useCallback(() => setCurrentSlide(i => Math.min(slides.length - 1, i + 1)), [slides.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
      if (e.key === 'Escape') router.push(`/presentations/${id}`);
      if (e.key === 'n' || e.key === 'N') setShowNotes(s => !s);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [next, prev, id, router]);

  // Hide controls after 3s of inactivity
  useEffect(() => {
    const timeout = setTimeout(() => setShowControls(false), 3000);
    const show = () => { setShowControls(true); clearTimeout(timeout); };
    window.addEventListener('mousemove', show);
    return () => { window.removeEventListener('mousemove', show); clearTimeout(timeout); };
  }, []);

  if (isLoading || !pres) return (
    <div style={{ background: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Manrope, sans-serif' }}>
      Loading presentation...
    </div>
  );

  const currentSlideData = slides[currentSlide];
  const progress = slides.length > 1 ? (currentSlide / (slides.length - 1)) * 100 : 100;

  return (
    <div style={{ background: '#000', height: '100vh', display: 'flex', flexDirection: 'column', userSelect: 'none', cursor: showControls ? 'default' : 'none' }}>

      {/* Progress bar */}
      <div style={{ height: '3px', background: '#ffffff20', flexShrink: 0 }}>
        <div style={{ height: '100%', background: '#ffe088', width: `${progress}%`, transition: 'width 0.3s ease' }} />
      </div>

      {/* Main slide area */}
      <div
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        onClick={next}
      >
        {currentSlideData && (
          <PresentationSlide slide={currentSlideData} isActive={true} />
        )}

        {/* Controls overlay */}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          opacity: showControls ? 1 : 0, transition: 'opacity 0.3s',
          pointerEvents: showControls ? 'auto' : 'none',
        }}>
          {/* Prev zone */}
          <div onClick={e => { e.stopPropagation(); prev(); }} style={{ width: '20%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '0 20px' }}>
            {currentSlide > 0 && (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={20} color="#fff" />
              </div>
            )}
          </div>
          {/* Center */}
          <div style={{ flex: 1 }} />
          {/* Next zone */}
          <div onClick={e => { e.stopPropagation(); next(); }} style={{ width: '20%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px' }}>
            {currentSlide < slides.length - 1 && (
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={20} color="#fff" />
              </div>
            )}
          </div>
        </div>

        {/* Top controls */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), transparent)',
          opacity: showControls ? 1 : 0, transition: 'opacity 0.3s',
        }}>
          <div style={{ display: 'flex', align: 'center', gap: '12px' }}>
            <Link href={`/presentations/${id}`} onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.8)', textDecoration: 'none', fontSize: '12px', fontFamily: 'Manrope, sans-serif', fontWeight: 600, background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '6px' }}>
              <X size={14} /> Exit
            </Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontFamily: 'Manrope, sans-serif', fontWeight: 600 }}>
              {currentSlide + 1} / {slides.length}
            </span>
            <button onClick={e => { e.stopPropagation(); setShowNotes(s => !s); }} style={{ background: showNotes ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '6px', padding: '6px 12px', color: 'rgba(255,255,255,0.8)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif', fontWeight: 600 }}>
              Notes (N)
            </button>
          </div>
        </div>

        {/* Keyboard hint */}
        {currentSlide === 0 && showControls && (
          <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontFamily: 'Manrope, sans-serif', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>← → Arrow keys to navigate</span>
            <span>·</span>
            <span>Click to advance</span>
            <span>·</span>
            <span>Esc to exit</span>
          </div>
        )}
      </div>

      {/* Speaker notes panel */}
      {showNotes && currentSlideData?.notes && (
        <div style={{ background: '#1a1a1a', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '16px 32px', maxHeight: '30vh', overflow: 'auto', flexShrink: 0 }}>
          <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em', margin: '0 0 8px', fontFamily: 'Manrope, sans-serif' }}>SPEAKER NOTES</p>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: 0, lineHeight: 1.7, fontFamily: 'Manrope, sans-serif' }}>
            {currentSlideData.notes}
          </p>
        </div>
      )}

      {/* Slide strip */}
      <div style={{ background: '#111', borderTop: '1px solid rgba(255,255,255,0.08)', padding: '10px 16px', display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0, opacity: showControls ? 1 : 0, transition: 'opacity 0.3s' }}>
        {slides.map((s, i) => (
          <div
            key={s.id}
            onClick={() => setCurrentSlide(i)}
            style={{
              width: '80px', height: '45px', borderRadius: '4px', flexShrink: 0, cursor: 'pointer',
              background: SLIDE_COLORS[s.type]?.bg || '#fff',
              border: i === currentSlide ? '2px solid #ffe088' : '2px solid transparent',
              opacity: i === currentSlide ? 1 : 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}>
            <span style={{ fontSize: '8px', fontWeight: 700, color: SLIDE_COLORS[s.type]?.accent || '#022448', opacity: 0.8 }}>
              {(s.title || s.type)?.slice(0, 10)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
