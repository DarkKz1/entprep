import React from 'react';

interface BarDataPoint {
  v: number;
  l: string;
}

interface BarProps {
  data: BarDataPoint[];
  color: string;
  mx?: number;
}

export default function Bar({ data, color, mx }: BarProps) {
  const m = mx || Math.max(...data.map(d => d.v), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 64 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div style={{ width: '100%', maxWidth: 26, borderRadius: 5, height: Math.max(4, (d.v / m) * 52), background: `linear-gradient(180deg,${color},${color}66)`, transition: 'height 0.5s' }} />
          <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 3 }}>{d.l}</div>
        </div>
      ))}
    </div>
  );
}
