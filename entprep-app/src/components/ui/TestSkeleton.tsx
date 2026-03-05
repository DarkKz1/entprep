import React from 'react';
import { CARD_COMPACT } from '../../constants/styles';

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--skeleton-bg) 25%, var(--border-light) 50%, var(--skeleton-bg) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

function Bar({ width = '60%', height = 14, delay = 0, style }: { width?: string | number; height?: number; delay?: number; style?: React.CSSProperties }) {
  return <div style={{ ...shimmer, height, width, borderRadius: height / 2, animationDelay: `${delay}s`, ...style }} />;
}

interface TestSkeletonProps {
  color?: string;
}

export default function TestSkeleton({ color = 'var(--text-muted)' }: TestSkeletonProps) {
  return (
    <div style={{ padding: '0 20px 100px' }}>
      <Bar width={80} height={18} style={{ marginBottom: 18, marginTop: 4 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Bar width="100%" height={6} />
        <Bar width={40} height={12} delay={0.1} />
      </div>

      <div style={{ ...CARD_COMPACT, padding: '20px 16px', marginBottom: 14 }}>
        <Bar width="30%" height={10} delay={0.05} style={{ marginBottom: 14 }} />
        <Bar width="90%" height={14} delay={0.1} style={{ marginBottom: 8 }} />
        <Bar width="75%" height={14} delay={0.15} style={{ marginBottom: 4 }} />
        <Bar width="50%" height={14} delay={0.2} />
      </div>

      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ ...CARD_COMPACT, padding: '16px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ ...shimmer, width: 32, height: 32, borderRadius: 10, flexShrink: 0, animationDelay: `${0.25 + i * 0.08}s` }} />
          <Bar width={`${65 - i * 8}%`} height={13} delay={0.3 + i * 0.08} />
        </div>
      ))}
    </div>
  );
}
