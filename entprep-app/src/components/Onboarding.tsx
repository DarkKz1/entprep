import React, { useState } from 'react';
import { BookOpen, Brain, Trophy, ChevronRight, ChevronLeft } from 'lucide-react';
import { CARD_HERO, TYPE, COLORS } from '../constants/styles';
import { useT } from '../locales';
import type { LucideIcon } from 'lucide-react';

interface SlideConfig {
  Icon: LucideIcon;
  color: string;
}

const SLIDE_CONFIGS: SlideConfig[] = [
  { Icon: BookOpen, color: COLORS.teal },
  { Icon: Brain, color: COLORS.teal },
  { Icon: Trophy, color: COLORS.accent },
];

interface OnboardingProps {
  onFinish: () => void;
}

export default function Onboarding({ onFinish }: OnboardingProps) {
  const t = useT();
  const [idx, setIdx] = useState(0);
  const cfg = SLIDE_CONFIGS[idx];
  const isLast = idx === SLIDE_CONFIGS.length - 1;

  const titles = [t.onboarding.slide1Title, t.onboarding.slide2Title, t.onboarding.slide3Title];
  const descs = [t.onboarding.slide1Desc, t.onboarding.slide2Desc, t.onboarding.slide3Desc];

  return (
    <div style={{ padding: '0 20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Unbounded',sans-serif", marginBottom: 40 }}>
          <span style={{ color: COLORS.accent }}>ENT</span><span style={{ color: COLORS.teal }}>prep</span>
        </div>
      </div>

      <div key={idx} style={{ ...CARD_HERO, textAlign: 'center', padding: '40px 24px', marginBottom: 32, animation: 'screenIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: '0 auto 24px',
          background: `${cfg.color}18`,
          border: `2px solid ${cfg.color}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <cfg.Icon size={38} color={cfg.color} strokeWidth={1.8} />
        </div>
        <h2 style={{ ...TYPE.h1, fontSize: 22, marginBottom: 12 }}>{titles[idx]}</h2>
        <p style={{ ...TYPE.bodySmall, fontSize: 13, maxWidth: 280, margin: '0 auto', lineHeight: 1.6 }}>{descs[idx]}</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
        {SLIDE_CONFIGS.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 24 : 8, height: 8, borderRadius: 4,
            background: i === idx ? cfg.color : 'var(--border-strong)',
            transition: 'all 0.3s',
          }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {idx > 0 && (
          <button onClick={() => setIdx(idx - 1)} aria-label={t.back} style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--bg-subtle-2)', border: '1px solid var(--border-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}>
            <ChevronLeft size={20} color="var(--text-secondary)" />
          </button>
        )}
        <button onClick={() => isLast ? onFinish() : setIdx(idx + 1)} aria-label={isLast ? t.onboarding.startPrep : t.onboarding.nextSlide} style={{
          flex: 1, padding: '15px 20px',
          background: isLast ? `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})` : 'var(--bg-subtle-2)',
          border: isLast ? 'none' : '1px solid var(--border-md)',
          borderRadius: 14, color: isLast ? '#fff' : 'var(--text)', fontSize: 15, fontWeight: 700,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: isLast ? '0 4px 20px rgba(255,107,53,0.3)' : 'none',
          transition: 'all 0.3s',
        }}>
          {isLast ? t.onboarding.start : t.next}
          <ChevronRight size={18} />
        </button>
      </div>

      <button onClick={onFinish} style={{
        background: 'none', border: 'none', color: 'var(--text-muted)',
        fontSize: 12, cursor: 'pointer', marginTop: 20, padding: 8,
        alignSelf: 'center',
      }}>
        {t.skip}
      </button>
    </div>
  );
}
