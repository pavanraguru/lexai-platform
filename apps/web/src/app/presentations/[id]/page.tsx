'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  ChevronLeft, Plus, Play, Sparkles, Trash2, GripVertical,
  Type, AlignLeft, Image, Clock, MessageSquare, Minus,
  ChevronUp, ChevronDown, Save, Share2, Loader2, LayoutGrid,
  FileText, Bold, List,
} from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type SlideType = 'title' | 'text' | 'evidence' | 'timeline' | 'arguments' | 'qa' | 'blank' | 'section';

interface Slide {
  id: string;
  type: SlideType;
  title?: string;
  content?: string;
  bullets?: string[];
  notes?: string;
  layout?: 'default' | 'centered' | 'split';
  background?: string;
  exhibit_number?: string;
  doc_id?: string;
}

const SLIDE_TYPES: { type: SlideType; Icon: any; label: string; desc: string }[] = [
  { type: 'title',     Icon: Type,         label: 'Title',     desc: 'Case title slide' },
  { type: 'section',  Icon: LayoutGrid,   label: 'Section',   desc: 'Section divider' },
  { type: 'text',     Icon: AlignLeft,    label: 'Text',      desc: 'Text with bullets' },
  { type: 'arguments',Icon: Bold,         label: 'Arguments', desc: 'Key arguments list' },
  { type: 'evidence', Icon: Image,        label: 'Evidence',  desc: 'Evidence exhibit' },
  { type: 'timeline', Icon: Clock,        label: 'Timeline',  desc: 'Chronology' },
  { type: 'qa',       Icon: MessageSquare,label: 'Q & A',     desc: 'Bench questions' },
  { type: 'blank',    Icon: Minus,        label: 'Blank',     desc: 'Empty slide' },
];

const SLIDE_BG_COLORS: Record<SlideType, { bg: string; text: string; accent: string }> = {
  title:     { bg: '#022448', text: '#fff',     accent: '#ffe088' },
  section:   { bg: '#1e3a5f', text: '#fff',     accent: '#93c5fd' },
  text:      { bg: '#fff',    text: '#191c1e',  accent: '#022448' },
  arguments: { bg: '#fff',    text: '#191c1e',  accent: '#5b21b6' },
  evidence:  { bg: '#f8fafc', text: '#191c1e',  accent: '#022448' },
  timeline:  { bg: '#fff',    text: '#191c1e',  accent: '#15803d' },
  qa:        { bg: '#fff',    text: '#191c1e',  accent: '#c2410c' },
  blank:     { bg: '#fff',    text: '#191c1e',  accent: '#74777f' },
};

function SlidePreview({ slide, isSelected, onClick, index }: { slide: Slide; isSelected: boolean; onClick: () => void; index: number }) {
  const colors = SLIDE_BG_COLORS[slide.type];
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', gap: '10px', alignItems: 'flex-start',
        padding: '8px', borderRadius: '8px', cursor: 'pointer',
        background: isSelected ? 'rgba(2,36,72,0.06)' : 'transparent',
        border: isSelected ? '1.5px solid rgba(2,36,72,0.15)' : '1.5px solid transparent',
        transition: 'all 0.12s',
      }}>
      <span style={{ fontSize: '10px', color: '#74777f', fontWeight: 600, width: '16px', flexShrink: 0, paddingTop: '2px' }}>{index + 1}</span>
      {/* Mini slide */}
      <div style={{
        width: '96px', height: '54px', borderRadius: '4px', flexShrink: 0,
        background: colors.bg, border: '1px solid rgba(196,198,207,0.2)',
        padding: '6px', overflow: 'hidden', position: 'relative',
      }}>
        {slide.type === 'title' && (
          <>
            <div style={{ height: '2px', background: colors.accent, width: '60%', marginBottom: '4px' }} />
            <div style={{ height: '6px', background: colors.text, opacity: 0.9, width: '80%', borderRadius: '1px', marginBottom: '3px' }} />
            <div style={{ height: '3px', background: colors.text, opacity: 0.4, width: '50%', borderRadius: '1px' }} />
          </>
        )}
        {slide.type === 'section' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <div style={{ height: '6px', background: colors.accent, width: '60%', borderRadius: '2px' }} />
          </div>
        )}
        {(slide.type === 'text' || slide.type === 'arguments') && (
          <>
            <div style={{ height: '4px', background: colors.accent, opacity: 0.7, width: '50%', borderRadius: '1px', marginBottom: '4px' }} />
            {[70, 80, 60].map((w, i) => (
              <div key={i} style={{ height: '2px', background: '#74777f', opacity: 0.3, width: `${w}%`, borderRadius: '1px', marginBottom: '2px' }} />
            ))}
          </>
        )}
        {slide.type === 'qa' && (
          <>
            <div style={{ height: '3px', background: '#c2410c', opacity: 0.7, width: '40%', borderRadius: '1px', marginBottom: '3px' }} />
            <div style={{ height: '2px', background: '#74777f', opacity: 0.3, width: '70%', borderRadius: '1px', marginBottom: '2px' }} />
            <div style={{ height: '2px', background: '#74777f', opacity: 0.3, width: '55%', borderRadius: '1px' }} />
          </>
        )}
        {slide.type === 'blank' && null}
        {/* Type badge */}
        <div style={{ position: 'absolute', bottom: '3px', right: '3px', fontSize: '7px', fontWeight: 800, color: colors.accent, opacity: 0.8, textTransform: 'uppercase' }}>
          {slide.type.slice(0, 3)}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#191c1e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {slide.title || `(${slide.type} slide)`}
        </p>
        <p style={{ fontSize: '10px', color: '#74777f', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{slide.type}</p>
      </div>
    </div>
  );
}

function SlideCanvas({ slide, onChange }: { slide: Slide; onChange: (updated: Slide) => void }) {
  const colors = SLIDE_BG_COLORS[slide.type];
  const [editingBulletIndex, setEditingBulletIndex] = useState<number | null>(null);

  const addBullet = () => {
    const bullets = [...(slide.bullets || []), 'New point'];
    onChange({ ...slide, bullets });
    setEditingBulletIndex(bullets.length - 1);
  };

  const updateBullet = (i: number, val: string) => {
    const bullets = [...(slide.bullets || [])];
    bullets[i] = val;
    onChange({ ...slide, bullets });
  };

  const removeBullet = (i: number) => {
    const bullets = (slide.bullets || []).filter((_, idx) => idx !== i);
    onChange({ ...slide, bullets });
  };

  return (
    <div style={{
      width: '100%', aspectRatio: '16/9',
      background: colors.bg,
      borderRadius: '12px',
      border: '1px solid rgba(196,198,207,0.15)',
      boxShadow: '0 8px 32px rgba(2,36,72,0.12)',
      display: 'flex', flexDirection: 'column',
      padding: slide.type === 'section' ? '0' : '40px 48px',
      justifyContent: slide.type === 'title' || slide.type === 'section' ? 'center' : 'flex-start',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative elements for title/section */}
      {(slide.type === 'title' || slide.type === 'section') && (
        <>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', borderRadius: '50%', background: `${colors.accent}15`, transform: 'translate(100px, -150px)' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '200px', height: '200px', borderRadius: '50%', background: `${colors.accent}10`, transform: 'translate(-100px, 100px)' }} />
        </>
      )}

      {slide.type === 'title' && (
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ width: '48px', height: '3px', background: colors.accent, borderRadius: '2px', margin: '0 auto 20px' }} />
          <input
            value={slide.title || ''}
            onChange={e => onChange({ ...slide, title: e.target.value })}
            placeholder="Case Title"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '2rem', color: colors.text, textAlign: 'center', width: '100%', marginBottom: '12px' }}
          />
          <input
            value={slide.content || ''}
            onChange={e => onChange({ ...slide, content: e.target.value })}
            placeholder="Court Name"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Manrope, sans-serif', fontSize: '1rem', color: `${colors.text}99`, textAlign: 'center', width: '100%' }}
          />
        </div>
      )}

      {slide.type === 'section' && (
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px' }}>
          <input
            value={slide.title || ''}
            onChange={e => onChange({ ...slide, title: e.target.value })}
            placeholder="Section Title"
            style={{ background: 'transparent', border: 'none', outline: 'none', fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.8rem', color: colors.accent, textAlign: 'center', width: '100%' }}
          />
        </div>
      )}

      {(slide.type === 'text' || slide.type === 'arguments') && (
        <>
          <input
            value={slide.title || ''}
            onChange={e => onChange({ ...slide, title: e.target.value })}
            placeholder="Slide Title"
            style={{ background: 'transparent', border: 'none', outline: 'none', borderBottom: `2px solid ${colors.accent}`, fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.4rem', color: colors.accent, marginBottom: '20px', paddingBottom: '8px', width: '100%' }}
          />
          <div style={{ flex: 1 }}>
            {(slide.bullets || []).map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.accent, flexShrink: 0, marginTop: '8px' }} />
                <input
                  value={b}
                  onChange={e => updateBullet(i, e.target.value)}
                  onFocus={() => setEditingBulletIndex(i)}
                  style={{ background: 'transparent', border: 'none', outline: 'none', flex: 1, fontSize: '14px', color: colors.text, fontFamily: 'Manrope, sans-serif', lineHeight: 1.6 }}
                />
                <button onClick={() => removeBullet(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4, color: colors.text }}>×</button>
              </div>
            ))}
            <button onClick={addBullet} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: `1px dashed ${colors.accent}50`, borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: colors.accent, marginTop: '8px' }}>
              <Plus size={12} /> Add bullet
            </button>
          </div>
        </>
      )}

      {slide.type === 'qa' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#c2410c', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '14px' }}>Q</span>
            </div>
            <input
              value={slide.title || ''}
              onChange={e => onChange({ ...slide, title: e.target.value })}
              placeholder="Anticipated Question from Bench"
              style={{ background: 'transparent', border: 'none', outline: 'none', borderBottom: '2px solid #c2410c', fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.1rem', color: '#c2410c', flex: 1, paddingBottom: '4px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#022448', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: '#ffe088', fontWeight: 800, fontSize: '14px' }}>A</span>
            </div>
            <textarea
              value={slide.content || ''}
              onChange={e => onChange({ ...slide, content: e.target.value })}
              placeholder="Suggested answer / response to bench..."
              style={{ background: 'transparent', border: 'none', outline: 'none', flex: 1, fontSize: '13px', color: '#191c1e', fontFamily: 'Manrope, sans-serif', lineHeight: 1.7, resize: 'none', minHeight: '80px' }}
            />
          </div>
        </>
      )}

      {slide.type === 'evidence' && (
        <>
          <input
            value={slide.title || ''}
            onChange={e => onChange({ ...slide, title: e.target.value })}
            placeholder="Evidence Exhibit Title"
            style={{ background: 'transparent', border: 'none', outline: 'none', borderBottom: '2px solid #022448', fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.4rem', color: '#022448', marginBottom: '16px', paddingBottom: '8px', width: '100%' }}
          />
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {slide.exhibit_number && (
              <div style={{ background: '#022448', color: '#fff', padding: '8px 14px', borderRadius: '8px', fontSize: '14px', fontWeight: 800, flexShrink: 0 }}>
                {slide.exhibit_number}
              </div>
            )}
            <textarea
              value={slide.content || ''}
              onChange={e => onChange({ ...slide, content: e.target.value })}
              placeholder="Describe the evidence, its significance, and what it proves..."
              style={{ background: '#f0f4ff', border: '1px solid rgba(2,36,72,0.1)', borderRadius: '8px', flex: 1, fontSize: '13px', color: '#191c1e', fontFamily: 'Manrope, sans-serif', lineHeight: 1.7, resize: 'none', minHeight: '100px', padding: '12px', outline: 'none' }}
            />
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', display: 'block', marginBottom: '4px' }}>EXHIBIT NUMBER</label>
            <input
              value={slide.exhibit_number || ''}
              onChange={e => onChange({ ...slide, exhibit_number: e.target.value })}
              placeholder="e.g. E-1, MO-3"
              style={{ border: '1px solid rgba(196,198,207,0.4)', borderRadius: '5px', padding: '6px 10px', fontSize: '12px', fontFamily: 'monospace', width: '120px', outline: 'none' }}
            />
          </div>
        </>
      )}

      {slide.type === 'timeline' && (
        <>
          <input
            value={slide.title || ''}
            onChange={e => onChange({ ...slide, title: e.target.value })}
            placeholder="Timeline Title"
            style={{ background: 'transparent', border: 'none', outline: 'none', borderBottom: '2px solid #15803d', fontFamily: 'Newsreader, serif', fontWeight: 700, fontSize: '1.4rem', color: '#15803d', marginBottom: '20px', paddingBottom: '8px', width: '100%' }}
          />
          {(slide.bullets || []).map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#15803d', border: '2px solid #fff', boxShadow: '0 0 0 2px #15803d' }} />
                {i < (slide.bullets || []).length - 1 && <div style={{ width: '2px', flex: 1, background: '#15803d30', minHeight: '20px', marginTop: '2px' }} />}
              </div>
              <input
                value={b}
                onChange={e => updateBullet(i, e.target.value)}
                style={{ background: 'transparent', border: 'none', outline: 'none', flex: 1, fontSize: '13px', color: colors.text, fontFamily: 'Manrope, sans-serif' }}
              />
              <button onClick={() => removeBullet(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.4 }}>×</button>
            </div>
          ))}
          <button onClick={addBullet} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: '1px dashed #15803d50', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: '#15803d', marginTop: '4px' }}>
            <Plus size={12} /> Add event
          </button>
        </>
      )}

      {slide.type === 'blank' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
          <p style={{ fontSize: '13px', color: '#74777f', fontFamily: 'Manrope, sans-serif' }}>Blank slide — add your content</p>
        </div>
      )}
    </div>
  );
}

export default function PresentationBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAddSlide, setShowAddSlide] = useState(false);
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [genPerspective, setGenPerspective] = useState('defence');
  const [showGenPanel, setShowGenPanel] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['presentation', id],
    queryFn: async () => {
      const res = await fetch(`${BASE}/v1/presentations/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Not found');
      return (await res.json()).data;
    },
    enabled: !!token && !!id,
    onSuccess: (d: any) => {
      setSlides(Array.isArray(d.slides) ? d.slides : []);
      setTitle(d.title || '');
    },
  });

  const pres = data as any;
  const selectedSlide = slides[selectedSlideIndex];

  const save = async (slidesToSave = slides) => {
    setSaving(true);
    try {
      await fetch(`${BASE}/v1/presentations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slides: slidesToSave, title }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const updateSlide = useCallback((updated: Slide) => {
    setSlides(prev => {
      const next = prev.map(s => s.id === updated.id ? updated : s);
      return next;
    });
  }, []);

  const addSlide = (type: SlideType) => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      type,
      title: '',
      bullets: ['text', 'arguments', 'timeline', 'qa'].includes(type) ? [''] : undefined,
      notes: '',
      layout: 'default',
    };
    const next = [...slides, newSlide];
    setSlides(next);
    setSelectedSlideIndex(next.length - 1);
    setShowAddSlide(false);
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, i) => i !== index);
    setSlides(next);
    setSelectedSlideIndex(Math.max(0, index - 1));
  };

  const moveSlide = (index: number, dir: -1 | 1) => {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= slides.length) return;
    const next = [...slides];
    [next[index], next[newIndex]] = [next[newIndex], next[index]];
    setSlides(next);
    setSelectedSlideIndex(newIndex);
  };

  const generateWithAI = async () => {
    setGenerating(true);
    setShowGenPanel(false);
    try {
      const res = await fetch(`${BASE}/v1/presentations/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ perspective: genPerspective }),
      });
      const json = await res.json();
      if (json.data?.slides) {
        setSlides(json.data.slides);
        setSelectedSlideIndex(0);
      }
    } catch {}
    setGenerating(false);
  };

  if (isLoading) return (
    <div style={{ padding: '32px', fontFamily: 'Manrope, sans-serif', color: '#74777f' }}>Loading presentation...</div>
  );

  const inp: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px',
    fontSize: '12px', fontFamily: 'Manrope, sans-serif', outline: 'none', background: '#fff',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Manrope, sans-serif', background: '#f4f5f7' }}>

      {/* ── Topbar ─────────────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(196,198,207,0.2)', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '12px', height: '52px', flexShrink: 0, zIndex: 10 }}>
        <Link href={`/cases/${pres?.case_id}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#74777f', textDecoration: 'none', fontSize: '12px', fontWeight: 600 }}>
          <ChevronLeft size={15} /> {pres?.case?.title?.slice(0, 25)}...
        </Link>
        <div style={{ width: '1px', height: '20px', background: 'rgba(196,198,207,0.4)' }} />

        {/* Title */}
        {editingTitle ? (
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)}
            autoFocus
            style={{ ...inp, fontSize: '13px', fontWeight: 700, color: '#022448', minWidth: '200px' }}
          />
        ) : (
          <span onClick={() => setEditingTitle(true)} style={{ fontSize: '13px', fontWeight: 700, color: '#022448', cursor: 'text', padding: '4px 6px', borderRadius: '4px' }}>
            {title || 'Untitled Presentation'}
          </span>
        )}

        <span style={{ fontSize: '11px', color: '#74777f' }}>{slides.length} slides</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* AI Generate */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowGenPanel(!showGenPanel)}
              disabled={generating}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: generating ? '#edeef0' : '#5b21b6', color: generating ? '#74777f' : '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer' }}>
              {generating ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={13} /> AI Generate</>}
            </button>
            {showGenPanel && (
              <div style={{ position: 'absolute', top: '42px', right: 0, background: '#fff', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '12px', padding: '16px', width: '240px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 100 }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#43474e', letterSpacing: '0.06em', margin: '0 0 8px' }}>PERSPECTIVE</p>
                {['defence', 'prosecution', 'petitioner', 'respondent'].map(p => (
                  <button key={p} onClick={() => setGenPerspective(p)} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px',
                    background: genPerspective === p ? '#d5e3ff' : 'transparent',
                    color: genPerspective === p ? '#022448' : '#43474e',
                    fontWeight: genPerspective === p ? 700 : 400,
                    marginBottom: '2px', textTransform: 'capitalize',
                  }}>{p}</button>
                ))}
                <button onClick={generateWithAI} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center', padding: '9px', background: '#5b21b6', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '10px' }}>
                  <Sparkles size={12} /> Generate {slides.length > 0 ? '(replace)' : '10-15 slides'}
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => save()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: saved ? '#dcfce7' : '#022448', color: saved ? '#15803d' : '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
          </button>

          <Link href={`/presentations/${id}/present`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#ffe088', color: '#745c00', borderRadius: '7px', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}>
            <Play size={13} /> Present
          </Link>
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Slide panel */}
        <div style={{ width: '220px', background: '#fff', borderRight: '1px solid rgba(196,198,207,0.2)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 10px 8px', borderBottom: '1px solid rgba(196,198,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em' }}>SLIDES</span>
            <button onClick={() => setShowAddSlide(!showAddSlide)} style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'none', border: '1px solid rgba(2,36,72,0.15)', borderRadius: '5px', padding: '3px 7px', cursor: 'pointer', fontSize: '11px', color: '#022448', fontWeight: 700 }}>
              <Plus size={11} /> Add
            </button>
          </div>

          {/* Add slide panel */}
          {showAddSlide && (
            <div style={{ padding: '10px', borderBottom: '1px solid rgba(196,198,207,0.1)', background: '#f8fafc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {SLIDE_TYPES.map(({ type, Icon, label }) => (
                  <button key={type} onClick={() => addSlide(type)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                    padding: '8px 4px', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '6px',
                    background: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 600, color: '#43474e',
                  }}>
                    <Icon size={14} color="#022448" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Slide list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
            {slides.map((slide, i) => (
              <SlidePreview
                key={slide.id}
                slide={slide}
                index={i}
                isSelected={i === selectedSlideIndex}
                onClick={() => setSelectedSlideIndex(i)}
              />
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {selectedSlide ? (
            <>
              <div style={{ width: '100%', maxWidth: '800px' }}>
                <SlideCanvas slide={selectedSlide} onChange={updateSlide} />
              </div>

              {/* Slide controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
                <button onClick={() => moveSlide(selectedSlideIndex, -1)} disabled={selectedSlideIndex === 0}
                  style={{ display: 'flex', padding: '6px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', background: '#fff', cursor: 'pointer', opacity: selectedSlideIndex === 0 ? 0.4 : 1 }}>
                  <ChevronUp size={14} color="#022448" />
                </button>
                <button onClick={() => moveSlide(selectedSlideIndex, 1)} disabled={selectedSlideIndex === slides.length - 1}
                  style={{ display: 'flex', padding: '6px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', background: '#fff', cursor: 'pointer', opacity: selectedSlideIndex === slides.length - 1 ? 0.4 : 1 }}>
                  <ChevronDown size={14} color="#022448" />
                </button>
                <span style={{ fontSize: '12px', color: '#74777f', padding: '0 8px' }}>
                  Slide {selectedSlideIndex + 1} of {slides.length}
                </span>
                <button onClick={() => removeSlide(selectedSlideIndex)} disabled={slides.length <= 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', border: '1px solid rgba(186,26,26,0.2)', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '11px', color: '#ba1a1a', fontWeight: 600, opacity: slides.length <= 1 ? 0.4 : 1 }}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>

              {/* Speaker notes */}
              <div style={{ width: '100%', maxWidth: '800px', marginTop: '16px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', display: 'block', marginBottom: '6px' }}>SPEAKER NOTES</label>
                <textarea
                  value={selectedSlide.notes || ''}
                  onChange={e => updateSlide({ ...selectedSlide, notes: e.target.value })}
                  placeholder="Add speaker notes for this slide (not shown during presentation)..."
                  style={{ width: '100%', minHeight: '70px', padding: '10px 12px', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '8px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', color: '#43474e', background: '#fff', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#74777f' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>No slides yet</p>
              <button onClick={() => setShowAddSlide(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#022448', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                <Plus size={14} /> Add First Slide
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
