import React, { useState, useMemo } from 'react';
import { ALL_PROFILES } from '../config/questionPools';
import { CARD_COMPACT, CARD_HERO, TYPE, COLORS } from '../constants/styles';
import { Target, Check, ArrowRight, Trophy } from 'lucide-react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { trackEvent } from '../utils/analytics';
import { useT } from '../locales';
import { getUpcomingPeriods, type PeriodKey } from '../config/ent';
import type { GoalSettings } from '../types/index';

interface ProfileSelectProps {
  onConfirm: (sel: string[], goal?: GoalSettings) => void;
}

export default function ProfileSelect({ onConfirm }: ProfileSelectProps) {
  const bp = useBreakpoint(); const isDesktop = bp === 'desktop';
  const [sel, setSel] = useState<string[]>([]);
  const t = useT();
  const subName = (id: string) => (t.subjects as Record<string, string>)[id] || id;
  const toggle = (id: string) => {
    if (!ALL_PROFILES.find(p => p.id === id)?.available) return;
    setSel(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  // Goal state
  const upcoming = useMemo(() => getUpcomingPeriods(), []);
  const [goalPeriod, setGoalPeriod] = useState<PeriodKey | null>(() => upcoming[0]?.key ?? null);
  const [goalTarget, setGoalTarget] = useState(100);

  const periodName = (key: PeriodKey) => (t.ent as Record<string, string>)[key] || key;
  const ready = sel.length === 2;

  const handleConfirm = () => {
    trackEvent('Profile Selected', { subjects: sel.join(',') });
    const selectedPeriod = upcoming.find(p => p.key === goalPeriod);
    const goal: GoalSettings | undefined = selectedPeriod
      ? { target: goalTarget, date: selectedPeriod.examStart }
      : undefined;
    onConfirm(sel, goal);
  };

  return (<div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
    <div style={{ ...CARD_HERO, textAlign: 'center', marginBottom: 20 }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <Target size={30} color={COLORS.accent} />
      </div>
      <h1 style={{ ...TYPE.h1, fontSize: 20, marginBottom: 8 }}>{t.profileSelect.title}</h1>
      <p style={{ ...TYPE.bodySmall, margin: 0 }}>{t.profileSelect.subtitle}</p>
      <p style={{ ...TYPE.caption, marginTop: 5 }}>{t.profileSelect.hint}</p>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
      {ALL_PROFILES.map(p => {
        const active = sel.includes(p.id);
        const disabled = !p.available;
        return (<button key={p.id} onClick={() => toggle(p.id)} disabled={disabled} style={{
          ...CARD_COMPACT,
          background: active ? 'rgba(255,107,53,0.1)' : 'var(--bg-card)',
          border: active ? `2px solid ${COLORS.accent}` : '2px solid var(--border-light)',
          padding: '14px 10px', cursor: disabled ? 'not-allowed' : 'pointer',
          textAlign: 'center', transition: 'all 0.25s', opacity: disabled ? 0.4 : 1, position: 'relative',
          transform: active ? 'scale(1.02)' : 'scale(1)',
        }}>
          {active && <div style={{ position: 'absolute', top: 7, right: 7, width: 20, height: 20, borderRadius: 10, background: COLORS.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={12} color="#fff" />
          </div>}
          <div style={{ fontSize: 28, marginBottom: 6 }}>{p.icon}</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: disabled ? 'var(--text-muted)' : 'var(--text)' }}>{subName(p.id)}</div>
          {p.available ? <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 3 }}>{p.pool} {t.profileSelect.questionsLabel}</div>
          : <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontStyle: 'italic' }}>{t.profileSelect.soon}</div>}
        </button>);
      })}
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', marginBottom: 14 }}>
      {t.profileSelect.selected} <span style={{ color: COLORS.accent, fontWeight: 700 }}>{sel.length}</span> {t.profileSelect.ofTwo}
    </div>

    {/* ENT Goal — appears after 2 subjects selected */}
    {ready && upcoming.length > 0 && (
      <div style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 16, marginBottom: 16, border: '1px solid var(--border-light)' }}>
        {/* Period selection */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Trophy size={15} color={COLORS.amber} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{t.profileSelect.goalWhen}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {upcoming.map(p => {
            const active = goalPeriod === p.key;
            return (
              <button key={p.key + p.examStart} onClick={() => setGoalPeriod(p.key)} style={{
                padding: '7px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: active ? `2px solid ${COLORS.amber}` : '2px solid var(--border-light)',
                background: active ? 'rgba(245,158,11,0.12)' : 'transparent',
                color: active ? COLORS.amber : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {periodName(p.key)}
              </button>
            );
          })}
        </div>

        {/* Target score slider */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.profileSelect.goalTarget}</span>
          <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", fontSize: 14, color: 'var(--text)' }}>{goalTarget}/140</span>
        </div>
        <input type="range" min={50} max={140} value={goalTarget} onChange={e => setGoalTarget(+e.target.value)} aria-label={t.profileSelect.goalTarget} style={{
          display: 'block', width: '100%', boxSizing: 'border-box', height: 6,
          background: 'var(--border)', borderRadius: 3, outline: 'none',
          WebkitAppearance: 'none', appearance: 'none', margin: 0, padding: 0,
        }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-muted)' }}>
          <span>~70 {t.profileSelect.goalAvg}</span>
          <span>85+ {t.profileSelect.goalGrant}</span>
          <span>100+ {t.profileSelect.goalTop}</span>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>{t.profileSelect.goalSkip}</div>
      </div>
    )}

    <button onClick={handleConfirm} disabled={!ready} style={{
      width: '100%', padding: '16px', background: ready ? `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})` : 'rgba(42,42,62,0.6)',
      border: 'none', borderRadius: 14, color: ready ? '#fff' : 'var(--text-muted)', fontSize: 15, fontWeight: 700,
      cursor: ready ? 'pointer' : 'not-allowed', transition: 'all 0.3s',
      boxShadow: ready ? '0 4px 20px rgba(255,107,53,0.25)' : 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {ready ? <>{t.profileSelect.confirmChoice}<ArrowRight size={18} /></> : t.profileSelect.selectTwo}
    </button>
  </div>);
}
