import React, { useState, useMemo, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { COLORS } from '../../constants/styles';
import { shuffleArray } from '../../utils/questionHelpers';
import type { Question } from '../../types';

interface MatchingCardProps {
  question: Question;
  onConfirm: (mapping: Record<number, number>) => void;
  showResult: boolean;
  userAnswer?: Record<number, number>;
}

export default function MatchingCard({
  question,
  onConfirm,
  showResult,
  userAnswer,
}: MatchingCardProps) {
  // Defensive: ensure pairs is a valid array
  const rawPairs = question.pairs;
  const pairs: [string, string][] = Array.isArray(rawPairs) ? rawPairs : [];

  // Shuffled right-side indices (memoized so they don't change on re-render)
  const shuffledRightIndices = useMemo(
    () => shuffleArray(Array.from({ length: pairs.length }, (_, i) => i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pairs.length],
  );

  const [mapping, setMapping] = useState<Record<number, number>>(() => userAnswer || {});
  // Tracks whether user tried to confirm with unfilled pairs — highlights missing ones
  const [showMissing, setShowMissing] = useState(false);
  const selectRefs = useRef<(HTMLSelectElement | null)[]>([]);

  const setMatch = (leftIdx: number, rightIdx: number) => {
    if (showResult) return;
    setMapping(prev => ({ ...prev, [leftIdx]: rightIdx }));
    setShowMissing(false);
  };

  const filledCount = Object.keys(mapping).length;
  const allFilled = filledCount === pairs.length && pairs.length > 0;

  const handleConfirm = () => {
    if (showResult) return;
    if (!allFilled) {
      // Highlight unfilled dropdowns and scroll to first missing one
      setShowMissing(true);
      const firstMissing = pairs.findIndex((_, i) => mapping[i] === undefined);
      if (firstMissing >= 0) {
        selectRefs.current[firstMissing]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        selectRefs.current[firstMissing]?.focus();
      }
      return;
    }
    onConfirm(mapping);
  };

  // For results: check each pair
  const getResultForPair = (leftIdx: number) => {
    if (!showResult || !userAnswer) return null;
    const pickedShuffledIdx = userAnswer[leftIdx];
    if (pickedShuffledIdx === undefined) return false;
    const pickedRealIdx = shuffledRightIndices[pickedShuffledIdx];
    return pickedRealIdx === leftIdx;
  };

  // Score display
  const isAllCorrect = showResult && userAnswer &&
    pairs.every((_, i) => getResultForPair(i));

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        marginBottom: 10, fontSize: 11, color: 'var(--text-secondary)',
      }}>
        <span style={{
          padding: '3px 8px', borderRadius: 8,
          background: 'rgba(26,154,140,0.1)', color: COLORS.teal,
          fontWeight: 600, fontSize: 10,
        }}>
          Соответствие
        </span>
        {showResult ? (
          <span style={{
            fontWeight: 700, fontSize: 12,
            color: isAllCorrect ? COLORS.green : COLORS.red,
          }}>
            {isAllCorrect ? '2/2' : '0/2'} б.
          </span>
        ) : pairs.length > 0 && (
          <span style={{
            fontWeight: 600, fontSize: 10,
            color: allFilled ? COLORS.green : 'var(--text-muted)',
          }}>
            {filledCount}/{pairs.length}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {pairs.map((pair, leftIdx) => {
          const pairCorrect = getResultForPair(leftIdx);
          const currentVal = showResult
            ? userAnswer?.[leftIdx]
            : mapping[leftIdx];
          const isFilled = currentVal !== undefined;
          const isMissing = showMissing && !isFilled && !showResult;

          return (
            <div
              key={leftIdx}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px',
                background: showResult
                  ? pairCorrect ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)'
                  : isMissing ? 'rgba(245,158,11,0.06)' : 'var(--bg-card)',
                border: showResult
                  ? `1px solid ${pairCorrect ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`
                  : isMissing ? '1px solid rgba(245,158,11,0.4)'
                  : isFilled ? '1px solid rgba(26,154,140,0.2)'
                  : '1px solid var(--border)',
                borderRadius: 12,
                transition: 'all 0.2s',
              }}
            >
              {/* Left side */}
              <div style={{
                flex: 1, fontSize: 13, fontWeight: 600,
                color: 'var(--text)',
                minWidth: 0,
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 22, height: 22, borderRadius: 6,
                  background: isMissing ? 'rgba(245,158,11,0.15)' : 'rgba(26,154,140,0.1)',
                  color: isMissing ? COLORS.amber : COLORS.teal,
                  fontSize: 10, fontWeight: 700, marginRight: 8,
                  flexShrink: 0,
                }}>
                  {leftIdx + 1}
                </span>
                {pair[0]}
              </div>

              {/* Arrow */}
              <span style={{ color: 'var(--text-muted)', fontSize: 14, flexShrink: 0 }}>→</span>

              {/* Right side dropdown */}
              <div style={{ flex: 1, position: 'relative' }}>
                {showResult ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 10px', borderRadius: 8,
                    background: pairCorrect
                      ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${pairCorrect
                      ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>
                    {pairCorrect
                      ? <Check size={13} color={COLORS.green} />
                      : <X size={13} color={COLORS.red} />}
                    <span style={{
                      fontSize: 12,
                      color: pairCorrect ? COLORS.green : COLORS.red,
                      fontWeight: 500,
                    }}>
                      {currentVal !== undefined
                        ? pairs[shuffledRightIndices[currentVal]]?.[1]
                        : '—'}
                    </span>
                    {!pairCorrect && (
                      <span style={{ fontSize: 10, color: COLORS.green, marginLeft: 'auto' }}>
                        → {pair[1]}
                      </span>
                    )}
                  </div>
                ) : (
                  <select
                    ref={el => { selectRefs.current[leftIdx] = el; }}
                    value={currentVal ?? ''}
                    onChange={e => setMatch(leftIdx, Number(e.target.value))}
                    style={{
                      width: '100%', padding: '9px 10px',
                      background: isMissing ? 'rgba(245,158,11,0.08)' : 'var(--bg-subtle)',
                      border: isMissing ? '1px solid rgba(245,158,11,0.5)'
                        : isFilled ? '1px solid rgba(26,154,140,0.25)'
                        : '1px solid var(--border)',
                      borderRadius: 8,
                      color: isFilled ? 'var(--text)' : 'var(--text-muted)',
                      fontSize: 12, fontFamily: 'inherit',
                      cursor: 'pointer', outline: 'none',
                      appearance: 'auto',
                    }}
                  >
                    <option value="" disabled>Выберите...</option>
                    {shuffledRightIndices.map((realIdx, shuffledIdx) => (
                      <option key={shuffledIdx} value={shuffledIdx}>
                        {String.fromCharCode(65 + shuffledIdx)}) {pairs[realIdx][1]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!showResult && pairs.length > 0 && (
        <button
          onClick={handleConfirm}
          style={{
            width: '100%', padding: '14px', marginTop: 10,
            background: allFilled
              ? `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})`
              : 'var(--bg-subtle)',
            color: allFilled ? '#fff' : 'var(--text-muted)',
            border: 'none', borderRadius: 13,
            fontSize: 14, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: allFilled ? '0 4px 20px rgba(26,154,140,0.25)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          {allFilled ? 'Подтвердить' : `Подтвердить (${filledCount}/${pairs.length})`}
        </button>
      )}
    </div>
  );
}
