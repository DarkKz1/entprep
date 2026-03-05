import React from 'react';
import { CARD_COMPACT } from '../../constants/styles';

interface EmptyStateProps {
  icon?: React.ComponentType<{ size: number; color: string; style?: React.CSSProperties }>;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export default function EmptyState({ icon: Icon, title, description, action, style }: EmptyStateProps) {
  return (
    <div style={{ ...CARD_COMPACT, padding: '32px 20px', textAlign: 'center', ...style }}>
      {Icon && <Icon size={36} color="var(--text-muted)" style={{ marginBottom: 10 }} />}
      {title && <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{title}</div>}
      {description && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{description}</div>}
      {action}
    </div>
  );
}
