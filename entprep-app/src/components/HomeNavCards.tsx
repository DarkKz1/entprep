import React from 'react';
import { UNIS } from '../data/universities';
import { CARD_COMPACT, COLORS } from '../constants/styles';
import { useT } from '../locales';
import { useNav } from '../contexts/NavigationContext';
import { GraduationCap, ChevronRight, Calculator, Trophy, Crown, Users, Swords } from 'lucide-react';

interface Props {
  isPremium: boolean;
}

export default function HomeNavCards({ isPremium }: Props) {
  const { nav } = useNav();
  const t = useT();

  return (
    <>
      {/* Full ENT - prominent card */}
      <button onClick={() => nav("fullent")} aria-label={`${t.home.fullEnt} — ${t.home.fullEntDesc}`} style={{
        ...CARD_COMPACT,
        display: 'flex', alignItems: 'center', width: '100%',
        background: `linear-gradient(135deg, rgba(26,154,140,0.12), rgba(26,154,140,0.06))`,
        border: `1px solid rgba(26,154,140,0.2)`,
        padding: '16px 14px', marginBottom: 20,
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
      }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(26,154,140,0.12)'; }}
         onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: COLORS.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GraduationCap size={22} color="#fff" />
        </div>
        <div style={{ marginLeft: 12, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.home.fullEnt}
            {!isPremium && <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.accent, background: 'rgba(255,107,53,0.12)', padding: '2px 6px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Crown size={10} />{t.home.premium}</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t.home.fullEntDesc}</div>
        </div>
        <ChevronRight size={18} color={COLORS.teal} />
      </button>

      {/* Social row - 3 compact buttons */}
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase' as const, letterSpacing: 1.2,
        marginBottom: 10,
      }}>
        {t.home.social}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
        <button onClick={() => nav("leaderboard")} aria-label={t.home.leaderboard} style={{
          ...CARD_COMPACT,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '14px 8px', cursor: 'pointer', textAlign: 'center',
          transition: 'all 0.2s', gap: 6,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trophy size={18} color={COLORS.green} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{t.home.leaderboard}</span>
        </button>

        <button onClick={() => nav("friends")} aria-label={t.home.friends} style={{
          ...CARD_COMPACT,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '14px 8px', cursor: 'pointer', textAlign: 'center',
          transition: 'all 0.2s', gap: 6,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(26,154,140,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={18} color={COLORS.teal} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{t.home.friends}</span>
        </button>

        <button onClick={() => nav("duel")} aria-label={t.home.duel} style={{
          ...CARD_COMPACT,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '14px 8px', cursor: 'pointer', textAlign: 'center',
          transition: 'all 0.2s', gap: 6,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Swords size={18} color={COLORS.red} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>{t.home.duel}</span>
        </button>
      </div>

      {/* Tools section */}
      <div style={{
        fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
        textTransform: 'uppercase' as const, letterSpacing: 1.2,
        marginBottom: 10,
      }}>
        {t.home.tools}
      </div>
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
