import React from 'react';

export default function ProgressBar({ value, max = 100, gradient = 'linear-gradient(90deg,#FF6B35,#0EA5E9)', height = 4, style }) {
  const pct = max ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ height, background: 'rgba(255,255,255,0.06)', borderRadius: height / 2, ...style }}>
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
