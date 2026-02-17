import React from 'react';

export default function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 13,
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s',
        background: value ? '#FF6B35' : 'rgba(255,255,255,0.1)',
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
