import React, { useState, useEffect, useCallback } from 'react';
import { SUBS, ALL_PROFILES } from '../config/questionPools';
import { resolveQuestion } from '../utils/questionStore';
import { reviewCard, getDueCards } from '../utils/srEngine';
import { scoreQuestion } from '../utils/scoringEngine';
import { CARD_COMPACT, COLORS, TINT } from '../constants/styles';
import { useApp } from '../contexts/AppContext';
import { useNav } from '../contexts/NavigationContext';
import { useT } from '../locales';
import BackButton from './ui/BackButton';
import ProgressBar from './ui/ProgressBar';
import MultipleAnswerCard from './ui/MultipleAnswerCard';
import MatchingCard from './ui/MatchingCard';
import { Check, X, RotateCcw, ArrowRight } from 'lucide-react';
import type { Question, SRCard, AnswerValue } from '../types';
import { getSingleCorrect, getQType } from '../types';

interface ReviewSessionProps {
  cards: SRCard[];
  onFinish: (updated: SRCard[]) => void;
}

export default function ReviewSession({ cards, onFinish }: ReviewSessionProps) {
  const { st } = useApp();
  const { goHome } = useNav();
  const t = useT();
  const review = t.review as Record<string, string>;

  const [dueCards] = useState(() => getDueCards(cards));
  const [questions, setQuestions] = useState<(Question | null)[]>([]);
  const [loading, setLoading] = useState(true);
  const [cur, setCur] = useState(0);
  const [ans, setAns] = useState<AnswerValue | undefined>(undefined);
  const [show, setShow] = useState(false);
  const [updatedCards, setUpdatedCards] = useState<SRCard[]>([]);
  const [results, setResults] = useState<boolean[]>([]);
  const [fin, setFin] = useState(false);

  // Load all due questions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const qs = await Promise.all(
        dueCards.map(c => resolveQuestion(c.sid, c.oi, st.lang))
      );
      if (!cancelled) {
        setQuestions(qs);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const subName = useCallback((sid: string) => {
    const s = (t.subjects as Record<string, string>)[sid];
    if (s) return s;
    const sub = SUBS[sid] || ALL_PROFILES.find(p => p.id === sid);
    return sub?.name || sid;
  }, [t.subjects]);

  const subColor = useCallback((sid: string) => {
    const sub = SUBS[sid] || ALL_PROFILES.find(p => p.id === sid);
    return sub?.color || COLORS.purple;
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <RotateCcw size={24} color={COLORS.purple} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 12 }}>{t.loading}</div>
      </div>
    );
  }

  if (dueCards.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{review.done}</div>
        <button onClick={goHome} style={{
          ...CARD_COMPACT, padding: '10px 24px', background: COLORS.purple,
          color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer',
          fontSize: 13, fontWeight: 600, marginTop: 8,
        }}>{t.back}</button>
      </div>
    );
  }

  // Summary screen
  if (fin) {
    const correctCount = results.filter(Boolean).length;
    const wrongCount = results.length - correctCount;
    return (
      <div style={{ padding: '20px 20px 100px' }}>
        <div style={{
          ...CARD_COMPACT,
          background: TINT.purple.bgLight,
          border: `1px solid ${TINT.purple.borderLight}`,
          borderRadius: 18, padding: '28px 20px', textAlign: 'center', marginBottom: 20,
        }}>
          <RotateCcw size={28} color={COLORS.purple} style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>{review.summary}</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.purple, fontFamily: "'JetBrains Mono',monospace" }}>
            {results.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 16 }}>{review.reviewed}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.green }}>{correctCount}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{review.correct}</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.red }}>{wrongCount}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{review.needMore}</div>
            </div>
          </div>
        </div>
        <button onClick={() => onFinish(updatedCards)} style={{
          width: '100%', padding: '14px', background: COLORS.purple,
          color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer',
          fontSize: 14, fontWeight: 700,
        }}>{t.done}</button>
      </div>
    );
  }

  const card = dueCards[cur];
  const q = questions[cur];

  // Skip null questions (couldn't resolve)
  if (!q) {
    const handleSkipNull = () => {
      if (cur < dueCards.length - 1) {
        setCur(c => c + 1);
        setAns(undefined);
        setShow(false);
      } else {
        setFin(true);
      }
    };
    handleSkipNull();
    return null;
  }

  const qType = getQType(q);

  const handleSelect = (idx: number) => {
    if (show || ans !== undefined || qType !== 'single') return;
    setAns(idx);
    setShow(true);
  };

  const confirmMulti = (selected: number[]) => {
    if (ans !== undefined) return;
    setAns(selected);
    setShow(true);
  };

  const confirmMatch = (mapping: Record<number, number>) => {
    if (ans !== undefined) return;
    setAns(mapping);
    setShow(true);
  };

  const handleNext = () => {
    if (ans === undefined) return;
    const sr = scoreQuestion(q, ans);
    const correct = sr.correct;
    const updated = reviewCard(card, correct);
    setUpdatedCards(prev => [...prev, updated]);
    setResults(prev => [...prev, correct]);

    if (cur < dueCards.length - 1) {
      setCur(c => c + 1);
      setAns(undefined);
      setShow(false);
    } else {
      setFin(true);
    }
  };

  const handleQuit = () => {
    // Save progress for completed cards
    onFinish(updatedCards);
  };

  const sr = ans !== undefined ? scoreQuestion(q, ans) : null;
  const correct = sr?.correct ?? false;
  const nextInterval = ans !== undefined ? reviewCard(card, correct).interval : 0;

  return (
    <div style={{ padding: '0 20px 100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
        <BackButton onClick={handleQuit} />
        <div style={{ fontSize: 14, fontWeight: 700, color: COLORS.purple, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RotateCcw size={16} /> {review.title}
        </div>
        <button onClick={handleQuit} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
        }}>{review.quit}</button>
      </div>

      {/* Progress */}
      <ProgressBar value={cur + 1} max={dueCards.length} gradient={COLORS.purple} />
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4, marginBottom: 16 }}>
        {cur + 1} / {dueCards.length}
      </div>

      {/* Subject label */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 8,
        background: `${subColor(card.sid)}12`,
        marginBottom: 12,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: 3, background: subColor(card.sid) }} />
        <span style={{ fontSize: 10, fontWeight: 600, color: subColor(card.sid) }}>{subName(card.sid)}</span>
      </div>

      {/* Question */}
      <div style={{ ...CARD_COMPACT, padding: '16px', marginBottom: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.7, fontWeight: 500 }}>
          {q.q}
        </div>
      </div>

      {/* Answer options */}
      {qType === 'single' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {q.o.map((opt, i) => {
            const isSelected = ans === i;
            const isCorrect = i === getSingleCorrect(q);
            const showResult = show;
            let bg = 'var(--bg-card)';
            let border = '1px solid var(--border-light)';
            let textColor = 'var(--text)';
            if (showResult && isCorrect) { bg = TINT.green.bgLight; border = `1px solid ${TINT.green.border}`; textColor = COLORS.green; }
            else if (showResult && isSelected && !isCorrect) { bg = TINT.red.bgLight; border = `1px solid ${TINT.red.border}`; textColor = COLORS.red; }
            else if (isSelected) { bg = TINT.purple.bgLight; border = `1px solid ${TINT.purple.border}`; }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                style={{
                  ...CARD_COMPACT, padding: '12px 14px', background: bg, border,
                  cursor: show ? 'default' : 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: showResult && isCorrect ? COLORS.green : showResult && isSelected ? COLORS.red : 'var(--bg-subtle-2)',
                  color: showResult && (isCorrect || isSelected) ? '#fff' : 'var(--text-muted)',
                  fontSize: 11, fontWeight: 600,
                }}>
                  {showResult && isCorrect ? <Check size={14} /> : showResult && isSelected ? <X size={14} /> : String.fromCharCode(65 + i)}
                </div>
                <span style={{ fontSize: 12, color: textColor, fontWeight: isSelected ? 600 : 400 }}>{opt}</span>
              </button>
            );
          })}
        </div>
      )}

      {qType === 'multiple' && (
        <MultipleAnswerCard
          question={q}
          onConfirm={confirmMulti}
          showResult={show}
          userAnswer={ans as number[] | undefined}
        />
      )}

      {qType === 'matching' && q.pairs && (
        <MatchingCard
          question={q}
          onConfirm={confirmMatch}
          showResult={show}
          userAnswer={ans as Record<number, number> | undefined}
        />
      )}

      {/* Explanation + next review info */}
      {show && (
        <div style={{ marginTop: 12, animation: 'slideUp 0.3s ease' }}>
          {/* Explanation */}
          <div style={{
            ...CARD_COMPACT, padding: '10px 12px', marginBottom: 10,
            background: 'rgba(26,154,140,0.04)', border: '1px solid rgba(26,154,140,0.15)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{q.e}</div>
          </div>

          {/* Next review info */}
          <div style={{
            ...CARD_COMPACT, padding: '10px 14px',
            background: correct ? TINT.green.bgLight : TINT.red.bgLight,
            border: `1px solid ${correct ? TINT.green.borderLight : TINT.red.borderLight}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {correct ? <Check size={14} color={COLORS.green} /> : <X size={14} color={COLORS.red} />}
              <span style={{ fontSize: 11, fontWeight: 600, color: correct ? COLORS.green : COLORS.red }}>
                {correct ? review.correct : review.needMore}
              </span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {review.nextReview} {nextInterval === 1 ? review.tomorrow : `${review.inDays} ${nextInterval} ${review.days}`}
            </span>
          </div>

          {/* Next button */}
          <button
            onClick={handleNext}
            style={{
              width: '100%', padding: '14px', background: COLORS.purple,
              color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 8,
            }}
          >
            {cur < dueCards.length - 1 ? <>{t.next} <ArrowRight size={16} /></> : review.summary}
          </button>
        </div>
      )}
    </div>
  );
}
