import React from 'react';
import { COLORS } from '../../constants/styles';

type ChipColor = 'teal' | 'accent';

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  /** 'gradient' = solid gradient active (Calc, Leaderboard), 'subtle' = tinted active (ErrorReview, Progress) */
  mode?: 'gradient' | 'subtle';
  /** Gradient/tint color when active */
  activeColor?: ChipColor;
  style?: React.CSSProperties;
}

const COLOR_MAP: Record<ChipColor, { from: string; to: string; tint: string; border: string }> = {
  teal:   { from: COLORS.teal, to: COLORS.tealDark, tint: 'rgba(26,154,140,0.15)', border: 'rgba(26,154,140,0.3)' },
  accent: { from: COLORS.accent, to: COLORS.amber,  tint: 'rgba(255,107,53,0.15)', border: 'rgba(255,107,53,0.3)' },
};

export default function Chip({
  active,
  onClick,
  children,
  mode = 'gradient',
  activeColor = 'teal',
  style,
}: ChipProps) {
  const c = COLOR_MAP[activeColor];

  const base: React.CSSProperties = {
    padding: '7px 12px',
    borderRadius: 24,
    fontSize: 11,
    fontWeight: active ? 700 : 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    flexShrink: 0,
    border: 'none',
  };

  if (mode === 'gradient') {
    if (active) {
      base.background = `linear-gradient(135deg,${c.from},${c.to})`;
      base.color = '#fff';
    } else {
      base.background = 'var(--bg-card)';
      base.border = '1px solid var(--border)';
      base.color = 'var(--text-secondary)';
      // backdrop-filter removed for budget Android performance
    }
  } else {
    // subtle mode
    if (active) {
      base.background = c.tint;
      base.color = c.from;
      base.border = `1px solid ${c.border}`;
    } else {
      base.background = 'var(--bg-subtle)';
      base.color = 'var(--text-muted)';
      base.border = '1px solid transparent';
    }
  }

  return (
    <button onClick={onClick} style={{ ...base, ...style }}>
      {children}
    </button>
  );
}
