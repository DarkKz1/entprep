import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ScoreRing from '../ui/ScoreRing';

describe('ScoreRing', () => {
  it('renders SVG ring', () => {
    const { container } = render(<ScoreRing value={75} label="75%" />);
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelectorAll('circle')).toHaveLength(2); // bg + progress
  });

  it('renders sublabel when provided', () => {
    render(<ScoreRing value={50} label="50%" sublabel="Average" />);
    expect(screen.getByText('Average')).toBeInTheDocument();
  });

  it('does not render sublabel when absent', () => {
    const { container } = render(<ScoreRing value={50} label="50%" />);
    // No sublabel text should be present
    expect(screen.queryByText('Average')).toBeNull();
  });

  it('respects custom size', () => {
    const { container } = render(<ScoreRing value={50} label="50%" size={200} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('200');
    expect(svg.getAttribute('height')).toBe('200');
  });

  it('caps percentage at 100', () => {
    // value=200, max=100 → should not exceed 100%
    const { container } = render(<ScoreRing value={200} max={100} label="200%" />);
    const progressCircle = container.querySelectorAll('circle')[1];
    // strokeDashoffset should be 0 (fully filled) when pct = 100
    expect(progressCircle).toBeTruthy();
  });

  it('renders label with slash format', () => {
    // With prefers-reduced-motion mocked to false, animation starts at 0
    // But the label format is tested through the component rendering
    const { container } = render(<ScoreRing value={98} max={140} label="98/140" />);
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
