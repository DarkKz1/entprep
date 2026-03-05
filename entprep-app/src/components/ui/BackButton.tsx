import React from 'react';
import { CARD_COMPACT } from '../../constants/styles';
import { ArrowLeft } from 'lucide-react';
import { useT } from '../../locales';

interface BackButtonProps {
  onClick: () => void;
  label?: string;
  style?: React.CSSProperties;
}

export default function BackButton({ onClick, label, style }: BackButtonProps) {
  const t = useT();
  const displayLabel = label ?? t.back;

  return (
    <button
      onClick={onClick}
      aria-label={displayLabel}
      style={{
        ...CARD_COMPACT,
        background: 'var(--bg-card)',
        padding: '8px 12px',
        cursor: 'pointer',
        color: 'var(--text)',
        fontSize: 11,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        ...style,
      }}
    >
      <ArrowLeft size={15} />
      {displayLabel}
    </button>
  );
}
