import React from 'react';
import { COLORS } from '../../constants/styles';

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  label?: string;
}

export default function Toggle({ value, onChange, label }: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s',
        background: value ? COLORS.accent : 'var(--toggle-off)',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          background: '#fff',
          position: 'absolute',
          top: 3,
          left: value ? 21 : 3,
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}
