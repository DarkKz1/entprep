import React from 'react';
import { COLORS, GLOW } from '../../constants/styles';
import type { LucideIcon } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonColor = 'teal' | 'accent' | 'green';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  Icon?: LucideIcon;
  /** Gradient color for primary variant */
  color?: ButtonColor;
}

const GRADIENTS: Record<ButtonColor | 'danger', { bg: string; shadow: string }> = {
  teal:   { bg: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})`,     shadow: GLOW.teal },
  accent: { bg: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`, shadow: GLOW.accent },
  green:  { bg: `linear-gradient(135deg,${COLORS.green},#10B981)`,               shadow: GLOW.success },
  danger: { bg: `linear-gradient(135deg,${COLORS.red},#f97316)`,                 shadow: GLOW.error },
};

const SIZES = {
  sm: { py: 8, px: 14, fontSize: 11, radius: 10, icon: 14 },
  md: { py: 12, px: 20, fontSize: 13, radius: 12, icon: 16 },
  lg: { py: 15, px: 24, fontSize: 14, radius: 14, icon: 18 },
} as const;

export default function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  Icon,
  color = 'teal',
  children,
  style,
  disabled,
  ...rest
}: ButtonProps) {
  const s = SIZES[size];
  const grad = variant === 'primary' ? GRADIENTS[color] : variant === 'danger' ? GRADIENTS.danger : null;

  const base: React.CSSProperties = {
    padding: fullWidth ? s.py : `${s.py}px ${s.px}px`,
    fontSize: s.fontSize,
    fontWeight: 700,
    borderRadius: s.radius,
    cursor: disabled || loading ? 'default' : 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.5 : 1,
    border: 'none',
    background: 'none',
    color: '#fff',
  };

  if (grad) {
    base.background = grad.bg;
    base.boxShadow = grad.shadow;
  } else if (variant === 'secondary') {
    base.background = 'var(--bg-card)';
    base.color = 'var(--text)';
    base.border = '1px solid var(--border-light)';
  } else if (variant === 'ghost') {
    base.color = 'var(--text-secondary)';
  }

  return (
    <button style={{ ...base, ...style }} disabled={disabled || loading} {...rest}>
      {loading ? <LoadingDots /> : Icon ? <Icon size={s.icon} /> : null}
      {children}
    </button>
  );
}

function LoadingDots() {
  return (
    <span style={{ display: 'flex', gap: 3 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 4, height: 4, borderRadius: '50%', background: 'currentColor',
          animation: `pulse 1s ease-in-out ${i * 0.15}s infinite`,
        }} />
      ))}
    </span>
  );
}
