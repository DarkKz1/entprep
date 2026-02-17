import React from 'react';
import { CARD_COMPACT } from '../../constants/styles.js';

export default function EmptyState({ icon: Icon, title, description, action, style }) {
  return (
    <div style={{ ...CARD_COMPACT, padding: '32px 20px', textAlign: 'center', ...style }}>
      {Icon && <Icon size={36} color="#64748b" style={{ marginBottom: 10 }} />}
      {title && <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 6 }}>{title}</div>}
      {description && <div style={{ fontSize: 12, color: '#94a3b8' }}>{description}</div>}
      {action}
    </div>
  );
}
