import React from 'react';
import { COLORS } from '../constants/styles';
import { useT } from '../locales';
import { useNav } from '../contexts/NavigationContext';
import { Play, Shuffle } from 'lucide-react';
import type { TestResult } from '../types';

interface Props {
  hist: TestResult[];
  profSubs: string[];
}

export default function HomeQuickStart({ hist, profSubs }: Props) {
  const { nav } = useNav();
  const t = useT();

  // Find last tested subject
  const lastRegular = [...hist].reverse().find(h => h.type !== 'fullent');
  const lastSub = lastRegular?.su;

  const subName = (id: string) => (t.subjects as Record<string, string>)[id] || id;

  // Pick a random subject from all available
  const allSubs = ['math', 'reading', 'history', ...profSubs];
  const pickRandom = () => {
    const pool = allSubs.filter(s => s !== lastSub);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || allSubs[0];
    nav(chosen === 'reading' ? 'test' : 'topics', chosen);
  };

  const startLast = () => {
    if (lastSub) nav(lastSub === 'reading' ? 'test' : 'topics', lastSub);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Primary CTA */}
      <button
        onClick={lastSub ? startLast : pickRandom}
        style={{
          width: '100%',
          minHeight: 56,
          background: `linear-gradient(135deg, #FF6B35 0%, #FF4D6A 100%)`,
          border: 'none',
          borderRadius: 16,
          color: '#fff',
          fontSize: 16,
          fontWeight: 700,
          fontFamily: "'Unbounded',sans-serif",
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxShadow: '0 4px 20px rgba(255,77,106,0.25)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(255,77,106,0.35)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(255,77,106,0.25)'; }}
      >
        <Play size={20} fill="#fff" />
        {t.home.startTest}
      </button>

      {/* Subject chips below */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        {lastSub && (
          <button
            onClick={startLast}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {subName(lastSub)}
          </button>
        )}
        <button
          onClick={pickRandom}
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-light)',
            borderRadius: 20,
            padding: '6px 14px',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Shuffle size={12} />
          {t.home.randomSubject}
        </button>
      </div>
    </div>
  );
}
