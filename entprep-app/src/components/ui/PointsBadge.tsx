import React from 'react';
import { COLORS } from '../../constants/styles';

interface PointsBadgeProps {
  pts: number;
}

export default function PointsBadge({ pts }: PointsBadgeProps) {
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 6,
      background: pts >= 2 ? 'rgba(255,107,53,0.1)' : 'rgba(26,154,140,0.1)',
      color: pts >= 2 ? COLORS.accent : COLORS.teal,
      fontSize: 9, fontWeight: 700,
      whiteSpace: 'nowrap',
    }}>
      {pts} б.
    </span>
  );
}
