import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatBadge from '../ui/StatBadge';

const MockIcon = ({ size, color }: { size: number; color: string }) => (
  <svg data-testid="stat-icon" width={size} height={size} fill={color} />
);

describe('StatBadge', () => {
  it('renders value and label', () => {
    render(<StatBadge value="85%" label="Accuracy" color="#fff" />);
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('Accuracy')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<StatBadge value="10" label="Tests" color="#fff" Icon={MockIcon} />);
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument();
  });

  it('does not render icon when not provided', () => {
    const { container } = render(<StatBadge value="5" label="Days" color="#fff" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('accepts ReactNode as value', () => {
    render(<StatBadge value={<span data-testid="custom">42</span>} label="XP" color="#0f0" />);
    expect(screen.getByTestId('custom')).toBeInTheDocument();
  });

  it('applies color to value container', () => {
    render(<StatBadge value="100" label="Score" color="rgb(255, 0, 0)" />);
    // The value text is inside a div that has the color set
    const valueEl = screen.getByText('100');
    // getByText returns the closest element containing the text — the colored div itself
    expect(valueEl.style.color).toBe('rgb(255, 0, 0)');
  });
});
