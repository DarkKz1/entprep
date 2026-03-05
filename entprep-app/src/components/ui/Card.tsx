import React from 'react';
import { CARD, CARD_COMPACT, CARD_HERO } from '../../constants/styles';

const VARIANTS: Record<string, React.CSSProperties> = {
  default: CARD,
  compact: CARD_COMPACT,
  hero: CARD_HERO,
};

interface CardProps {
  variant?: 'default' | 'compact' | 'hero';
  style?: React.CSSProperties;
  children: React.ReactNode;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export default function Card({ variant = 'default', style, children, onClick, onMouseEnter, onMouseLeave }: CardProps) {
  const base = VARIANTS[variant] || CARD;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        ...base,
        ...(onClick ? { cursor: 'pointer', textAlign: 'left' as const, width: '100%' } : {}),
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
