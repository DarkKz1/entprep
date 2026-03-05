import React from 'react';
import { CARD_COMPACT, COLORS } from '../constants/styles';
import { useT } from '../locales';
import { useNav } from '../contexts/NavigationContext';
import { Target, Check, Zap, ArrowRight } from 'lucide-react';

interface DailyChallenge {
  subjectId: string;
  sub: { icon: string; color: string } | null;
  completed: boolean;
  score?: number | null;
  prevScore?: number | null;
}

interface Props {
  dailyGoal: number;
  dailyProgress: number;
  dailyDone: boolean;
  daily: DailyChallenge | null;
}

export default function HomeTodayStrip({ dailyGoal, dailyProgress, dailyDone, daily }: Props) {
  const { nav } = useNav();
  const t = useT();

  const subName = (id: string) => (t.subjects as Record<string, string>)[id] || id;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: daily && daily.sub ? '1fr 1fr' : '1fr', gap: 8, marginBottom: 24 }}>
      {/* Daily Goal - left half */}
      <div style={{
        ...CARD_COMPACT,
        padding: '12px 14px',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: dailyDone ? 'rgba(34,197,94,0.12)' : 'rgba(26,154,140,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {dailyDone ? <Check size={16} color={COLORS.green} /> : <Target size={16} color={COLORS.teal} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 11, fontWeight: 600,
            color: dailyDone ? COLORS.green : 'var(--text)',
            marginBottom: 4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {dailyDone ? t.home.goalDone : `${dailyProgress}/${dailyGoal} ${t.tests}`}
          </div>
          <div style={{
            height: 4, borderRadius: 2,
            background: 'var(--bg-subtle-2)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.round((dailyProgress / dailyGoal) * 100)}%`,
              height: '100%', borderRadius: 2,
              background: dailyDone
                ? COLORS.green
                : `linear-gradient(90deg,${COLORS.teal},${COLORS.tealLight})`,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      </div>

      {/* Daily Challenge - right half */}
      {daily && daily.sub && (
        <button
          onClick={() => { if (!daily.completed) nav('test', daily.subjectId); }}
          style={{
            ...CARD_COMPACT,
            padding: '12px 14px',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: daily.completed ? 'default' : 'pointer',
            textAlign: 'left',
            background: daily.completed ? 'rgba(34,197,94,0.06)' : 'var(--bg-card)',
            border: daily.completed ? '1px solid rgba(34,197,94,0.15)' : '1px solid var(--border-light)',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: daily.completed ? 'rgba(34,197,94,0.12)' : `${daily.sub.color}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            {daily.completed ? <Check size={16} color={COLORS.green} /> : daily.sub.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: daily.completed ? COLORS.green : COLORS.amber,
              display: 'flex', alignItems: 'center', gap: 3,
            }}>
              <Zap size={10} />
              {daily.completed ? t.home.challengeDone : t.home.dailyChallenge}
            </div>
            <div style={{
              fontSize: 11, color: 'var(--text)', fontWeight: 500, marginTop: 2,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {subName(daily.subjectId)}
            </div>
          </div>
          {!daily.completed && <ArrowRight size={14} color={COLORS.amber} />}
        </button>
      )}
    </div>
  );
}
