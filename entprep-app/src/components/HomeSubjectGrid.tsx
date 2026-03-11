import React from 'react';
import { CARD_COMPACT, COLORS, SECTION_LABEL, hoverGlow, scoreColor } from '../constants/styles';
import { useT } from '../locales';
import { useNav } from '../contexts/NavigationContext';
import { Trophy } from 'lucide-react';
import type { SubjectConfig, TestResult } from '../types';

interface Props {
  mandatory: SubjectConfig[];
  profile: SubjectConfig[];
  hist: TestResult[];
  poolSizes: Record<string, number>;
  bests: Record<string, { best: number }>;
}

export default function HomeSubjectGrid({ mandatory, profile, hist, poolSizes, bests }: Props) {
  const { nav } = useNav();
  const t = useT();

  const subName = (id: string) => (t.subjects as Record<string, string>)[id] || id;

  const getStats = (s: SubjectConfig) => {
    const tests = hist.filter(h => h.su === s.id);
    const lastScore = tests.length ? tests[tests.length - 1].sc : null;
    const pb = bests[s.id];
    const pool = poolSizes[s.id] || s.pool || 0;
    return { tests, lastScore, pb, pool };
  };

  /** Full-width horizontal strip for mandatory subjects */
  const SubjectStrip = ({ s }: { s: SubjectConfig }) => {
    const { lastScore, pb, pool } = getStats(s);
    return (
      <button
        onClick={() => nav(s.id === 'reading' ? 'test' : 'topics', s.id)}
        aria-label={subName(s.id)}
        style={{
          ...CARD_COMPACT,
          padding: 0,
          overflow: 'hidden',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
        }}
        {...hoverGlow(s.color)}
      >
        {/* Color strip on left */}
        <div style={{ width: 4, alignSelf: 'stretch', background: s.color, borderRadius: '16px 0 0 16px', flexShrink: 0 }} />

        <div style={{ padding: '10px 14px', flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {subName(s.id)}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 14, flexShrink: 0 }}>
          {lastScore !== null ? (
            <span style={{
              fontSize: 15, fontWeight: 700,
              fontFamily: "'JetBrains Mono',monospace",
              color: scoreColor(lastScore),
            }}>
              {lastScore}%
            </span>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
          )}
          {pb && pb.best > (lastScore || 0) && (
            <span style={{
              fontSize: 9, color: COLORS.amber, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 1,
            }}>
              <Trophy size={9} />{pb.best}%
            </span>
          )}
          <span style={{
            fontSize: 10, color: 'var(--text-muted)',
            fontFamily: "'JetBrains Mono',monospace",
          }}>
            {pool}q
          </span>
        </div>
      </button>
    );
  };

  /** Compact square cell for profile subjects (2-col grid) */
  const SubjectCell = ({ s }: { s: SubjectConfig }) => {
    const { lastScore, pb, pool } = getStats(s);
    return (
      <button
        onClick={() => nav('topics', s.id)}
        aria-label={subName(s.id)}
        style={{
          ...CARD_COMPACT,
          padding: 0,
          overflow: 'hidden',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'all 0.2s',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
        {...hoverGlow(s.color)}
      >
        {/* Color strip at top */}
        <div style={{ height: 4, background: s.color, borderRadius: '16px 16px 0 0' }} />

        <div style={{ padding: '12px 12px 10px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <span style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1,
            }}>
              {subName(s.id)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {lastScore !== null ? (
                <span style={{
                  fontSize: 16, fontWeight: 700,
                  fontFamily: "'JetBrains Mono',monospace",
                  color: scoreColor(lastScore),
                }}>
                  {lastScore}%
                </span>
              ) : (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
              )}
              {pb && pb.best > (lastScore || 0) && (
                <span style={{
                  fontSize: 9, color: COLORS.amber, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 1,
                }}>
                  <Trophy size={9} />{pb.best}%
                </span>
              )}
            </div>
            <span style={{
              fontSize: 10, color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {pool}q
            </span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Mandatory subjects — full-width strips */}
      <div style={SECTION_LABEL}>{t.home.mandatory}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {mandatory.map(s => <SubjectStrip key={s.id} s={s} />)}
      </div>

      {/* Profile subjects — 2-col grid */}
      {profile.length > 0 && (
        <>
          <div style={SECTION_LABEL}>{t.home.profile}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {profile.map(s => <SubjectCell key={s.id} s={s} />)}
          </div>
        </>
      )}
    </div>
  );
}
