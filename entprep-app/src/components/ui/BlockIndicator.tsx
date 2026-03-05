import React from 'react';
import { COLORS } from '../../constants/styles';
import type { ProfileBlock } from '../../types';
import { useT } from '../../locales';

interface BlockIndicatorProps {
  currentIndex: number;
  blocks: ProfileBlock[];
}

const BLOCK_COLORS: Record<string, string> = {
  single: COLORS.teal,
  context: COLORS.teal,
  multiple: COLORS.accent,
  matching: COLORS.amber,
};

const LABEL_KEYS = {
  single: 'blockSingle',
  context: 'blockContext',
  multiple: 'blockMultiple',
  matching: 'blockMatching',
} as const;

export default function BlockIndicator({ currentIndex, blocks }: BlockIndicatorProps) {
  const t = useT();
  const current = blocks.find(b => currentIndex >= b.range[0] && currentIndex <= b.range[1]);
  if (!current) return null;

  const color = BLOCK_COLORS[current.key] || COLORS.teal;
  const label = t.ent[LABEL_KEYS[current.key]] || current.label;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '5px 10px', borderRadius: 8,
      background: `${color}12`, border: `1px solid ${color}30`,
      fontSize: 10, fontWeight: 600, color,
    }}>
      <span>{label}</span>
      <span style={{ opacity: 0.7 }}>
        ({current.range[0] + 1}-{current.range[1] + 1})
      </span>
    </div>
  );
}
