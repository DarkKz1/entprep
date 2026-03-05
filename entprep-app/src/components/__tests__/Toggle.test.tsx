import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toggle from '../ui/Toggle';

describe('Toggle', () => {
  it('renders with role=switch', () => {
    render(<Toggle value={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('aria-checked matches value', () => {
    const { rerender } = render(<Toggle value={false} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    rerender(<Toggle value={true} onChange={() => {}} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with inverted value on click', () => {
    const onChange = vi.fn();
    render(<Toggle value={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('calls onChange(false) when currently true', () => {
    const onChange = vi.fn();
    render(<Toggle value={true} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('sets aria-label', () => {
    render(<Toggle value={false} onChange={() => {}} label="Dark mode" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-label', 'Dark mode');
  });
});
