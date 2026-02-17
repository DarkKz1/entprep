import React from 'react';
import { CARD, CARD_COMPACT, CARD_HERO } from '../../constants/styles.js';

const VARIANTS = {
  default: CARD,
  compact: CARD_COMPACT,
  hero: CARD_HERO,
};

export default function Card({ variant = 'default', style, children, onClick, onMouseEnter, onMouseLeave }) {
  const base = VARIANTS[variant] || CARD;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        ...base,
        ...(onClick ? { cursor: 'pointer', textAlign: 'left', width: '100%' } : {}),
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
