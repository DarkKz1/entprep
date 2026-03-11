import React from 'react';
import { UNIS } from '../data/universities';
import { CARD_COMPACT, COLORS, SECTION_LABEL, TINT, hoverGlow } from '../constants/styles';
import { useT } from '../locales';
import { useNav } from '../contexts/NavigationContext';
import { GraduationCap, ChevronRight, Calculator, Trophy, Crown, Users, Swords } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface Props {
  isPremium: boolean;
}

export default function HomeNavCards({ isPremium }: Props) {
  const { nav, openPaywall } = useNav();
  const t = useT();

  const socialItems: { id: string; label: string; screen: string; Icon: LucideIcon; color: string; tint: string }[] = [
    { id: 'lb',  label: t.home.leaderboard, screen: 'leaderboard', Icon: Trophy, color: COLORS.green, tint: TINT.green.bg },
    { id: 'fr',  label: t.home.friends,     screen: 'friends',     Icon: Users,  color: COLORS.teal,  tint: TINT.teal.bg },
    { id: 'du',  label: t.home.duel,        screen: 'duel',        Icon: Swords, color: COLORS.red,   tint: TINT.red.bg },
  ];

  return (
    <>
      {/* Full ENT - prominent card */}
      <button
        onClick={() => isPremium ? nav("fullent") : openPaywall('fullent')}
        aria-label={`${t.home.fullEnt} — ${t.home.fullEntDesc}`}
        style={{
          ...CARD_COMPACT,
          display: 'flex', alignItems: 'center', width: '100%',
          borderLeft: `3px solid ${COLORS.teal}`,
          padding: '16px 14px', marginBottom: 20,
          cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.2s',
        }}
        {...hoverGlow(COLORS.teal)}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, background: TINT.teal.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GraduationCap size={22} color={COLORS.teal} />
        </div>
        <div style={{ marginLeft: 12, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.home.fullEnt}
            {!isPremium && <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.accent, background: TINT.accent.bg, padding: '2px 6px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Crown size={10} />{t.home.premium}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.home.fullEntDesc}</div>
        </div>
        <ChevronRight size={18} color={COLORS.teal} />
      </button>

      {/* Social row */}
      <div style={SECTION_LABEL}>{t.home.social}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        {socialItems.map(({ id, label, screen, Icon, color, tint }) => (
          <button key={id} onClick={() => nav(screen)} aria-label={label} style={{
            ...CARD_COMPACT,
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '14px 8px', cursor: 'pointer', textAlign: 'center',
            transition: 'box-shadow 0.2s', gap: 6,
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: tint, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Tools section */}
      <div style={SECTION_LABEL}>{t.home.tools}</div>
      <button onClick={() => nav("calc")} aria-label={t.home.grantCalc} style={{
        ...CARD_COMPACT,
        display: 'flex', alignItems: 'center', width: '100%',
        background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`,
        border: 'none', padding: '14px 14px',
        cursor: 'pointer', textAlign: 'left',
      }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Calculator size={20} color="#fff" />
        </div>
        <div style={{ marginLeft: 12, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.home.grantCalc}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)' }}>{UNIS.length} {t.home.grantCalcDesc}</div>
        </div>
        <ChevronRight size={18} color="#fff" />
      </button>
    </>
  );
}
