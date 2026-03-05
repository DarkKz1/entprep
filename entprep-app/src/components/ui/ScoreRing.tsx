import React, { useState, useEffect, useRef } from 'react';
import { scoreColor } from '../../constants/styles';

interface Props {
  /** Score percentage 0-100, or raw score for /140 mode */
  value: number;
  /** Max value (100 for percentage, 140 for FullENT) */
  max?: number;
  /** Display text (e.g. "85%" or "98/140") */
  label: string;
  /** Ring size in pixels */
  size?: number;
  /** Override color (defaults to scoreColor) */
  color?: string;
  /** Sub-label below the score */
  sublabel?: string;
}

export default function ScoreRing({
  value,
  max = 100,
  label,
  size = 140,
  color,
  sublabel,
}: Props) {
  const pct = Math.min((value / max) * 100, 100);
  const ringColor = color || scoreColor(pct);
  const isHighScore = pct >= 90;

  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animate from 0 to target
  const [animPct, setAnimPct] = useState(0);
  const [displayNum, setDisplayNum] = useState(0);
  const frameRef = useRef(0);
  const reducedMotion = typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (reducedMotion) {
      setAnimPct(pct);
      setDisplayNum(value);
      return;
    }

    // Kick off ring fill after a frame (so browser paints the 0-state first)
    const raf = requestAnimationFrame(() => setAnimPct(pct));

    // Count-up number
    const duration = 1000;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayNum(Math.round(eased * value));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(frameRef.current);
    };
  }, [pct, value, reducedMotion]);

  const offset = circumference - (animPct / 100) * circumference;

  // Build display label: replace the number with animated version
  const animLabel = label.includes('/')
    ? `${displayNum}/${label.split('/')[1]}`
    : label.includes('%')
      ? `${displayNum}%`
      : `${displayNum}`;

  return (
    <div style={{
      position: 'relative',
      width: size,
      height: size,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
    }}>
      <svg
        width={size}
        height={size}
        style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
      >
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-subtle-2)"
          strokeWidth={strokeWidth}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: reducedMotion ? 'none' : 'stroke-dashoffset 1.2s cubic-bezier(0.16,1,0.3,1)',
            filter: isHighScore && animPct > 0
              ? `drop-shadow(0 0 8px ${ringColor}66)`
              : `drop-shadow(0 0 4px ${ringColor}33)`,
          }}
        />
      </svg>
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: size * 0.25,
          fontWeight: 800,
          fontFamily: "'Unbounded',sans-serif",
          color: ringColor,
          lineHeight: 1,
        }}>
          {animLabel}
        </div>
        {sublabel && (
          <div style={{
            fontSize: 11,
            color: 'var(--text-secondary)',
            marginTop: 4,
          }}>
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}
