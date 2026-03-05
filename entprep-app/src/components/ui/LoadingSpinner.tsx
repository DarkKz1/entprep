import React from 'react';
import { COLORS } from '../../constants/styles';

interface LoadingSpinnerProps {
  text?: string;
  color?: string;
}

export default function LoadingSpinner({ text = 'Загрузка...', color = COLORS.accent }: LoadingSpinnerProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid var(--spinner-track)',
          borderTopColor: color,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{text}</div>
    </div>
  );
}
