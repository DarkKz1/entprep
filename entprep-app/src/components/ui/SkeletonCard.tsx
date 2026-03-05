import React from 'react';
import { CARD_COMPACT } from '../../constants/styles';

const shimmerBg: React.CSSProperties = {
  background: 'linear-gradient(90deg, var(--skeleton-bg) 25%, var(--border-light) 50%, var(--skeleton-bg) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

function Bar({ width = '60%', height = 14, delay = 0 }: { width?: string | number; height?: number; delay?: number }) {
  return <div style={{ ...shimmerBg, height, width, borderRadius: height / 2, animationDelay: `${delay}s` }} />;
}

interface SkeletonCardProps {
  lines?: number;
  style?: React.CSSProperties;
}

export default function SkeletonCard({ lines = 2, style }: SkeletonCardProps) {
  return (
    <div style={{ ...CARD_COMPACT, padding: '15px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, ...style }}>
      <div style={{ ...shimmerBg, width: 44, height: 44, borderRadius: 13, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Bar width="60%" height={14} />
        {lines > 1 && <Bar width="40%" height={10} delay={0.15} />}
      </div>
    </div>
  );
}
