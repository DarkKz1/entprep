import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaywallModal from '../PaywallModal';

// Mock useT to return Russian translations directly
vi.mock('../../locales', () => ({
  useT: () => ({
    paywall: {
      dailyLimit: 'Лимит тестов',
      fullent: 'Полный ЕНТ',
      ai: 'AI-помощник',
      dailyLimitDesc: 'Вы исчерпали дневной лимит',
      fullentDesc: 'Симуляция ЕНТ доступна в Premium',
      aiDesc: 'AI доступен в Premium',
      unlimitedTests: 'Безлимитные тесты',
      aiErrors: 'AI-разбор ошибок',
      aiPlan: 'Учебный план',
      fullEntSim: 'Полная симуляция ЕНТ',
      price: '1 490 ₸/мес',
      cancelAnytime: 'Отмена в любое время',
      getPremium: 'Оплатить через Kaspi',
      alreadyPaid: 'Я уже оплатил',
    },
  }),
}));

// Mock BottomSheet to render children directly (no portal)
vi.mock('../ui/BottomSheet', () => ({
  default: ({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) => {
    if (!visible) return null;
    return <div data-testid="bottom-sheet">{children}<button data-testid="sheet-close" onClick={onClose} /></div>;
  },
}));

describe('PaywallModal', () => {
  it('renders null when no reason', () => {
    const { container } = render(
      <PaywallModal open={true} reason={null as any} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders null when BottomSheet not visible', () => {
    const { container } = render(
      <PaywallModal open={false} reason="daily_limit" onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows daily_limit title', () => {
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    expect(screen.getByText('Лимит тестов')).toBeInTheDocument();
    expect(screen.getByText('Вы исчерпали дневной лимит')).toBeInTheDocument();
  });

  it('shows fullent title', () => {
    render(<PaywallModal open={true} reason="fullent" onClose={() => {}} />);
    expect(screen.getByText('Полный ЕНТ')).toBeInTheDocument();
  });

  it('shows ai title', () => {
    render(<PaywallModal open={true} reason="ai" onClose={() => {}} />);
    expect(screen.getByText('AI-помощник')).toBeInTheDocument();
  });

  it('shows 4 benefit items', () => {
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    expect(screen.getByText('Безлимитные тесты')).toBeInTheDocument();
    expect(screen.getByText('AI-разбор ошибок')).toBeInTheDocument();
    expect(screen.getByText('Учебный план')).toBeInTheDocument();
    expect(screen.getByText('Полная симуляция ЕНТ')).toBeInTheDocument();
  });

  it('shows price', () => {
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    expect(screen.getByText('1 490 ₸/мес')).toBeInTheDocument();
  });

  it('calls onClose when "already paid" clicked', () => {
    const onClose = vi.fn();
    render(<PaywallModal open={true} reason="daily_limit" onClose={onClose} />);
    fireEvent.click(screen.getByText('Я уже оплатил'));
    expect(onClose).toHaveBeenCalled();
  });

  it('opens Kaspi link on pay button', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    fireEvent.click(screen.getByText(/Оплатить через Kaspi/));
    expect(openSpy).toHaveBeenCalledWith('https://kaspi.kz/pay/entprep', '_blank');
    openSpy.mockRestore();
  });
});
