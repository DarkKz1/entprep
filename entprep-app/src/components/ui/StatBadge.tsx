import React from 'react';
import { CARD_COMPACT } from '../../constants/styles';

interface StatBadgeProps {
  value: React.ReactNode;
  label: string;
  color: string;
  Icon?: React.ComponentType<{ size: number; color: string }>;
  style?: React.CSSProperties;
}

export default function StatBadge({ value, label, color, Icon, style }: StatBadgeProps) {
  return (
    <div style={{ ...CARD_COMPACT, padding: '14px 10px', textAlign: 'center', ...style }}>
      <div
        style={{
          fontSize: 20,
          fontWeight: 800,
          color,
          fontFamily: "'Unbounded',sans-serif",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
        }}
      >
        {Icon && <Icon size={18} color={color} />}
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
    </div>
  );
}
