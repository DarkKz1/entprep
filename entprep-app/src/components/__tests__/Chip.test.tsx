import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Chip from '../ui/Chip';

describe('Chip', () => {
  it('renders children', () => {
    render(<Chip active={false} onClick={() => {}}>Math</Chip>);
    expect(screen.getByText('Math')).toBeInTheDocument();
  });

  it('renders as button', () => {
    render(<Chip active={false} onClick={() => {}}>X</Chip>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('fires onClick', () => {
    const onClick = vi.fn();
    render(<Chip active={false} onClick={onClick}>Click</Chip>);
    fireEvent.click(screen.getByText('Click'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('active chip has bold font weight', () => {
    const { container } = render(<Chip active={true} onClick={() => {}}>Active</Chip>);
    const btn = container.querySelector('button')!;
    expect(btn.style.fontWeight).toBe('700');
  });

  it('inactive chip has lighter font weight', () => {
    const { container } = render(<Chip active={false} onClick={() => {}}>Inactive</Chip>);
    const btn = container.querySelector('button')!;
    expect(btn.style.fontWeight).toBe('600');
  });

  it('gradient mode: active has white text', () => {
    const { container } = render(<Chip active={true} onClick={() => {}} mode="gradient">G</Chip>);
    const btn = container.querySelector('button')!;
    expect(btn.style.color).toBe('rgb(255, 255, 255)');
  });

  it('subtle mode: inactive has transparent border', () => {
    const { container } = render(<Chip active={false} onClick={() => {}} mode="subtle">S</Chip>);
    const btn = container.querySelector('button')!;
    expect(btn.style.border).toContain('transparent');
  });

  it('applies custom style', () => {
    const { container } = render(<Chip active={false} onClick={() => {}} style={{ marginLeft: 5 }}>X</Chip>);
    const btn = container.querySelector('button')!;
    expect(btn.style.marginLeft).toBe('5px');
  });
});
