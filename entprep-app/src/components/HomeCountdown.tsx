import React from 'react';
import { CARD_COMPACT, COLORS, TINT } from '../constants/styles';
import { useT } from '../locales';
import { Trophy, Clock } from 'lucide-react';
import type { EntCountdown } from '../config/ent';

const PHASE_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  reg_open:    { bg: TINT.red.bgLight,   border: TINT.red.border,   text: COLORS.red,   icon: COLORS.red },
  before_exam: { bg: TINT.amber.bgLight, border: TINT.amber.border, text: COLORS.amber, icon: COLORS.amber },
  exam_now:    { bg: TINT.green.bgLight,  border: TINT.green.border,  text: COLORS.green, icon: COLORS.green },
  before_reg:  { bg: TINT.teal.bgLight,  border: TINT.teal.border,  text: COLORS.teal,  icon: COLORS.teal },
};

interface Props {
  countdown: EntCountdown;
  timeStr: string;
  goalApprox?: { approxScore: number; target: number } | null;
}

export default function HomeCountdown({ countdown, timeStr, goalApprox }: Props) {
  const t = useT();
  const colors = PHASE_COLORS[countdown.phase];
  const parts = timeStr.split(':');
  const labels = [t.home.daysUnit, t.home.hoursUnit, t.home.minsUnit, t.home.secsUnit];
  const periodName = t.ent[countdown.periodKey];
  const d = countdown.daysLeft;
  const daysStr = d === 1 ? t.ent.day1 : d <= 4 ? `${d} ${t.ent.daysPlural}` : `${d} ${t.ent.daysPluralMany}`;
  const countdownLabel = countdown.phase === 'reg_open' ? (d === 0 ? t.ent.regClosesToday : d === 1 ? t.ent.regClosesTomorrow : `${t.ent.regClosesIn} ${daysStr}`)
    : countdown.phase === 'before_exam' ? `${t.ent.beforeExam} ${periodName} — ${daysStr}`
    : countdown.phase === 'exam_now' ? `${periodName} ${t.ent.examNow}`
    : `${t.ent.regIn} ${periodName} ${t.ent.through} ${daysStr}`;

  return (
    <div style={{
      borderRadius: 20,
      background: colors.bg,
      border: `1.5px solid ${colors.border}`,
      padding: '20px 16px',
      textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
        <Clock size={13} color={colors.icon} />
        <span style={{ fontSize: 10, fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: 1 }}>
          {periodName}
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 14 }}>
        {countdownLabel}
      </div>
      {timeStr && parts.length === 4 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
          {parts.map((v, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 52, height: 52,
                borderRadius: 12,
                background: 'var(--bg-card)',
                border: `1px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace",
                color: countdown.urgent ? colors.text : 'var(--text)',
                boxShadow: countdown.urgent ? `0 0 12px ${colors.text}20` : 'none',
              }}>{v}</div>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{labels[i]}</span>
            </div>
          ))}
        </div>
      )}
      {goalApprox && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Trophy size={12} color={COLORS.amber} />
          {t.home.prediction}{goalApprox.approxScore}/{goalApprox.target || 140} {t.score}
        </div>
      )}
    </div>
  );
}
