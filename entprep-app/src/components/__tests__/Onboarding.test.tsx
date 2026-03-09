import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Onboarding from '../Onboarding';

vi.mock('../../config/questionPools', () => ({
  TOTAL_Q: 28000,
}));

vi.mock('../../locales', () => ({
  useT: () => ({
    back: 'Назад',
    next: 'Далее',
    skip: 'Пропустить',
    onboarding: {
      slide1Title: '28 000+ вопросов',
      slide1Desc: 'Все 13 предметов ЕНТ',
      slide2Title: 'AI-помощник',
      slide2Desc: 'Объяснит любой вопрос',
      slide3Title: 'Полная симуляция ЕНТ',
      slide3Desc: '120 заданий, 5 предметов',
      startPrep: 'Начать подготовку',
      nextSlide: 'Следующий слайд',
      start: 'Начать',
    },
  }),
}));

describe('Onboarding', () => {
  it('renders first slide', () => {
    render(<Onboarding onFinish={() => {}} />);
    expect(screen.getByText('28 000+ вопросов')).toBeInTheDocument();
    expect(screen.getByText('Все 13 предметов ЕНТ')).toBeInTheDocument();
  });

  it('shows ENTprep branding', () => {
    render(<Onboarding onFinish={() => {}} />);
    expect(screen.getByText('ENT')).toBeInTheDocument();
    expect(screen.getByText('prep')).toBeInTheDocument();
  });

  it('shows skip button', () => {
    render(<Onboarding onFinish={() => {}} />);
    expect(screen.getByText('Пропустить')).toBeInTheDocument();
  });

  it('navigates to next slide on click', () => {
    render(<Onboarding onFinish={() => {}} />);
    // Click "Далее" to go to slide 2
    fireEvent.click(screen.getByText('Далее'));
    expect(screen.getByText('AI-помощник')).toBeInTheDocument();
  });

  it('navigates through all 3 slides', () => {
    render(<Onboarding onFinish={() => {}} />);
    // Slide 1
    expect(screen.getByText('28 000+ вопросов')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Далее'));
    // Slide 2
    expect(screen.getByText('AI-помощник')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Далее'));
    // Slide 3 - shows "Начать" instead of "Далее"
    expect(screen.getByText('Полная симуляция ЕНТ')).toBeInTheDocument();
    expect(screen.getByText('Начать')).toBeInTheDocument();
  });

  it('shows back button on slide 2+', () => {
    render(<Onboarding onFinish={() => {}} />);
    // Slide 1: no back button
    expect(screen.queryByLabelText('Назад')).toBeNull();
    // Go to slide 2
    fireEvent.click(screen.getByText('Далее'));
    expect(screen.getByLabelText('Назад')).toBeInTheDocument();
  });

  it('back button returns to previous slide', () => {
    render(<Onboarding onFinish={() => {}} />);
    fireEvent.click(screen.getByText('Далее')); // → slide 2
    fireEvent.click(screen.getByLabelText('Назад')); // → slide 1
    expect(screen.getByText('28 000+ вопросов')).toBeInTheDocument();
  });

  it('calls onFinish on last slide button', () => {
    const onFinish = vi.fn();
    render(<Onboarding onFinish={onFinish} />);
    fireEvent.click(screen.getByText('Далее')); // → 2
    fireEvent.click(screen.getByText('Далее')); // → 3
    fireEvent.click(screen.getByText('Начать'));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('calls onFinish on skip', () => {
    const onFinish = vi.fn();
    render(<Onboarding onFinish={onFinish} />);
    fireEvent.click(screen.getByText('Пропустить'));
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('skip works from any slide', () => {
    const onFinish = vi.fn();
    render(<Onboarding onFinish={onFinish} />);
    fireEvent.click(screen.getByText('Далее')); // → slide 2
    fireEvent.click(screen.getByText('Пропустить'));
    expect(onFinish).toHaveBeenCalledOnce();
  });
});
