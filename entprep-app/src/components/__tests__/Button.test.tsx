import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../ui/Button';
import { Zap } from 'lucide-react';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('fires onClick', () => {
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Go</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(clicked).toBe(true);
  });

  it('is disabled when disabled prop set', () => {
    render(<Button disabled>No</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when loading', () => {
    render(<Button loading>Wait</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows loading dots when loading', () => {
    const { container } = render(<Button loading>Wait</Button>);
    // LoadingDots renders 3 span elements inside a span wrapper
    const dots = container.querySelectorAll('button > span > span');
    expect(dots.length).toBe(3);
  });

  it('renders Icon when provided', () => {
    const { container } = render(<Button Icon={Zap}>Flash</Button>);
    // Lucide renders an SVG
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('does not render Icon when loading', () => {
    const { container } = render(<Button Icon={Zap} loading>Flash</Button>);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('applies fullWidth style', () => {
    const { container } = render(<Button fullWidth>Wide</Button>);
    const btn = container.querySelector('button')!;
    expect(btn.style.width).toBe('100%');
  });

  it('applies custom style', () => {
    const { container } = render(<Button style={{ marginTop: 10 }}>Styled</Button>);
    const btn = container.querySelector('button')!;
    expect(btn.style.marginTop).toBe('10px');
  });

  it('variant=secondary has border', () => {
    const { container } = render(<Button variant="secondary">Sec</Button>);
    const btn = container.querySelector('button')!;
    expect(btn.style.border).toContain('solid');
  });

  it('variant=ghost has no background', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>);
    const btn = container.querySelector('button')!;
    expect(btn.style.background).toBe('none');
  });

  it('reduced opacity when disabled', () => {
    const { container } = render(<Button disabled>Dim</Button>);
    const btn = container.querySelector('button')!;
    expect(btn.style.opacity).toBe('0.5');
  });
});
