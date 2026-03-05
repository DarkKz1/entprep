import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Card from '../ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Hello</Card>);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('renders as div by default', () => {
    const { container } = render(<Card>Content</Card>);
    expect(container.querySelector('div')).toBeTruthy();
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders as button when onClick provided', () => {
    const { container } = render(<Card onClick={() => {}}>Clickable</Card>);
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('fires onClick', () => {
    let clicked = false;
    render(<Card onClick={() => { clicked = true; }}>Click</Card>);
    fireEvent.click(screen.getByText('Click'));
    expect(clicked).toBe(true);
  });

  it('applies custom style', () => {
    const { container } = render(<Card style={{ marginTop: 20 }}>Styled</Card>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.marginTop).toBe('20px');
  });

  it('sets cursor pointer when clickable', () => {
    const { container } = render(<Card onClick={() => {}}>Go</Card>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.cursor).toBe('pointer');
  });

  it('fires mouse enter/leave', () => {
    let entered = false;
    let left = false;
    render(
      <Card onMouseEnter={() => { entered = true; }} onMouseLeave={() => { left = true; }}>
        Hover
      </Card>
    );
    const el = screen.getByText('Hover');
    fireEvent.mouseEnter(el);
    expect(entered).toBe(true);
    fireEvent.mouseLeave(el);
    expect(left).toBe(true);
  });
});
