import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ProgressBar from '../ui/ProgressBar';

describe('ProgressBar', () => {
  it('renders with correct percentage width', () => {
    const { container } = render(<ProgressBar value={50} max={100} />);
    const fill = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('50%');
  });

  it('caps at 100%', () => {
    const { container } = render(<ProgressBar value={200} max={100} />);
    const fill = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('100%');
  });

  it('handles 0 value', () => {
    const { container } = render(<ProgressBar value={0} max={100} />);
    const fill = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('handles 0 max gracefully', () => {
    const { container } = render(<ProgressBar value={50} max={0} />);
    const fill = container.firstElementChild!.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('uses custom height', () => {
    const { container } = render(<ProgressBar value={50} height={8} />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.style.height).toBe('8px');
  });

  it('applies custom style', () => {
    const { container } = render(<ProgressBar value={50} style={{ marginTop: 10 }} />);
    const bar = container.firstElementChild as HTMLElement;
    expect(bar.style.marginTop).toBe('10px');
  });

  it('fractional percentage', () => {
    const { container } = render(<ProgressBar value={1} max={3} />);
    const fill = container.firstElementChild!.firstElementChild as HTMLElement;
    // 1/3 * 100 = 33.333...%
    expect(parseFloat(fill.style.width)).toBeCloseTo(33.33, 0);
  });
});
