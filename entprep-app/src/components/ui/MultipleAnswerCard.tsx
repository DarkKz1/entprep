import React, { useState } from 'react';
import { CARD_COMPACT, COLORS } from '../../constants/styles';
import { Check, X } from 'lucide-react';
import type { Question } from '../../types';
import { scoreQuestion } from '../../utils/scoringEngine';
import { useT } from '../../locales';

interface MultipleAnswerCardProps {
  question: Question;
  onConfirm: (selected: number[]) => void;
  showResult: boolean;      // true after confirm
  userAnswer?: number[];    // the confirmed answer
}

export default function MultipleAnswerCard({
  question,
  onConfirm,
  showResult,
  userAnswer,
}: MultipleAnswerCardProps) {
  const t = useT();
  const [selected, setSelected] = useState<Set<number>>(() => userAnswer ? new Set(userAnswer) : new Set());
  const correctArr = Array.isArray(question.c) ? question.c : [question.c];

  const toggle = (idx: number) => {
    if (showResult) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleConfirm = () => {
    if (showResult || selected.size === 0) return;
    onConfirm(Array.from(selected).sort());
  };

  // Scoring result if confirmed
  const result = showResult && userAnswer
    ? scoreQuestion(question, userAnswer)
    : null;

  const answeredSet = showResult && userAnswer ? new Set(userAnswer) : null;
  const correctSet = new Set(correctArr);

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 8, fontSize: 11, color: 'var(--text-secondary)',
      }}>
        <span style={{
          padding: '3px 8px', borderRadius: 8,
          background: 'rgba(26,154,140,0.1)', color: COLORS.teal,
          fontWeight: 600, fontSize: 10,
        }}>
          {t.test.multipleAnswers}
        </span>
        {!showResult && (
          <span>{t.test.selected}: {selected.size}</span>
        )}
        {result && (
          <span style={{
            fontWeight: 700, fontSize: 12,
            color: result.correct ? COLORS.green : result.partial ? COLORS.yellow : COLORS.red,
          }}>
            {result.pts}/{result.maxPts} б.
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {question.o.map((opt, idx) => {
          const isSelected = showResult ? answeredSet?.has(idx) : selected.has(idx);
          const isCorrect = correctSet.has(idx);

          let bg = 'var(--bg-card)';
          let bd = '1px solid var(--border)';
          let tc = 'var(--text-body)';

          if (showResult) {
            if (isCorrect && isSelected) {
              bg = 'rgba(34,197,94,0.1)'; bd = '1px solid rgba(34,197,94,0.35)'; tc = COLORS.green;
            } else if (isCorrect && !isSelected) {
              bg = 'rgba(34,197,94,0.06)'; bd = '1px solid rgba(34,197,94,0.2)'; tc = COLORS.green;
            } else if (!isCorrect && isSelected) {
              bg = 'rgba(239,68,68,0.1)'; bd = '1px solid rgba(239,68,68,0.35)'; tc = COLORS.red;
            }
          } else if (isSelected) {
            bg = 'rgba(26,154,140,0.1)'; bd = '1px solid rgba(26,154,140,0.35)'; tc = COLORS.teal;
          }

          return (
            <button
              key={idx}
              onClick={() => toggle(idx)}
              style={{
                display: 'flex', alignItems: 'center',
                background: bg,
                border: bd, borderRadius: 13,
                padding: '13px 14px',
                cursor: showResult ? 'default' : 'pointer',
                textAlign: 'left', transition: 'all 0.2s',
              }}
            >
              <div style={{
                width: 26, height: 26, borderRadius: 8,
                border: `2px solid ${tc}`,
                background: isSelected ? `${tc}15` : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: tc,
                flexShrink: 0, marginRight: 11,
              }}>
                {showResult && isCorrect && isSelected ? <Check size={14} /> :
                 showResult && !isCorrect && isSelected ? <X size={14} /> :
                 showResult && isCorrect ? <Check size={12} style={{ opacity: 0.5 }} /> :
                 isSelected ? <Check size={14} /> :
                 String.fromCharCode(65 + idx)}
              </div>
              <span style={{ fontSize: 14, color: tc, fontWeight: isSelected ? 600 : 400 }}>
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {!showResult && (
        <button
          onClick={handleConfirm}
          disabled={selected.size === 0}
          style={{
            width: '100%', padding: '14px', marginTop: 10,
            background: selected.size > 0
              ? `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})`
              : 'var(--bg-subtle)',
            color: selected.size > 0 ? '#fff' : 'var(--text-muted)',
            border: 'none', borderRadius: 13,
            fontSize: 14, fontWeight: 700,
            cursor: selected.size > 0 ? 'pointer' : 'default',
            boxShadow: selected.size > 0 ? '0 4px 20px rgba(26,154,140,0.25)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {t.test.confirmBtn} ({selected.size})
        </button>
      )}
    </div>
  );
}
