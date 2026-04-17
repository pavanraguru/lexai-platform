'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/hooks/useAuth';
import Link from 'next/link';
import {
  ChevronLeft, Plus, Play, Sparkles, Trash2,
  Type, AlignLeft, Image, Clock, MessageSquare, Minus,
  ChevronUp, ChevronDown, Save, Loader2, LayoutGrid,
  Bold, PaintBucket, Palette, Maximize2,
} from 'lucide-react';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type SlideType = 'title' | 'text' | 'evidence' | 'timeline' | 'arguments' | 'qa' | 'blank' | 'section';

interface SlideStyle {
  bgColor?: string;
  textColor?: string;
  accentColor?: string;
  titleSize?: number;    // rem
  bodySize?: number;     // px
  fontFamily?: 'serif' | 'sans';
  layout?: 'default' | 'centered' | 'split';
}

interface Slide {
  id: string;
  type: SlideType;
  title?: string;
  content?: string;
  bullets?: string[];
  notes?: string;
  exhibit_number?: string;
  style?: SlideStyle;
}

// ── Default theme per slide type ──────────────────────────────
const TYPE_DEFAULTS: Record<SlideType, { bg: string; text: string; accent: string }> = {
  title:     { bg: '#022448', text: '#ffffff', accent: '#ffe088' },
  section:   { bg: '#1e3a5f', text: '#ffffff', accent: '#93c5fd' },
  text:      { bg: '#ffffff', text: '#191c1e', accent: '#022448' },
  arguments: { bg: '#ffffff', text: '#191c1e', accent: '#5b21b6' },
  evidence:  { bg: '#f8fafc', text: '#191c1e', accent: '#022448' },
  timeline:  { bg: '#ffffff', text: '#191c1e', accent: '#15803d' },
  qa:        { bg: '#ffffff', text: '#191c1e', accent: '#c2410c' },
  blank:     { bg: '#ffffff', text: '#191c1e', accent: '#74777f' },
};

function getColors(slide: Slide) {
  const d = TYPE_DEFAULTS[slide.type];
  return {
    bg:     slide.style?.bgColor     || d.bg,
    text:   slide.style?.textColor   || d.text,
    accent: slide.style?.accentColor || d.accent,
  };
}

const SLIDE_TYPES: { type: SlideType; Icon: any; label: string }[] = [
  { type: 'title',     Icon: Type,          label: 'Title'     },
  { type: 'section',  Icon: LayoutGrid,    label: 'Section'   },
  { type: 'text',     Icon: AlignLeft,     label: 'Text'      },
  { type: 'arguments',Icon: Bold,          label: 'Arguments' },
  { type: 'evidence', Icon: Image,         label: 'Evidence'  },
  { type: 'timeline', Icon: Clock,         label: 'Timeline'  },
  { type: 'qa',       Icon: MessageSquare, label: 'Q & A'     },
  { type: 'blank',    Icon: Minus,         label: 'Blank'     },
];

// ── BG palette ────────────────────────────────────────────────
const BG_PALETTE = [
  { label: 'Navy',      value: '#022448' },
  { label: 'Dark Blue', value: '#1e3a5f' },
  { label: 'Black',     value: '#0f172a' },
  { label: 'Charcoal',  value: '#374151' },
  { label: 'White',     value: '#ffffff' },
  { label: 'Off-White', value: '#f8fafc' },
  { label: 'Cream',     value: '#fefce8' },
  { label: 'Light Blue',value: '#eff6ff' },
  { label: 'Purple',    value: '#3b0764' },
  { label: 'Green',     value: '#052e16' },
  { label: 'Maroon',    value: '#450a0a' },
  { label: 'Gold',      value: '#713f12' },
];

// ── Text colour palette ───────────────────────────────────────
const TEXT_PALETTE = [
  { label: 'White',       value: '#ffffff' },
  { label: 'Off-White',   value: '#f1f5f9' },
  { label: 'Gold',        value: '#ffe088' },
  { label: 'Light Blue',  value: '#93c5fd' },
  { label: 'Black',       value: '#0f172a' },
  { label: 'Dark',        value: '#191c1e' },
  { label: 'Grey',        value: '#6b7280' },
];

// ── Accent palette ────────────────────────────────────────────
const ACCENT_PALETTE = [
  { label: 'Gold',        value: '#ffe088' },
  { label: 'Blue',        value: '#3b82f6' },
  { label: 'Navy',        value: '#022448' },
  { label: 'Purple',      value: '#7c3aed' },
  { label: 'Green',       value: '#16a34a' },
  { label: 'Orange',      value: '#ea580c' },
  { label: 'Red',         value: '#dc2626' },
  { label: 'Teal',        value: '#0d9488' },
];

// ═══════════════════════════════════════════════════════════════
// FORMATTING TOOLBAR — shown above the canvas for selected slide
// ═══════════════════════════════════════════════════════════════
function FormattingToolbar({ slide, onChange }: { slide: Slide; onChange: (s: Slide) => void }) {
  const [openPicker, setOpenPicker] = useState<'bg' | 'text' | 'accent' | null>(null);
  const colors = getColors(slide);
  const style = slide.style || {};

  const updateStyle = (patch: Partial<SlideStyle>) => {
    onChange({ ...slide, style: { ...style, ...patch } });
  };

  const toggle = (key: 'bg' | 'text' | 'accent') =>
    setOpenPicker(p => p === key ? null : key);

  const ColorSwatch = ({ color }: { color: string }) => (
    <div style={{
      width: '20px', height: '20px', borderRadius: '4px',
      background: color, border: '2px solid rgba(0,0,0,0.15)',
      flexShrink: 0,
    }} />
  );

  const PickerDrop = ({
    palette, current, onSelect, label,
  }: { palette: { label: string; value: string }[]; current: string; onSelect: (v: string) => void; label: string }) => (
    <div style={{
      position: 'absolute', top: '38px', left: 0, zIndex: 200,
      background: '#fff', borderRadius: '10px', padding: '12px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '1px solid rgba(196,198,207,0.3)',
      minWidth: '180px',
    }}>
      <p style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em', margin: '0 0 8px' }}>{label}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {palette.map(c => (
          <button
            key={c.value}
            onClick={() => { onSelect(c.value); setOpenPicker(null); }}
            title={c.label}
            style={{
              width: '32px', height: '32px', borderRadius: '6px', border: current === c.value ? '3px solid #022448' : '1.5px solid rgba(0,0,0,0.12)',
              background: c.value, cursor: 'pointer', transition: 'transform 0.1s',
            }}
          />
        ))}
      </div>
      {/* Custom hex input */}
      <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '11px', color: '#74777f', whiteSpace: 'nowrap' }}>Custom:</span>
        <input
          type="color"
          value={current}
          onChange={e => onSelect(e.target.value)}
          style={{ width: '36px', height: '28px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '4px', cursor: 'pointer', padding: '2px' }}
        />
        <input
          value={current}
          onChange={e => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && onSelect(e.target.value)}
          style={{ fontSize: '11px', fontFamily: 'monospace', padding: '4px 6px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '4px', width: '72px', outline: 'none' }}
        />
      </div>
    </div>
  );

  return (
    <div style={{
      background: '#fff', border: '1px solid rgba(196,198,207,0.25)',
      borderRadius: '10px', padding: '8px 12px',
      display: 'flex', alignItems: 'center', gap: '4px',
      flexWrap: 'wrap', boxShadow: '0 2px 8px rgba(2,36,72,0.06)',
      marginBottom: '12px', width: '100%', maxWidth: '800px', boxSizing: 'border-box',
    }}>

      {/* Background */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => toggle('bg')}
          title="Background colour"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(196,198,207,0.4)', background: openPicker === 'bg' ? '#f0f4ff' : '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#022448', fontFamily: 'Manrope, sans-serif' }}>
          <PaintBucket size={13} />
          <ColorSwatch color={colors.bg} />
          <span style={{ fontSize: '10px' }}>BG</span>
        </button>
        {openPicker === 'bg' && <PickerDrop palette={BG_PALETTE} current={colors.bg} onSelect={v => updateStyle({ bgColor: v })} label="BACKGROUND COLOUR" />}
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(196,198,207,0.4)' }} />

      {/* Text colour */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => toggle('text')}
          title="Text colour"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(196,198,207,0.4)', background: openPicker === 'text' ? '#f0f4ff' : '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#022448', fontFamily: 'Manrope, sans-serif' }}>
          <Type size={13} />
          <ColorSwatch color={colors.text} />
          <span style={{ fontSize: '10px' }}>Text</span>
        </button>
        {openPicker === 'text' && <PickerDrop palette={TEXT_PALETTE} current={colors.text} onSelect={v => updateStyle({ textColor: v })} label="TEXT COLOUR" />}
      </div>

      {/* Accent colour */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => toggle('accent')}
          title="Accent colour"
          style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(196,198,207,0.4)', background: openPicker === 'accent' ? '#f0f4ff' : '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#022448', fontFamily: 'Manrope, sans-serif' }}>
          <Palette size={13} />
          <ColorSwatch color={colors.accent} />
          <span style={{ fontSize: '10px' }}>Accent</span>
        </button>
        {openPicker === 'accent' && <PickerDrop palette={ACCENT_PALETTE} current={colors.accent} onSelect={v => updateStyle({ accentColor: v })} label="ACCENT COLOUR" />}
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(196,198,207,0.4)' }} />

      {/* Title size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '10px', color: '#74777f', fontWeight: 600 }}>Title</span>
        <select
          value={style.titleSize || 2}
          onChange={e => updateStyle({ titleSize: Number(e.target.value) })}
          style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '5px', outline: 'none', background: '#fff', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
          {[1.2, 1.4, 1.6, 1.8, 2.0, 2.4, 2.8, 3.2].map(s => (
            <option key={s} value={s}>{s}rem</option>
          ))}
        </select>
      </div>

      {/* Body size */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontSize: '10px', color: '#74777f', fontWeight: 600 }}>Body</span>
        <select
          value={style.bodySize || 14}
          onChange={e => updateStyle({ bodySize: Number(e.target.value) })}
          style={{ fontSize: '11px', padding: '4px 6px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '5px', outline: 'none', background: '#fff', cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
          {[11, 12, 13, 14, 15, 16, 18, 20].map(s => (
            <option key={s} value={s}>{s}px</option>
          ))}
        </select>
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(196,198,207,0.4)' }} />

      {/* Font family */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {[
          { key: 'serif', label: 'Serif' },
          { key: 'sans',  label: 'Sans' },
        ].map(f => (
          <button key={f.key} onClick={() => updateStyle({ fontFamily: f.key as 'serif' | 'sans' })}
            style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid', fontSize: '11px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif',
              borderColor: (style.fontFamily || 'serif') === f.key ? '#022448' : 'rgba(196,198,207,0.4)',
              background: (style.fontFamily || 'serif') === f.key ? '#022448' : '#fff',
              color: (style.fontFamily || 'serif') === f.key ? '#fff' : '#43474e',
              fontWeight: (style.fontFamily || 'serif') === f.key ? 700 : 400,
            }}>{f.label}</button>
        ))}
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(196,198,207,0.4)' }} />

      {/* Layout */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {(['default', 'centered'] as const).map(l => (
          <button key={l} onClick={() => updateStyle({ layout: l })}
            style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid', fontSize: '11px', cursor: 'pointer', fontFamily: 'Manrope, sans-serif',
              borderColor: (style.layout || 'default') === l ? '#022448' : 'rgba(196,198,207,0.4)',
              background: (style.layout || 'default') === l ? '#022448' : '#fff',
              color: (style.layout || 'default') === l ? '#fff' : '#43474e',
              fontWeight: 400, textTransform: 'capitalize',
            }}>{l === 'default' ? '⬛ Left' : '⊞ Center'}</button>
        ))}
      </div>

      <div style={{ width: '1px', height: '24px', background: 'rgba(196,198,207,0.4)' }} />

      {/* Reset to type defaults */}
      <button
        onClick={() => onChange({ ...slide, style: {} })}
        style={{ padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(196,198,207,0.4)', fontSize: '11px', cursor: 'pointer', background: '#fff', color: '#74777f', fontFamily: 'Manrope, sans-serif' }}
        title="Reset to default theme">
        ↺ Reset
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SLIDE CANVAS
// ═══════════════════════════════════════════════════════════════
function SlideCanvas({ slide, onChange }: { slide: Slide; onChange: (updated: Slide) => void }) {
  const colors = getColors(slide);
  const st = slide.style || {};
  const titleFont  = st.fontFamily === 'sans' ? 'Manrope, sans-serif' : 'Newsreader, serif';
  const bodyFont   = 'Manrope, sans-serif';
  const titleSize  = `${st.titleSize || (slide.type === 'title' ? 2 : 1.4)}rem`;
  const bodySize   = `${st.bodySize || 14}px`;
  const isCenter   = st.layout === 'centered' || slide.type === 'title' || slide.type === 'section';

  const addBullet = () => {
    const bullets = [...(slide.bullets || []), 'New point'];
    onChange({ ...slide, bullets });
  };
  const updateBullet = (i: number, val: string) => {
    const bullets = [...(slide.bullets || [])]; bullets[i] = val;
    onChange({ ...slide, bullets });
  };
  const removeBullet = (i: number) => {
    onChange({ ...slide, bullets: (slide.bullets || []).filter((_, idx) => idx !== i) });
  };

  const inputBase = {
    background: 'transparent', border: 'none', outline: 'none',
    color: colors.text, fontFamily: bodyFont, width: '100%',
  };

  return (
    <div style={{
      width: '100%', aspectRatio: '16/9',
      background: colors.bg,
      borderRadius: '12px',
      border: '1px solid rgba(196,198,207,0.15)',
      boxShadow: '0 8px 32px rgba(2,36,72,0.12)',
      display: 'flex', flexDirection: 'column',
      padding: isCenter ? '0' : '40px 48px',
      justifyContent: isCenter ? 'center' : 'flex-start',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative bg circles for title/section */}
      {(slide.type === 'title' || slide.type === 'section') && (
        <>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', borderRadius: '50%', background: `${colors.accent}18`, transform: 'translate(100px, -150px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '200px', height: '200px', borderRadius: '50%', background: `${colors.accent}10`, transform: 'translate(-100px, 100px)', pointerEvents: 'none' }} />
        </>
      )}

      {/* ── TITLE slide ──────────────────────────── */}
      {slide.type === 'title' && (
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '0 48px' }}>
          <div style={{ width: '48px', height: '3px', background: colors.accent, borderRadius: '2px', margin: '0 auto 20px' }} />
          <input
            value={slide.title || ''}
            onChange={e => onChange({ ...slide, title: e.target.value })}
            placeholder="Case Title"
            style={{ ...inputBase, fontFamily: titleFont, fontWeight: 700, fontSize: titleSize, textAlign: 'center', marginBottom: '12px', color: colors.text }}
          />
          <input
            value={slide.content || ''}
            onChange={e => onChange({ ...slide, content: e.target.value })}
            placeholder="Court  •  Case Type  •  CNR  •  Judge"
            style={{ ...inputBase, fontFamily: bodyFont, fontSize: bodySize, textAlign: 'center', color: colors.text, opacity: 0.85 }}
          />
        </div>
      )}

      {/* ── SECTION slide ────────────────────────── */}
      {slide.type === 'section' && (
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '40px' }}>
          <input
            value={slide.title || ''}
            onChange={e => onChange({ ...slide, title: e.target.value })}
            placeholder="Section Title"
            style={{ ...inputBase, fontFamily: titleFont, fontWeight: 700, fontSize: titleSize, textAlign: 'center', color: colors.accent }}
          />
        </div>
      )}

      {/* ── TEXT / ARGUMENTS slide ───────────────── */}
      {(slide.type === 'text' || slide.type === 'arguments') && (
        <>
          <input
            value={slide.title || ''}
            onChange={e => onChange({ ...slide, title: e.target.value })}
            placeholder="Slide Title"
            style={{ ...inputBase, fontFamily: titleFont, fontWeight: 700, fontSize: titleSize, color: colors.accent, borderBottom: `2px solid ${colors.accent}`, marginBottom: '20px', paddingBottom: '8px', textAlign: isCenter ? 'center' : 'left' }}
          />
          <div style={{ flex: 1, textAlign: isCenter ? 'center' : 'left' }}>
            {(slide.bullets || []).map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: colors.accent, flexShrink: 0, marginTop: '9px' }} />
                <input
                  value={b}
                  onChange={e => updateBullet(i, e.target.value)}
                  style={{ ...inputBase, flex: 1, fontSize: bodySize, lineHeight: 1.6 }}
                />
                <button onClick={() => removeBullet(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text, opacity: 0.4, fontSize: '16px' }}>×</button>
              </div>
            ))}
            <button onClick={addBullet} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: `1px dashed ${colors.accent}60`, borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', color: colors.accent, marginTop: '6px', fontFamily: bodyFont }}>
              <Plus size={12} /> Add bullet
            </button>
          </div>
        </>
      )}

      {/* ── Q & A slide ──────────────────────────── */}
      {slide.type === 'qa' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: colors.bg, fontWeight: 800, fontSize: '14px' }}>Q</span>
            </div>
            <input
              value={slide.title || ''}
              onChange={e => onChange({ ...slide, title: e.target.value })}
              placeholder="Anticipated Bench Question"
              style={{ ...inputBase, fontFamily: titleFont, fontWeight: 700, fontSize: titleSize, color: colors.accent, borderBottom: `2px solid ${colors.accent}`, flex: 1, paddingBottom: '4px' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: colors.text, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: colors.bg, fontWeight: 800, fontSize: '14px' }}>A</span>
            </div>
            <textarea
              value={slide.content || ''}
              onChange={e => onChange({ ...slide, content: e.target.value })}
              placeholder="Suggested answer / response..."
              style={{ ...inputBase, flex: 1, fontSize: bodySize, lineHeight: 1.7, resize: 'none', minHeight: '80px' }}
            />
          </div>
          {/* Extra Q&A pairs as bullets */}
          {(slide.bullets || []).length > 0 && (
            <div style={{ marginTop: '16px', borderTop: `1px solid ${colors.accent}30`, paddingTop: '12px' }}>
              {(slide.bullets || []).map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', color: colors.accent, fontWeight: 800, flexShrink: 0, paddingTop: '2px' }}>Q{i + 2}:</span>
                  <input value={b} onChange={e => updateBullet(i, e.target.value)}
                    style={{ ...inputBase, flex: 1, fontSize: bodySize }} />
                  <button onClick={() => removeBullet(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text, opacity: 0.4 }}>×</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={addBullet} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'none', border: `1px dashed ${colors.accent}60`, borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', color: colors.accent, marginTop: '10px', fontFamily: bodyFont }}>
            <Plus size={12} /> Add Q&A pair
          </button>
        </>
      )}

      {/* ── EVIDENCE slide ───────────────────────── */}
      {slide.type === 'evidence' && (
        <>
          <input
            value={slide.title || ''}
            onChange={e => onChange({ ...slide, title: e.target.value })}
            placeholder="Evidence Exhibit Title"
            style={{ ...inputBase, fontFamily: titleFont, fontWeight: 700, fontSize: titleSize, color: colors.accent, borderBottom: `2px solid ${colors.accent}`, marginBottom: '16px', paddingBottom: '8px' }}
          />
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            {slide.exhibit_number && (
              <div style={{ background: colors.accent, color: colors.bg, padding: '8px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 800, flexShrink: 0, fontFamily: 'monospace' }}>
                {slide.exhibit_number}
              </div>
            )}
            <textarea
              value={slide.content || ''}
              onChange={e => onChange({ ...slide, content: e.target.value })}
              placeholder="Describe the evidence and what it establishes..."
              style={{ background: `${colors.accent}12`, border: `1px solid ${colors.accent}25`, borderRadius: '8px', flex: 1, fontSize: bodySize, color: colors.text, fontFamily: bodyFont, lineHeight: 1.7, resize: 'none', minHeight: '100px', padding: '12px', outline: 'none' }}
            />
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '10px', fontWeight: 700, color: colors.text, opacity: 0.6 }}>EXHIBIT NO.</label>
            <input
              value={slide.exhibit_number || ''}
              onChange={e => onChange({ ...slide, exhibit_number: e.target.value })}
              placeholder="e.g. E-1"
              style={{ border: `1px solid ${colors.accent}40`, borderRadius: '5px', padding: '5px 8px', fontSize: '12px', fontFamily: 'monospace', width: '100px', outline: 'none', background: 'transparent', color: colors.text }}
            />
          </div>
        </>
      )}

      {/* ── TIMELINE slide ───────────────────────── */}
      {slide.type === 'timeline' && (
        <>
          <input
            value={slide.title || ''}
            onChange={e => onChange({ ...slide, title: e.target.value })}
            placeholder="Timeline Title"
            style={{ ...inputBase, fontFamily: titleFont, fontWeight: 700, fontSize: titleSize, color: colors.accent, borderBottom: `2px solid ${colors.accent}`, marginBottom: '20px', paddingBottom: '8px' }}
          />
          {(slide.bullets || []).map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: colors.accent }} />
                {i < (slide.bullets || []).length - 1 && <div style={{ width: '2px', flex: 1, background: `${colors.accent}30`, minHeight: '20px', marginTop: '2px' }} />}
              </div>
              <input value={b} onChange={e => updateBullet(i, e.target.value)}
                style={{ ...inputBase, flex: 1, fontSize: bodySize }} />
              <button onClick={() => removeBullet(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text, opacity: 0.4 }}>×</button>
            </div>
          ))}
          <button onClick={addBullet} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: `1px dashed ${colors.accent}50`, borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '12px', color: colors.accent, fontFamily: bodyFont }}>
            <Plus size={12} /> Add event
          </button>
        </>
      )}

      {/* ── BLANK slide ──────────────────────────── */}
      {slide.type === 'blank' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
          <p style={{ fontSize: '13px', color: colors.text, fontFamily: bodyFont }}>Blank slide — add your content</p>
        </div>
      )}
    </div>
  );
}

// ── Slide thumbnail ────────────────────────────────────────────
function SlideThumb({ slide, isSelected, onClick, index }: { slide: Slide; isSelected: boolean; onClick: () => void; index: number }) {
  const colors = getColors(slide);
  return (
    <div onClick={onClick} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '7px', borderRadius: '8px', cursor: 'pointer', background: isSelected ? 'rgba(2,36,72,0.06)' : 'transparent', border: `1.5px solid ${isSelected ? 'rgba(2,36,72,0.18)' : 'transparent'}`, transition: 'all 0.1s' }}>
      <span style={{ fontSize: '9px', color: '#74777f', fontWeight: 600, width: '14px', flexShrink: 0, paddingTop: '3px' }}>{index + 1}</span>
      <div style={{ width: '88px', height: '50px', borderRadius: '4px', flexShrink: 0, background: colors.bg, border: '1px solid rgba(196,198,207,0.2)', padding: '5px', overflow: 'hidden', position: 'relative' }}>
        {(slide.type === 'title' || slide.type === 'section') ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '3px' }}>
            <div style={{ height: '2px', width: '30%', background: colors.accent, borderRadius: '1px' }} />
            <div style={{ height: '5px', width: '70%', background: colors.text, opacity: 0.8, borderRadius: '1px' }} />
            {slide.type === 'title' && <div style={{ height: '2px', width: '50%', background: colors.text, opacity: 0.4, borderRadius: '1px' }} />}
          </div>
        ) : (
          <>
            <div style={{ height: '3px', width: '50%', background: colors.accent, opacity: 0.8, borderRadius: '1px', marginBottom: '3px' }} />
            {[70, 80, 55].map((w, i) => <div key={i} style={{ height: '2px', background: colors.text, opacity: 0.25, width: `${w}%`, borderRadius: '1px', marginBottom: '2px' }} />)}
          </>
        )}
        <div style={{ position: 'absolute', bottom: '2px', right: '3px', fontSize: '6px', fontWeight: 800, color: colors.accent, opacity: 0.7, textTransform: 'uppercase' }}>{slide.type.slice(0, 3)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '11px', fontWeight: 600, color: '#191c1e', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{slide.title || `(${slide.type})`}</p>
        <p style={{ fontSize: '9px', color: '#74777f', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{slide.type}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════
export default function PresentationBuilderPage() {
  const { id } = useParams();
  const { token } = useAuthStore();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [showAddSlide, setShowAddSlide] = useState(false);
  const [title, setTitle] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [genPerspective, setGenPerspective] = useState('defence');
  const [genFocus, setGenFocus] = useState('arguments');
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
  const selectedSlide = slides[selectedIndex];

  const save = async (s = slides) => {
    setSaving(true);
    try {
      await fetch(`${BASE}/v1/presentations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slides: s, title }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  };

  const updateSlide = useCallback((updated: Slide) => {
    setSlides(prev => prev.map(s => s.id === updated.id ? updated : s));
  }, []);

  const addSlide = (type: SlideType) => {
    const newSlide: Slide = {
      id: crypto.randomUUID(), type,
      title: '', notes: '', style: {},
      bullets: ['text', 'arguments', 'timeline', 'qa'].includes(type) ? [''] : undefined,
    };
    const next = [...slides, newSlide];
    setSlides(next);
    setSelectedIndex(next.length - 1);
    setShowAddSlide(false);
  };

  const removeSlide = (i: number) => {
    if (slides.length <= 1) return;
    const next = slides.filter((_, idx) => idx !== i);
    setSlides(next);
    setSelectedIndex(Math.max(0, i - 1));
  };

  const moveSlide = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    setSlides(next);
    setSelectedIndex(j);
  };

  const generateWithAI = async () => {
    setGenerating(true); setShowGenPanel(false); setGenError('');
    try {
      const res = await fetch(`${BASE}/v1/presentations/${id}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ perspective: genPerspective, focus: genFocus }),
      });
      const json = await res.json();
      if (json.data?.slides) {
        setSlides(json.data.slides);
        setSelectedIndex(0);
        if (json.meta?.source === 'template') setGenError('Template generated — run AI agents on this case for richer AI content.');
      } else {
        setGenError(json.error?.message || 'Generation failed. Please try again.');
      }
    } catch { setGenError('Network error. Please try again.'); }
    setGenerating(false);
  };

  if (isLoading) return <div style={{ padding: '32px', fontFamily: 'Manrope, sans-serif', color: '#74777f' }}>Loading presentation...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Manrope, sans-serif', background: '#f4f5f7' }}>

      {/* ── Topbar ─────────────────────────────── */}
      <div style={{ background: '#fff', borderBottom: '1px solid rgba(196,198,207,0.2)', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '10px', height: '52px', flexShrink: 0, zIndex: 10 }}>
        <Link href={`/cases/${pres?.case_id}`} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#74777f', textDecoration: 'none', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
          <ChevronLeft size={15} /> Back
        </Link>
        <div style={{ width: '1px', height: '20px', background: 'rgba(196,198,207,0.4)' }} />

        {editingTitle ? (
          <input value={title} onChange={e => setTitle(e.target.value)}
            onBlur={() => setEditingTitle(false)} onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)} autoFocus
            style={{ fontSize: '13px', fontWeight: 700, color: '#022448', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '5px', padding: '3px 8px', outline: 'none', minWidth: '180px', fontFamily: 'Manrope, sans-serif' }} />
        ) : (
          <span onClick={() => setEditingTitle(true)} style={{ fontSize: '13px', fontWeight: 700, color: '#022448', cursor: 'text', padding: '3px 6px', borderRadius: '4px', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title || 'Untitled Presentation'}
          </span>
        )}

        <span style={{ fontSize: '11px', color: '#74777f', flexShrink: 0 }}>{slides.length} slides</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' }}>
          {genError && (
            <div style={{ fontSize: '11px', color: genError.startsWith('Template') ? '#854d0e' : '#b91c1c', background: genError.startsWith('Template') ? '#fef9c3' : '#fde8e8', padding: '4px 10px', borderRadius: '6px', maxWidth: '220px', lineHeight: 1.3 }}>
              {genError}
            </div>
          )}

          {/* AI Generate */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowGenPanel(!showGenPanel)} disabled={generating}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: generating ? '#edeef0' : '#5b21b6', color: generating ? '#74777f' : '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer', fontFamily: 'Manrope, sans-serif' }}>
              {generating ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : <><Sparkles size={13} /> AI Generate</>}
            </button>
            {showGenPanel && (
              <div style={{ position: 'absolute', top: '44px', right: 0, background: '#fff', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '12px', padding: '16px', width: '260px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 200 }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#43474e', letterSpacing: '0.06em', margin: '0 0 8px' }}>PERSPECTIVE</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                  {['defence', 'prosecution', 'petitioner', 'respondent'].map(p => (
                    <button key={p} onClick={() => setGenPerspective(p)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid', borderColor: genPerspective === p ? '#022448' : 'rgba(196,198,207,0.4)', background: genPerspective === p ? '#022448' : '#fff', color: genPerspective === p ? '#fff' : '#43474e', fontWeight: genPerspective === p ? 700 : 400, fontSize: '12px', cursor: 'pointer', textTransform: 'capitalize', fontFamily: 'Manrope, sans-serif' }}>{p}</button>
                  ))}
                </div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#43474e', letterSpacing: '0.06em', margin: '0 0 8px' }}>FOCUS AREA</p>
                {[{ key: 'arguments', label: '⚖️ Arguments on Merits' }, { key: 'bail', label: '🔓 Bail Application' }, { key: 'evidence', label: '📄 Evidence Summary' }, { key: 'hearing', label: '📋 Hearing Submissions' }].map(f => (
                  <button key={f.key} onClick={() => setGenFocus(f.key)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', background: genFocus === f.key ? '#ede9fe' : 'transparent', color: genFocus === f.key ? '#5b21b6' : '#43474e', fontWeight: genFocus === f.key ? 700 : 400, marginBottom: '2px', fontFamily: 'Manrope, sans-serif' }}>{f.label}</button>
                ))}
                <button onClick={generateWithAI} style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', justifyContent: 'center', padding: '9px', background: '#5b21b6', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '12px', fontFamily: 'Manrope, sans-serif' }}>
                  <Sparkles size={12} /> Generate {slides.length > 0 ? '(replace all)' : 'Deck'}
                </button>
              </div>
            )}
          </div>

          <button onClick={() => save()} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: saved ? '#dcfce7' : '#022448', color: saved ? '#15803d' : '#fff', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
            {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={13} />}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
          </button>

          <Link href={`/presentations/${id}/present`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: '#ffe088', color: '#745c00', borderRadius: '7px', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}>
            <Play size={13} /> Present
          </Link>
        </div>
      </div>

      {/* ── Main area ──────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Slide panel */}
        <div style={{ width: '200px', background: '#fff', borderRight: '1px solid rgba(196,198,207,0.2)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 8px 8px', borderBottom: '1px solid rgba(196,198,207,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#74777f', letterSpacing: '0.08em' }}>SLIDES</span>
            <button onClick={() => setShowAddSlide(!showAddSlide)} style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'none', border: '1px solid rgba(2,36,72,0.15)', borderRadius: '5px', padding: '3px 6px', cursor: 'pointer', fontSize: '11px', color: '#022448', fontWeight: 700, fontFamily: 'Manrope, sans-serif' }}>
              <Plus size={11} /> Add
            </button>
          </div>
          {showAddSlide && (
            <div style={{ padding: '8px', borderBottom: '1px solid rgba(196,198,207,0.1)', background: '#f8fafc' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {SLIDE_TYPES.map(({ type, Icon, label }) => (
                  <button key={type} onClick={() => addSlide(type)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '7px 4px', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '10px', fontWeight: 600, color: '#43474e', fontFamily: 'Manrope, sans-serif' }}>
                    <Icon size={13} color="#022448" />{label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
            {slides.map((slide, i) => (
              <SlideThumb key={slide.id} slide={slide} index={i} isSelected={i === selectedIndex} onClick={() => setSelectedIndex(i)} />
            ))}
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {selectedSlide ? (
            <>
              {/* Formatting toolbar */}
              <FormattingToolbar slide={selectedSlide} onChange={updateSlide} />

              {/* Slide canvas */}
              <div style={{ width: '100%', maxWidth: '800px' }}>
                <SlideCanvas slide={selectedSlide} onChange={updateSlide} />
              </div>

              {/* Slide controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px' }}>
                <button onClick={() => moveSlide(selectedIndex, -1)} disabled={selectedIndex === 0}
                  style={{ display: 'flex', padding: '6px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', background: '#fff', cursor: 'pointer', opacity: selectedIndex === 0 ? 0.4 : 1 }}>
                  <ChevronUp size={14} color="#022448" />
                </button>
                <button onClick={() => moveSlide(selectedIndex, 1)} disabled={selectedIndex === slides.length - 1}
                  style={{ display: 'flex', padding: '6px', border: '1px solid rgba(196,198,207,0.4)', borderRadius: '6px', background: '#fff', cursor: 'pointer', opacity: selectedIndex === slides.length - 1 ? 0.4 : 1 }}>
                  <ChevronDown size={14} color="#022448" />
                </button>
                <span style={{ fontSize: '12px', color: '#74777f', padding: '0 6px' }}>Slide {selectedIndex + 1} of {slides.length}</span>
                <button onClick={() => removeSlide(selectedIndex)} disabled={slides.length <= 1}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px', border: '1px solid rgba(186,26,26,0.2)', borderRadius: '6px', background: '#fff', cursor: 'pointer', fontSize: '11px', color: '#ba1a1a', fontWeight: 600, opacity: slides.length <= 1 ? 0.4 : 1, fontFamily: 'Manrope, sans-serif' }}>
                  <Trash2 size={12} /> Remove
                </button>
              </div>

              {/* Speaker notes */}
              <div style={{ width: '100%', maxWidth: '800px', marginTop: '12px' }}>
                <label style={{ fontSize: '10px', fontWeight: 700, color: '#74777f', letterSpacing: '0.06em', display: 'block', marginBottom: '5px' }}>SPEAKER NOTES</label>
                <textarea
                  value={selectedSlide.notes || ''}
                  onChange={e => updateSlide({ ...selectedSlide, notes: e.target.value })}
                  placeholder="Speaker notes (not shown during presentation)..."
                  style={{ width: '100%', minHeight: '64px', padding: '10px 12px', border: '1px solid rgba(196,198,207,0.3)', borderRadius: '8px', fontSize: '13px', fontFamily: 'Manrope, sans-serif', color: '#43474e', background: '#fff', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: '#74777f' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>No slides yet</p>
              <button onClick={() => setShowAddSlide(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: '#022448', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Manrope, sans-serif' }}>
                <Plus size={14} /> Add First Slide
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
