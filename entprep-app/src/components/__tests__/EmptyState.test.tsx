import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from '../ui/EmptyState';

const MockIcon = ({ size, color }: { size: number; color: string }) => (
  <svg data-testid="icon" width={size} height={size} fill={color} />
);

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EmptyState description="Try again later" />);
    expect(screen.getByText('Try again later')).toBeInTheDocument();
  });

  it('renders icon when provided', () => {
    render(<EmptyState icon={MockIcon} title="Empty" />);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('does not render icon when not provided', () => {
    const { container } = render(<EmptyState title="No icon" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders action node', () => {
    render(<EmptyState title="X" action={<button>Retry</button>} />);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('renders nothing optional gracefully', () => {
    const { container } = render(<EmptyState />);
    expect(container.firstElementChild).toBeTruthy();
  });
});
