import React from 'react';
import { CARD_COMPACT, COLORS, TINT } from '../constants/styles';
import { useT } from '../locales';
import { useNav } from '../contexts/NavigationContext';
import { Target, Check, Zap, ArrowRight, RotateCcw } from 'lucide-react';

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
  srDueCount?: number;
}

export default function HomeTodayStrip({ dailyGoal, dailyProgress, dailyDone, daily, srDueCount = 0 }: Props) {
  const { nav, navToReview } = useNav();
  const t = useT();
  const review = t.review as Record<string, string>;

  const subName = (id: string) => (t.subjects as Record<string, string>)[id] || id;

  const hasChallenge = daily && daily.sub;
  const hasReviews = srDueCount > 0;
  const cols = [true, hasChallenge, hasReviews].filter(Boolean).length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: cols === 1 ? '1fr' : `repeat(${cols}, 1fr)`, gap: 8, marginBottom: 24 }}>
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
          background: dailyDone ? TINT.green.bg : TINT.teal.bg,
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
            height: 6, borderRadius: 3,
            background: 'var(--bg-subtle-2)',
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.round((dailyProgress / dailyGoal) * 100)}%`,
              height: '100%', borderRadius: 3,
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
            background: daily.completed ? TINT.green.bgLight : 'var(--bg-card)',
            border: daily.completed ? `1px solid ${TINT.green.borderLight}` : '1px solid var(--border-light)',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: daily.completed ? TINT.green.bg : `${daily.sub.color}12`,
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

      {/* SR Reviews Due */}
      {hasReviews && (
        <button
          onClick={navToReview}
          style={{
            ...CARD_COMPACT,
            padding: '12px 14px',
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            cursor: 'pointer',
            textAlign: 'left',
            background: TINT.purple.bgLight,
            border: `1px solid ${TINT.purple.borderLight}`,
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: TINT.purple.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <RotateCcw size={16} color={COLORS.purple} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: COLORS.purple,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {srDueCount} {review.due}
            </div>
          </div>
          <ArrowRight size={14} color={COLORS.purple} />
        </button>
      )}
    </div>
  );
}
