import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaywallModal from '../PaywallModal';

vi.mock('../../config/payment', () => ({
  PLANS: { monthly: { amount: 1990 }, yearly: { amount: 4990 } },
  RC_PRODUCT_IDS: { monthly: 'entprep_monthly', yearly: 'entprep_yearly' },
}));

vi.mock('../../config/purchases', () => ({
  isNativePlatform: () => false,
  getOfferings: async () => null,
  purchasePackage: async () => false,
  restorePurchases: async () => false,
}));

vi.mock('../../locales', () => ({
  useT: () => ({
    error: 'Ошибка',
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
      yearlyPlanDesc: 'автопродление раз в год',
      monthlyLabel: 'Ежемесячно',
      yearlyLabel: 'Ежегодно',
      yearlyBadge: 'Выгодно',
      getPremium: 'Подписаться',
      alreadyPaid: 'Восстановить покупку',
      noPurchaseFound: 'Подписка не найдена',
      webOnly: 'Скачать приложение',
      purchasing: 'Оформление...',
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

  it('shows two plan options with fallback prices on web', () => {
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    expect(screen.getByText('1 990 ₸/мес')).toBeInTheDocument();
    expect(screen.getByText('4 990 ₸/год')).toBeInTheDocument();
  });

  it('on web: "already paid" button calls onClose', () => {
    const onClose = vi.fn();
    render(<PaywallModal open={true} reason="daily_limit" onClose={onClose} />);
    fireEvent.click(screen.getByText('Восстановить покупку'));
    expect(onClose).toHaveBeenCalled();
  });

  it('on web: CTA opens store link', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<PaywallModal open={true} reason="daily_limit" onClose={() => {}} />);
    fireEvent.click(screen.getByText(/Скачать приложение/));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('play.google.com'), '_blank');
    openSpy.mockRestore();
  });
});
