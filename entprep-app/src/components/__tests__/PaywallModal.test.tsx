import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaywallModal from '../PaywallModal';

vi.mock('../../config/payment', () => ({
  KASPI_ENABLED: true,
  KASPI_MERCHANT_ID: 'test',
  KASPI_PAY_URL: 'https://kaspi.kz/pay/test',
  PLANS: { monthly: { amount: 1990 }, yearly: { amount: 4990 } },
  getKaspiPayUrl: (plan: string) => `https://kaspi.kz/pay/test?amount=${plan === 'monthly' ? 1990 : 4990}`,
}));

vi.mock('../../locales', () => ({
  useT: () => ({
    paywall: {
      dailyLimit: 'Лимит тестов',
      fullent: 'Полный ЕНТ',
      ai: 'AI-помощник',
      dailyLimitDesc: 'Вы исчерпали дневной лимит',
      fullentDesc: 'Симуляция ЕНТ доступна в Premium',
      aiDesc: 'AI доступен в Premium',
      unlimitedAI: 'Безлимитный AI-разбор',
      aiErrors: 'AI-план подготовки',
      aiPlan: 'Полная симуляция ЕНТ',
      fullEntSim: 'Приоритетная поддержка',
      monthlyPlan: '1 990 ₸/мес',
      yearlyPlan: '4 990 ₸',
      yearlyPlanDesc: 'до конца учебного года',
      monthlyLabel: 'Ежемесячно',
      yearlyLabel: 'До конца года',
      yearlyBadge: 'Выгодно',
      getPremium: 'Оплатить через Kaspi',
      alreadyPaid: 'Я уже оплатил',
    },
  }),
}));

vi.mock('../ui/BottomSheet', () => ({
  default: ({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) => {
    if (!visible) return null;
    return <div data-testid="bottom-sheet">{children}<button data-testid="sheet-close" onClick={onClose} /></div>;
  },
}));

describe('PaywallModal', () => {
  it('renders null when no reason', () => {
    const { container } = render(<PaywallModal open={true} reason={null as any} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders null when not visible', () => {
    const { container } = render(<PaywallModal open={false} reason="daily_limit" onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows correct title per reason', () => {
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    expect(screen.getByText('Лимит тестов')).toBeInTheDocument();
  });

  it('shows 4 benefit items', () => {
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    expect(screen.getByText('Безлимитный AI-разбор')).toBeInTheDocument();
    expect(screen.getByText('Приоритетная поддержка')).toBeInTheDocument();
  });

  it('shows two plan options', () => {
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    expect(screen.getByText('1 990 ₸/мес')).toBeInTheDocument();
    expect(screen.getByText('4 990 ₸')).toBeInTheDocument();
  });

  it('calls onClose when "already paid" clicked', () => {
    const onClose = vi.fn();
    render(<PaywallModal open={true} reason="daily_limit" onClose={onClose} />);
    fireEvent.click(screen.getByText('Я уже оплатил'));
    expect(onClose).toHaveBeenCalled();
  });

  it('opens Kaspi link with yearly plan by default', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    fireEvent.click(screen.getByText(/Оплатить через Kaspi/));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('amount=4990'), '_blank');
    openSpy.mockRestore();
  });

  it('switches to monthly plan', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    fireEvent.click(screen.getByText('Ежемесячно'));
    fireEvent.click(screen.getByText(/Оплатить через Kaspi/));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('amount=1990'), '_blank');
    openSpy.mockRestore();
  });
});
