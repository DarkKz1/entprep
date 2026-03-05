import React from 'react';
import { CARD_COMPACT, COLORS } from '../constants/styles';
import { useT } from '../locales';
import { Trophy, Clock } from 'lucide-react';
import type { EntCountdown } from '../config/ent';

const PHASE_COLORS: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  reg_open:    { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.25)',  text: COLORS.red,   icon: COLORS.red },
  before_exam: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: COLORS.amber, icon: COLORS.amber },
  exam_now:    { bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.25)',  text: COLORS.green, icon: COLORS.green },
  before_reg:  { bg: 'rgba(26,154,140,0.08)', border: 'rgba(26,154,140,0.25)', text: COLORS.teal,  icon: COLORS.teal },
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
      ...CARD_COMPACT,
      background: colors.bg,
      border: `1px solid ${colors.border}`,
      padding: '16px 14px',
      marginBottom: 12,
      textAlign: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
        <Clock size={14} color={colors.icon} />
        <span style={{ fontSize: 11, fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {periodName}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500, marginBottom: 10 }}>
        {countdownLabel}
      </div>
      {timeStr && parts.length === 4 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
          {parts.map((v, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 44, height: 44,
                borderRadius: 10,
                background: 'var(--bg-secondary)',
                border: `1px solid ${colors.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                color: countdown.urgent ? colors.text : 'var(--text)',
              }}>{v}</div>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)', marginTop: 3 }}>{labels[i]}</span>
            </div>
          ))}
        </div>
      )}
      {goalApprox && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Trophy size={12} color={COLORS.amber} />
          {t.home.prediction}{goalApprox.approxScore}/{goalApprox.target || 140} {t.score}
        </div>
      )}
    </div>
  );
}
