import React, { useState } from 'react';
import { Cloud, Swords, Trophy, Flame } from 'lucide-react';
import { supabase } from '../config/supabase';
import { CARD_HERO, TYPE, COLORS } from '../constants/styles';
import { useT } from '../locales';
import type { LucideIcon } from 'lucide-react';

interface BenefitConfig {
  Icon: LucideIcon;
  color: string;
}

const BENEFIT_CONFIGS: BenefitConfig[] = [
  { Icon: Cloud, color: COLORS.teal },
  { Icon: Swords, color: COLORS.red },
  { Icon: Trophy, color: COLORS.green },
  { Icon: Flame, color: COLORS.amber },
];

interface AuthPromptProps {
  onFinish: () => void;
}

export default function AuthPrompt({ onFinish }: AuthPromptProps) {
  const t = useT();
  const [loading, setLoading] = useState<'google' | 'apple' | null>(null);

  const benefitTexts = [
    t.authPrompt.benefit1,
    t.authPrompt.benefit2,
    t.authPrompt.benefit3,
    t.authPrompt.benefit4,
  ];

  const signInWith = async (provider: 'google' | 'apple') => {
    if (!supabase) return;
    setLoading(provider);
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
    } catch {
      setLoading(null);
    }
  };

  return (
    <div style={{
      padding: '0 20px', minHeight: '100vh',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Unbounded',sans-serif", marginBottom: 40 }}>
          <span style={{ color: COLORS.accent }}>ENT</span><span style={{ color: COLORS.teal }}>prep</span>
        </div>
      </div>

      <div style={{
        ...CARD_HERO, textAlign: 'center', padding: '36px 24px 32px',
        marginBottom: 32, animation: 'screenIn 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <h2 style={{ ...TYPE.h1, fontSize: 22, marginBottom: 6 }}>{t.authPrompt.createAccount}</h2>
        <p style={{ ...TYPE.bodySmall, fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 28px' }}>
          {t.authPrompt.freeAndFast}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left', marginBottom: 28 }}>
          {BENEFIT_CONFIGS.map((cfg, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 11,
                background: `${cfg.color}15`, border: `1px solid ${cfg.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <cfg.Icon size={18} color={cfg.color} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{benefitTexts[i]}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => signInWith('google')}
          disabled={!!loading}
          style={{
            width: '100%', padding: '15px 20px',
            background: '#fff', border: '1px solid #dadce0',
            borderRadius: 14, cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 14, fontWeight: 600, color: '#3c4043',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            transition: 'all 0.2s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.001 24.001 0 000 21.56l7.98-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {loading === 'google' ? t.authPrompt.connecting : t.auth.signInGoogle}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{t.or}</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button
          onClick={() => signInWith('apple')}
          disabled={!!loading}
          style={{
            width: '100%', padding: '15px 20px',
            background: '#000', border: '1px solid #000',
            borderRadius: 14, cursor: loading ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontSize: 14, fontWeight: 600, color: '#fff',
            transition: 'all 0.2s',
            opacity: loading ? 0.7 : 1,
          }}
        >
          <svg width="16" height="18" viewBox="0 0 17 20" fill="#fff">
            <path d="M13.19 10.47c-.03-2.67 2.18-3.95 2.28-4.01-1.24-1.82-3.17-2.07-3.86-2.1-1.64-.17-3.2.97-4.03.97-.84 0-2.13-.94-3.5-.92-1.8.03-3.46 1.05-4.39 2.66-1.87 3.25-.48 8.06 1.34 10.7.89 1.29 1.95 2.74 3.35 2.69 1.34-.05 1.85-.87 3.47-.87 1.62 0 2.08.87 3.5.84 1.45-.02 2.36-1.31 3.24-2.61 1.02-1.5 1.44-2.95 1.47-3.02-.03-.01-2.82-1.08-2.87-4.33zM10.52 2.74c.74-.9 1.24-2.14 1.1-3.39-1.07.04-2.36.71-3.12 1.61-.69.79-1.29 2.07-1.13 3.29 1.19.09 2.4-.61 3.15-1.51z"/>
          </svg>
          {loading === 'apple' ? t.authPrompt.connecting : t.auth.signInApple}
        </button>
      </div>

      <button
        onClick={onFinish}
        style={{
          background: 'none', border: 'none',
          color: 'var(--text-muted)', fontSize: 13,
          cursor: 'pointer', padding: 10,
          alignSelf: 'center', fontWeight: 500,
        }}
      >
        {t.authPrompt.later}
      </button>
    </div>
  );
}
