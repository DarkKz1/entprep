import React from 'react';
import { COLORS } from '../../constants/styles';

interface ProgressBarProps {
  value: number;
  max?: number;
  gradient?: string;
  height?: number;
  style?: React.CSSProperties;
}

export default function ProgressBar({ value, max = 100, gradient = `linear-gradient(90deg,${COLORS.accent},${COLORS.amber})`, height = 4, style }: ProgressBarProps) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height, background: 'var(--bg-subtle-2)', borderRadius: height / 2, ...style }}>
      <div
        style={{
          height: '100%',
          width: `${pct}%`,
          background: gradient,
          borderRadius: height / 2,
          transition: 'width 0.3s',
        }}
      />
    </div>
  );
}
