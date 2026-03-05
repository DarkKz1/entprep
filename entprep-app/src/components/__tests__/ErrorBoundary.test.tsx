import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

vi.mock('../../config/sentry', () => ({
  captureError: vi.fn(),
}));

// Suppress React error boundary console.error noise in tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function Bomb({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Boom!');
  return <div>Safe content</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>OK</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('shows error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    // Should show the error message
    expect(screen.getByText('Boom!')).toBeInTheDocument();
    // Should show reload button (always present)
    expect(screen.getByRole('button', { name: /Перезагрузить/i })).toBeInTheDocument();
  });

  it('shows custom title and message', () => {
    render(
      <ErrorBoundary title="Oops" message="Something broke">
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText('Oops')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('shows Go Back button when onRecover provided', () => {
    const onRecover = vi.fn();
    render(
      <ErrorBoundary onRecover={onRecover}>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText(/Назад/i)).toBeInTheDocument();
  });

  it('does not show Go Back when no onRecover', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.queryByText(/Назад/i)).toBeNull();
  });

  it('calls onRecover and resets state when Go Back clicked', () => {
    const onRecover = vi.fn();
    const { rerender } = render(
      <ErrorBoundary onRecover={onRecover}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Boom!')).toBeInTheDocument();

    // Click Go Back — resets error state
    fireEvent.click(screen.getByText(/Назад/i));
    expect(onRecover).toHaveBeenCalled();
  });

  it('calls captureError on catch', async () => {
    const { captureError } = await import('../../config/sentry');
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(captureError).toHaveBeenCalled();
  });
});
