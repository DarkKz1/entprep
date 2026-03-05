import React from 'react';
import { COLORS } from '../../constants/styles';
import { useT } from '../../locales';
import BottomSheet from './BottomSheet';
import { Flag } from 'lucide-react';

interface ReportSheetProps {
  visible: boolean;
  questionText?: string;
  comment: string;
  loading: boolean;
  onClose: () => void;
  onCommentChange: (v: string) => void;
  onReport: (reason: string) => void;
}

export default function ReportSheet({ visible, questionText, comment, loading, onClose, onCommentChange, onReport }: ReportSheetProps) {
  const t = useT();

  const REASONS = [
    { key: 'wrong_answer', label: t.test.reportWrongAnswer, icon: '\u274C' },
    { key: 'bad_question', label: t.test.reportBadQuestion, icon: '\uD83D\uDCDD' },
    { key: 'bad_explanation', label: t.test.reportBadExplanation, icon: '\uD83D\uDCA1' },
    { key: 'other', label: t.test.reportOther, icon: '\uD83D\uDD16' },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Flag size={16} color={COLORS.red} />{t.test.reportQuestion}
      </div>
      {questionText && (
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>{questionText}</div>
      )}
      <textarea
        value={comment}
        onChange={e => onCommentChange(e.target.value)}
        placeholder={t.test.commentOptional}
        rows={3}
        style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-body)', fontSize: 12, resize: 'vertical', marginBottom: 10, fontFamily: 'inherit', outline: 'none' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {REASONS.map(r => (
          <button
            key={r.key}
            onClick={() => onReport(r.key)}
            disabled={loading}
            style={{ padding: '13px 14px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-body)', fontSize: 13, fontWeight: 500, cursor: loading ? 'wait' : 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s' }}
          >
            <span>{r.icon}</span>{r.label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
