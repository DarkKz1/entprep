import React from 'react';

export default function MiniChart({ data, color = '#0EA5E9', width = 260, height = 64 }) {
  if (!data || data.length < 2) return null;

  const pad = { top: 10, right: 28, bottom: 4, left: 28 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const scores = data.map(d => d.score);
  const minV = Math.min(...scores, 0);
  const maxV = Math.max(...scores, 100);
  const range = maxV - minV || 1;

  const pts = scores.map((v, i) => ({
    x: pad.left + (i / (scores.length - 1)) * w,
    y: pad.top + h - ((v - minV) / range) * h,
    v,
  }));

  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const area = `${line} L${pts[pts.length - 1].x},${pad.top + h} L${pts[0].x},${pad.top + h} Z`;

  const gradId = `mcg_${color.replace('#', '')}`;

  const threshY = (v) => pad.top + h - ((v - minV) / range) * h;
  const dotColor = (v) => v >= 70 ? '#22c55e' : v >= 50 ? '#eab308' : '#ef4444';

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.25} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {/* Threshold lines */}
      {[50, 70].map(v => (
        <line key={v} x1={pad.left} y1={threshY(v)} x2={pad.left + w} y2={threshY(v)}
          stroke="rgba(255,255,255,0.08)" strokeWidth={1} strokeDasharray="4 3" />
      ))}
      {/* Area fill */}
      <path d={area} fill={`url(#${gradId})`} />
      {/* Line */}
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={dotColor(p.v)} stroke="#0f0f1a" strokeWidth={1.5} />
      ))}
      {/* First label */}
      <text x={pts[0].x} y={pts[0].y - 7} textAnchor="middle" fontSize={9} fontWeight={700}
        fontFamily="'JetBrains Mono',monospace" fill="#94a3b8">{scores[0]}%</text>
      {/* Last label */}
      <text x={pts[pts.length - 1].x} y={pts[pts.length - 1].y - 7} textAnchor="middle" fontSize={9} fontWeight={700}
        fontFamily="'JetBrains Mono',monospace" fill={dotColor(scores[scores.length - 1])}>{scores[scores.length - 1]}%</text>
    </svg>
  );
}
