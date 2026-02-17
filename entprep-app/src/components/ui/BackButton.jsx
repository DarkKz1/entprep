import React from 'react';
import { CARD_COMPACT } from '../../constants/styles.js';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ onClick, label = 'Назад', style }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...CARD_COMPACT,
        background: 'rgba(30,30,50,0.55)',
        padding: '8px 12px',
        cursor: 'pointer',
        color: '#fff',
        fontSize: 11,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        ...style,
      }}
    >
      <ArrowLeft size={15} />
      {label}
    </button>
  );
}
