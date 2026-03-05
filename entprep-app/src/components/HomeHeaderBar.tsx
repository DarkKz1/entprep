import React from 'react';
import { CARD_COMPACT, COLORS } from '../constants/styles';
import { useT } from '../locales';
import { Flame, Snowflake, Zap } from 'lucide-react';

interface Props {
  streak: { current: number; frozenToday?: boolean };
  todayXP: number;
}

export default function HomeHeaderBar({ streak, todayXP }: Props) {
  const t = useT();

  return (
    <div style={{
      ...CARD_COMPACT,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 14px',
      marginBottom: 16,
    }}>
      {/* Left: Streak */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {streak.frozenToday
          ? <Snowflake size={16} color={COLORS.blue} />
          : <Flame size={16} color={streak.current >= 3 ? COLORS.amber : 'var(--text-muted)'} style={streak.current >= 3 ? { animation: 'firePulse 2s ease-in-out infinite' } : undefined} />
        }
        <span style={{
          fontSize: 14, fontWeight: 700,
          fontFamily: "'JetBrains Mono',monospace",
          color: streak.frozenToday ? COLORS.blue : streak.current > 0 ? COLORS.amber : 'var(--text-muted)',
        }}>
          {streak.current}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {streak.frozenToday ? t.home.frozen : t.home.streak}
        </span>
      </div>

      {/* Right: Today XP */}
      {todayXP > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Zap size={13} color={COLORS.green} />
          <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.green }}>
            +{todayXP} {t.xp}
          </span>
        </div>
      )}
    </div>
  );
}
