import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastContext';

function ToastTrigger({ type = 'error' as const }) {
  const toast = useToast();
  return (
    <div>
      <button onClick={() => toast.error('Error msg')}>error</button>
      <button onClick={() => toast.success('Success msg')}>success</button>
      <button onClick={() => toast.warning('Warning msg')}>warning</button>
      <button onClick={() => toast.info('Info msg')}>info</button>
      <button onClick={() => toast.error('Action toast', { action: () => {}, actionLabel: 'Retry' })}>action</button>
    </div>
  );
}

function renderWithToast() {
  return render(
    <ToastProvider>
      <ToastTrigger />
    </ToastProvider>
  );
}

describe('ToastContext', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <div>Child</div>
      </ToastProvider>
    );
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('throws when useToast used outside provider', () => {
    // Suppress console.error from React
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      render(<ToastTrigger />);
    }).toThrow('useToast must be used within ToastProvider');
  });

  it('shows error toast', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('error'));
    expect(screen.getByText('Error msg')).toBeInTheDocument();
  });

  it('shows success toast', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('success'));
    expect(screen.getByText('Success msg')).toBeInTheDocument();
  });

  it('shows warning toast', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('warning'));
    expect(screen.getByText('Warning msg')).toBeInTheDocument();
  });

  it('shows info toast', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('info'));
    expect(screen.getByText('Info msg')).toBeInTheDocument();
  });

  it('shows action button on toast', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('action'));
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('dismisses toast on close click', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('error'));
    expect(screen.getByText('Error msg')).toBeInTheDocument();
    // Click dismiss (X icon button — last button in the toast)
    const alert = screen.getByRole('alert');
    const dismissBtn = alert.querySelectorAll('button');
    fireEvent.click(dismissBtn[dismissBtn.length - 1]);
    expect(screen.queryByText('Error msg')).toBeNull();
  });

  it('auto-removes toast after duration', () => {
    vi.useFakeTimers();
    renderWithToast();
    fireEvent.click(screen.getByText('error'));
    expect(screen.getByText('Error msg')).toBeInTheDocument();
    // error duration = 4000ms
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.queryByText('Error msg')).toBeNull();
    vi.useRealTimers();
  });

  it('stacks multiple toasts', () => {
    renderWithToast();
    fireEvent.click(screen.getByText('error'));
    fireEvent.click(screen.getByText('success'));
    expect(screen.getByText('Error msg')).toBeInTheDocument();
    expect(screen.getByText('Success msg')).toBeInTheDocument();
  });
});
