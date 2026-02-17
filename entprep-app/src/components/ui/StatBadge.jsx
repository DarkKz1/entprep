import React from 'react';
import { CARD_COMPACT } from '../../constants/styles.js';

export default function StatBadge({ value, label, color, Icon, style }) {
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
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>{label}</div>
    </div>
  );
}
