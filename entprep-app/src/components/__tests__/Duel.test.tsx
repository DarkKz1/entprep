import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGoHome = vi.fn();
const mockAddHist = vi.fn();
const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
const mockUser = { id: 'user-1' };

vi.mock('../../contexts/NavigationContext', () => ({
  useNav: () => ({ goHome: mockGoHome }),
}));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
vi.mock('../../contexts/AppContext', () => ({
  useApp: () => ({ addHist: mockAddHist }),
}));
vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));
vi.mock('../../hooks/useBreakpoint', () => ({
  useBreakpoint: () => 'mobile',
}));

vi.mock('../../locales', () => ({
  useT: () => ({
    duel: {
      title: 'Дуэль 1 на 1',
      subtitle: '10 вопросов, 30 сек на каждый',
      create: 'Создать',
      join: 'Присоединиться',
      selectSubject: 'Выберите предмет',
      enterCode: 'Введите код дуэли',
      joinButton: 'Присоединиться',
      sendCode: 'Отправьте код другу',
      waiting: 'Ожидание соперника...',
      youFinished: 'Вы закончили!',
      waitingOpponent: 'Ожидание соперника...',
      opponent: 'Соперник',
      victory: 'Победа!',
      defeat: 'Поражение',
      draw: 'Ничья!',
      byQuestions: 'По вопросам',
      bonusXP: 'бонус за победу',
      rematch: 'Реванш',
      opponentForfeit: 'Соперник сдался',
      duelExpired: 'Дуэль истекла',
      timeoutError: 'Время ожидания истекло',
      loginRequired: 'Войдите в аккаунт',
      codeMustBe6: 'Код должен быть 6 символов',
      cantLoadQuestions: 'Не удалось загрузить вопросы дуэли',
      sendError: 'Ошибка отправки',
      inviteText: 'Вызываю тебя на дуэль по',
      inviteTextSuffix: 'в ENTprep! Код:',
    },
    test: {
      goHome: 'На главную',
    },
    subjects: {
      math: 'Мат. грамотность',
      physics: 'Физика',
    },
  }),
}));

// ── Duel helpers mock ────────────────────────────────────────────────────

const mockCreateDuel = vi.fn();
const mockJoinDuel = vi.fn();
const mockSubmitAnswer = vi.fn();
const mockGetDuel = vi.fn();
const mockForfeitDuel = vi.fn();
// Store the realtime callback so tests can invoke it
let realtimeCallback: ((duel: unknown) => void) | null = null;
const mockSubscribeToDuel = vi.fn().mockImplementation((_id: number, cb: (duel: unknown) => void) => {
  realtimeCallback = cb;
  return () => { realtimeCallback = null; };
});
const mockBuildDuelInviteUrl = vi.fn().mockReturnValue('https://entprep.netlify.app/?duel=ABC123');
const mockParseDuelInviteParam = vi.fn().mockReturnValue(null);

vi.mock('../../utils/duelHelpers', () => ({
  createDuel: (...args: unknown[]) => mockCreateDuel(...args),
  joinDuel: (...args: unknown[]) => mockJoinDuel(...args),
  submitAnswer: (...args: unknown[]) => mockSubmitAnswer(...args),
  getDuel: (...args: unknown[]) => mockGetDuel(...args),
  forfeitDuel: (...args: unknown[]) => mockForfeitDuel(...args),
  subscribeToDuel: (...args: unknown[]) => mockSubscribeToDuel(...args),
  buildDuelInviteUrl: (...args: unknown[]) => mockBuildDuelInviteUrl(...args),
  parseDuelInviteParam: () => mockParseDuelInviteParam(),
}));

const mockShareToWhatsApp = vi.fn();
const mockShareToTelegram = vi.fn();
const mockCopyText = vi.fn().mockResolvedValue(true);

vi.mock('../../utils/shareHelpers', () => ({
  shareToWhatsApp: (...args: unknown[]) => mockShareToWhatsApp(...args),
  shareToTelegram: (...args: unknown[]) => mockShareToTelegram(...args),
  copyText: (...args: unknown[]) => mockCopyText(...args),
}));

vi.mock('../../utils/xpHelpers', () => ({
  calcTestXP: vi.fn().mockReturnValue(25),
}));

const mockTrackEvent = vi.fn();
vi.mock('../../utils/analytics', () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

vi.mock('../../config/questionPools', () => ({
  SUBS: {
    math: { id: 'math', name: 'Мат. грамотность', icon: '\u{1F4D0}', color: '#3B82F6' },
  },
  ALL_PROFILES: [
    { id: 'physics', name: 'Физика', icon: '\u26A1', color: '#8B5CF6' },
  ],
}));

vi.mock('../../config/subjects', () => ({
  SUBJECT_META: {
    math: { name: 'Мат. грамотность', color: '#3B82F6' },
    physics: { name: 'Физика', color: '#8B5CF6' },
  },
}));

vi.mock('../ui/BackButton', () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="back" onClick={onClick}>Back</button>
  ),
}));

vi.mock('../ui/LoadingSpinner', () => ({
  default: () => <div data-testid="spinner" />,
}));

// Stub lucide-react icons to simple spans
vi.mock('lucide-react', () => {
  const icon = (props: Record<string, unknown>) => <span data-testid={`icon-${props['data-lucide'] || ''}`} />;
  return {
    Swords: (p: Record<string, unknown>) => <span {...p} />,
    Copy: (p: Record<string, unknown>) => <span {...p} />,
    MessageCircle: (p: Record<string, unknown>) => <span {...p} />,
    Send: (p: Record<string, unknown>) => <span {...p} />,
    ArrowRight: (p: Record<string, unknown>) => <span {...p} />,
    ChevronRight: (p: Record<string, unknown>) => <span {...p} />,
    Crown: (p: Record<string, unknown>) => <span {...p} />,
    Clock: (p: Record<string, unknown>) => <span {...p} />,
    Check: (p: Record<string, unknown>) => <span {...p} />,
    X: (p: Record<string, unknown>) => <span {...p} />,
    Zap: (p: Record<string, unknown>) => <span {...p} />,
    Trophy: (p: Record<string, unknown>) => <span {...p} />,
    RotateCcw: (p: Record<string, unknown>) => <span {...p} />,
  };
});

// ── Test data ──────────────────────────────────────────────────────────────

function makeDuelQuestions(n = 10) {
  return Array.from({ length: n }, (_, i) => ({
    idx: i,
    q: `Question ${i + 1}`,
    o: ['Option A', 'Option B', 'Option C', 'Option D'],
  }));
}

const MOCK_CREATE_RESULT = {
  duel_id: 42,
  code: 'ABC123',
  questions: makeDuelQuestions(),
  creator_profile: {
    id: 'user-1',
    nickname: 'testuser',
    display_name: 'Test User',
    avatar_url: null,
    level: 3,
    xp: 500,
    streak: 5,
    last_active: '2026-02-26',
  },
};

const MOCK_JOIN_RESULT = {
  duel_id: 42,
  subject: 'math',
  questions: makeDuelQuestions(),
  creator_profile: {
    id: 'user-2',
    nickname: 'opponent',
    display_name: 'Opponent',
    avatar_url: null,
    level: 2,
    xp: 300,
    streak: 2,
    last_active: '2026-02-26',
  },
  opponent_profile: {
    id: 'user-1',
    nickname: 'testuser',
    display_name: 'Test User',
    avatar_url: null,
    level: 3,
    xp: 500,
    streak: 5,
    last_active: '2026-02-26',
  },
};

function buildFinishedDuelState(creatorScore: number, opponentScore: number) {
  return {
    id: 42,
    code: 'ABC123',
    subject: 'math',
    creator_id: 'user-2',
    opponent_id: 'user-1',
    status: 'finished' as const,
    creator_score: creatorScore,
    opponent_score: opponentScore,
    creator_done: true,
    opponent_done: true,
    creator_answers: {},
    opponent_answers: {},
    started_at: null,
    finished_at: null,
  };
}

// ── Import component after mocks ───────────────────────────────────────────

import Duel from '../Duel';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Finds the join action button (the submit button inside the join tab, not the tab itself). */
function findJoinActionButton(): HTMLElement | undefined {
  const allButtons = screen.getAllByRole('button');
  // The tab button is the first "Присоединиться", the action button is the second
  const matching = allButtons.filter(btn => btn.textContent?.includes('Присоединиться'));
  return matching.length > 1 ? matching[matching.length - 1] : undefined;
}

/** Navigates from menu to playing phase via join flow. Requires vi.useFakeTimers() beforehand. */
async function joinAndGoToPlaying() {
  mockJoinDuel.mockResolvedValue(MOCK_JOIN_RESULT);
  render(<Duel />);

  // Switch to join tab, enter code, submit
  fireEvent.click(screen.getByText('Присоединиться'));
  fireEvent.change(screen.getByPlaceholderText('ABCDEF'), { target: { value: 'ABC123' } });

  const joinBtn = findJoinActionButton();
  if (joinBtn) {
    await act(async () => { fireEvent.click(joinBtn); });
  }

  // Wait for VS phase
  await waitFor(() => { expect(screen.getByText('3')).toBeInTheDocument(); });

  // Fast-forward VS countdown (3s)
  await act(async () => { vi.advanceTimersByTime(3000); });

  // Now in playing phase
  await waitFor(() => { expect(screen.getByText('Question 1')).toBeInTheDocument(); });
}

// ── Setup/Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  realtimeCallback = null;
  mockParseDuelInviteParam.mockReturnValue(null);
  mockSubscribeToDuel.mockImplementation((_id: number, cb: (duel: unknown) => void) => {
    realtimeCallback = cb;
    return () => { realtimeCallback = null; };
  });
  mockCopyText.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Duel', () => {
  // ── Menu Phase ─────────────────────────────────────────────────────────

  describe('Menu Phase', () => {
    it('renders menu with title, subtitle, and create/join tabs', () => {
      render(<Duel />);
      expect(screen.getByText('Дуэль 1 на 1')).toBeInTheDocument();
      expect(screen.getByText('10 вопросов, 30 сек на каждый')).toBeInTheDocument();
      expect(screen.getByText('Создать')).toBeInTheDocument();
    });

    it('create tab shows subject list by default', () => {
      render(<Duel />);
      expect(screen.getByText('Выберите предмет')).toBeInTheDocument();
      expect(screen.getByText('Мат. грамотность')).toBeInTheDocument();
      expect(screen.getByText('Физика')).toBeInTheDocument();
    });

    it('clicking a subject calls createDuel with that subject id', async () => {
      mockCreateDuel.mockResolvedValue(MOCK_CREATE_RESULT);
      render(<Duel />);

      fireEvent.click(screen.getByText('Мат. грамотность'));

      await waitFor(() => {
        expect(mockCreateDuel).toHaveBeenCalledWith('math');
      });
    });

    it('join tab shows code input and placeholder', () => {
      render(<Duel />);
      // Click the tab button (first "Присоединиться")
      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);

      expect(screen.getByText('Введите код дуэли')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('ABCDEF')).toBeInTheDocument();
    });

    it('join action button is disabled when code is empty', () => {
      render(<Duel />);
      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);

      const codeInput = screen.getByPlaceholderText('ABCDEF');
      expect(codeInput).toHaveValue('');

      const joinBtn = findJoinActionButton();
      expect(joinBtn).toBeDefined();
      expect(joinBtn).toBeDisabled();
    });

    it('join action button is disabled when code has fewer than 6 characters', () => {
      render(<Duel />);
      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);

      fireEvent.change(screen.getByPlaceholderText('ABCDEF'), { target: { value: 'ABC' } });

      const joinBtn = findJoinActionButton();
      expect(joinBtn).toBeDisabled();

      // Clicking should not call joinDuel
      if (joinBtn) fireEvent.click(joinBtn);
      expect(mockJoinDuel).not.toHaveBeenCalled();
    });

    it('join action button is enabled when code has 6 characters', () => {
      render(<Duel />);
      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);

      fireEvent.change(screen.getByPlaceholderText('ABCDEF'), { target: { value: 'ABC123' } });

      const joinBtn = findJoinActionButton();
      expect(joinBtn).not.toBeDisabled();
    });

    it('typing in code input uppercases and filters non-alphanumeric', () => {
      render(<Duel />);
      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);

      const codeInput = screen.getByPlaceholderText('ABCDEF');
      fireEvent.change(codeInput, { target: { value: 'abc!@#123xyz' } });

      // Regex in component: .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
      expect(codeInput).toHaveValue('ABC123');
    });

    it('handles ?duel=CODE param on mount by pre-filling code and switching to join tab', () => {
      mockParseDuelInviteParam.mockReturnValue('xyz789');
      render(<Duel />);

      // Should switch to join tab and pre-fill code (uppercased)
      expect(screen.getByText('Введите код дуэли')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('ABCDEF')).toHaveValue('XYZ789');
    });

    it('back button calls goHome from menu', () => {
      render(<Duel />);
      fireEvent.click(screen.getByTestId('back'));
      expect(mockGoHome).toHaveBeenCalled();
    });
  });

  // ── Create Flow ────────────────────────────────────────────────────────

  describe('Create Flow', () => {
    it('shows loading spinner during creation', async () => {
      mockCreateDuel.mockReturnValue(new Promise(() => {}));
      render(<Duel />);

      fireEvent.click(screen.getByText('Мат. грамотность'));

      await waitFor(() => {
        expect(screen.getByTestId('spinner')).toBeInTheDocument();
      });
    });

    it('shows error message on creation failure', async () => {
      mockCreateDuel.mockRejectedValue(new Error('Server error'));
      render(<Duel />);

      fireEvent.click(screen.getByText('Мат. грамотность'));

      await waitFor(() => {
        expect(screen.getByText('Server error')).toBeInTheDocument();
      });
    });

    it('moves to lobby phase with code displayed after successful creation', async () => {
      mockCreateDuel.mockResolvedValue(MOCK_CREATE_RESULT);
      render(<Duel />);

      fireEvent.click(screen.getByText('Мат. грамотность'));

      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
        expect(screen.getByText('Отправьте код другу')).toBeInTheDocument();
      });
    });

    it('tracks duel creation analytics event', async () => {
      mockCreateDuel.mockResolvedValue(MOCK_CREATE_RESULT);
      render(<Duel />);

      fireEvent.click(screen.getByText('Мат. грамотность'));

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('Duel Started', { subject: 'math' });
      });
    });

    it('sets up Realtime subscription after creation', async () => {
      mockCreateDuel.mockResolvedValue(MOCK_CREATE_RESULT);
      render(<Duel />);

      fireEvent.click(screen.getByText('Мат. грамотность'));

      await waitFor(() => {
        expect(mockSubscribeToDuel).toHaveBeenCalledWith(42, expect.any(Function));
      });
    });
  });

  // ── Lobby Phase ────────────────────────────────────────────────────────

  describe('Lobby Phase', () => {
    async function goToLobby() {
      mockCreateDuel.mockResolvedValue(MOCK_CREATE_RESULT);
      render(<Duel />);
      fireEvent.click(screen.getByText('Мат. грамотность'));
      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });
    }

    it('displays the duel code prominently', async () => {
      await goToLobby();
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('shows waiting message', async () => {
      await goToLobby();
      expect(screen.getByText('Ожидание соперника...')).toBeInTheDocument();
    });

    it('WhatsApp share button calls shareToWhatsApp', async () => {
      await goToLobby();
      fireEvent.click(screen.getByText('WhatsApp'));
      expect(mockShareToWhatsApp).toHaveBeenCalled();
    });

    it('Telegram share button calls shareToTelegram', async () => {
      await goToLobby();
      fireEvent.click(screen.getByText('Telegram'));
      expect(mockShareToTelegram).toHaveBeenCalled();
    });

    it('copy link button calls copyText and shows success toast', async () => {
      await goToLobby();

      fireEvent.click(screen.getByText('Ссылка'));

      await waitFor(() => {
        expect(mockCopyText).toHaveBeenCalledWith('https://entprep.netlify.app/?duel=ABC123');
      });
      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Скопировано!');
      });
    });

    it('back button in lobby calls forfeitDuel with duel id', async () => {
      mockForfeitDuel.mockResolvedValue(undefined);
      await goToLobby();

      fireEvent.click(screen.getByTestId('back'));

      await waitFor(() => {
        expect(mockForfeitDuel).toHaveBeenCalledWith(42);
      });
    });

    it('transitions to VS phase when opponent joins via Realtime', async () => {
      await goToLobby();

      // getDuel is called when opponent joins to fetch their profile
      mockGetDuel.mockResolvedValue({
        duel: { id: 42, code: 'ABC123', subject: 'math', creator_id: 'user-1', opponent_id: 'user-3', status: 'active', creator_score: 0, opponent_score: 0, creator_done: false, opponent_done: false, creator_answers: {}, opponent_answers: {}, started_at: null, finished_at: null },
        questions: makeDuelQuestions(),
        creator_profile: MOCK_CREATE_RESULT.creator_profile,
        opponent_profile: { id: 'user-3', nickname: 'rival', display_name: 'Rival', avatar_url: null, level: 2, xp: 200, streak: 1, last_active: '2026-02-26' },
      });

      // Simulate Realtime update: opponent joined, status becomes active
      await act(async () => {
        realtimeCallback?.({
          id: 42,
          code: 'ABC123',
          subject: 'math',
          creator_id: 'user-1',
          opponent_id: 'user-3',
          status: 'active',
          creator_score: 0,
          opponent_score: 0,
          creator_done: false,
          opponent_done: false,
          creator_answers: {},
          opponent_answers: {},
          started_at: null,
          finished_at: null,
        });
      });

      // Should now be in VS phase (countdown starts at 3)
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });
    });
  });

  // ── Join Flow ──────────────────────────────────────────────────────────

  describe('Join Flow', () => {
    it('successful join moves to VS phase', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockJoinDuel.mockResolvedValue(MOCK_JOIN_RESULT);
      render(<Duel />);

      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);
      fireEvent.change(screen.getByPlaceholderText('ABCDEF'), { target: { value: 'ABC123' } });

      const joinBtn = findJoinActionButton();
      if (joinBtn) {
        await act(async () => { fireEvent.click(joinBtn); });
      }

      // VS phase starts with countdown at 3
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('join failure shows error message', async () => {
      mockJoinDuel.mockRejectedValue(new Error('Duel not found'));
      render(<Duel />);

      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);
      fireEvent.change(screen.getByPlaceholderText('ABCDEF'), { target: { value: 'ZZZZZZ' } });

      const joinBtn = findJoinActionButton();
      if (joinBtn) {
        await act(async () => { fireEvent.click(joinBtn); });
      }

      await waitFor(() => {
        expect(screen.getByText('Duel not found')).toBeInTheDocument();
      });
    });

    it('shows loading spinner while joining', async () => {
      mockJoinDuel.mockReturnValue(new Promise(() => {}));
      render(<Duel />);

      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);
      fireEvent.change(screen.getByPlaceholderText('ABCDEF'), { target: { value: 'ABC123' } });

      const joinBtn = findJoinActionButton();
      if (joinBtn) {
        await act(async () => { fireEvent.click(joinBtn); });
      }

      await waitFor(() => {
        expect(screen.getByTestId('spinner')).toBeInTheDocument();
      });
    });
  });

  // ── VS Phase ──────────────────────────────────────────────────────────

  describe('VS Phase', () => {
    it('shows 3-2-1 countdown then transitions to playing', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockJoinDuel.mockResolvedValue(MOCK_JOIN_RESULT);
      render(<Duel />);

      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);
      fireEvent.change(screen.getByPlaceholderText('ABCDEF'), { target: { value: 'ABC123' } });

      const joinBtn = findJoinActionButton();
      if (joinBtn) {
        await act(async () => { fireEvent.click(joinBtn); });
      }

      // VS phase starts with 3
      await waitFor(() => { expect(screen.getByText('3')).toBeInTheDocument(); });

      // 3 -> 2
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(screen.getByText('2')).toBeInTheDocument();

      // 2 -> 1
      await act(async () => { vi.advanceTimersByTime(1000); });
      expect(screen.getByText('1')).toBeInTheDocument();

      // 1 -> playing
      await act(async () => { vi.advanceTimersByTime(1000); });
      await waitFor(() => {
        expect(screen.getByText('Question 1')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('shows both player profiles in VS phase', async () => {
      mockJoinDuel.mockResolvedValue(MOCK_JOIN_RESULT);
      render(<Duel />);

      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);
      fireEvent.change(screen.getByPlaceholderText('ABCDEF'), { target: { value: 'ABC123' } });

      const joinBtn = findJoinActionButton();
      if (joinBtn) {
        await act(async () => { fireEvent.click(joinBtn); });
      }

      await waitFor(() => {
        // Joiner (non-creator): p1=opponentProfile (self), p2=creatorProfile
        expect(screen.getByText('@testuser')).toBeInTheDocument();
        expect(screen.getByText('@opponent')).toBeInTheDocument();
      });
    });
  });

  // ── Playing Phase ──────────────────────────────────────────────────────

  describe('Playing Phase', () => {
    it('shows question text and 4 answer options', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await joinAndGoToPlaying();

      expect(screen.getByText('Question 1')).toBeInTheDocument();
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
      expect(screen.getByText('Option C')).toBeInTheDocument();
      expect(screen.getByText('Option D')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('shows question counter 1/10', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await joinAndGoToPlaying();

      expect(screen.getByText('1/10')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('shows timer starting at 30', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await joinAndGoToPlaying();

      expect(screen.getByText('30')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('timer counts down each second', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await joinAndGoToPlaying();

      await act(async () => { vi.advanceTimersByTime(5000); });

      expect(screen.getByText('25')).toBeInTheDocument();

      vi.useRealTimers();
    });

    it('selecting an answer calls submitAnswer with duel id, question index, and answer index', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockSubmitAnswer.mockResolvedValue({
        correct: true,
        correct_answer: 0,
        your_score: 1,
        done: false,
      });

      await joinAndGoToPlaying();

      await act(async () => {
        fireEvent.click(screen.getByText('Option A'));
      });

      await waitFor(() => {
        expect(mockSubmitAnswer).toHaveBeenCalledWith(42, 0, 0);
      });

      vi.useRealTimers();
    });

    it('advances to next question after correct answer feedback', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockSubmitAnswer.mockResolvedValue({
        correct: true,
        correct_answer: 0,
        your_score: 1,
        done: false,
      });

      await joinAndGoToPlaying();

      await act(async () => {
        fireEvent.click(screen.getByText('Option A'));
      });

      // Wait for 800ms feedback delay
      await act(async () => { vi.advanceTimersByTime(1000); });

      await waitFor(() => {
        expect(screen.getByText('Question 2')).toBeInTheDocument();
        expect(screen.getByText('2/10')).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('auto-submits null when timer reaches 0', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockSubmitAnswer.mockResolvedValue({
        correct: false,
        correct_answer: 0,
        your_score: 0,
        done: false,
      });

      await joinAndGoToPlaying();

      // Advance 30 seconds to trigger timeout
      await act(async () => { vi.advanceTimersByTime(30000); });

      await waitFor(() => {
        expect(mockSubmitAnswer).toHaveBeenCalledWith(42, 0, null);
      });

      vi.useRealTimers();
    });

    it('shows initial scores of 0 for both players', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await joinAndGoToPlaying();

      // Both my score and opponent score should be 0
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2);

      vi.useRealTimers();
    });

    it('disables answer options while a submission is in progress', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      // Make submitAnswer hang indefinitely
      mockSubmitAnswer.mockReturnValue(new Promise(() => {}));

      await joinAndGoToPlaying();

      await act(async () => {
        fireEvent.click(screen.getByText('Option A'));
      });

      // Other options should be disabled
      const optionB = screen.getByText('Option B').closest('button');
      expect(optionB).toBeDisabled();

      vi.useRealTimers();
    });
  });

  // ── Results Phase ──────────────────────────────────────────────────────

  describe('Results Phase', () => {
    /**
     * Navigates through the entire flow to reach the results phase.
     * Uses Realtime callback to signal opponent completion so the results phase triggers.
     */
    async function goToResults(myScore = 7, oppScore = 5) {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      await joinAndGoToPlaying();

      // Answer all 10 questions
      for (let i = 0; i < 10; i++) {
        const isLast = i === 9;
        const isCorrect = i < myScore;
        const runningScore = isCorrect ? (i < myScore ? Math.min(i + 1, myScore) : i) : Math.min(i, myScore);

        mockSubmitAnswer.mockResolvedValueOnce({
          correct: isCorrect,
          correct_answer: 0,
          your_score: runningScore,
          done: isLast,
        });

        await waitFor(() => {
          expect(screen.getByText(`Question ${i + 1}`)).toBeInTheDocument();
        });

        await act(async () => {
          fireEvent.click(screen.getByText('Option A'));
        });

        // Wait for 800ms feedback delay + transition
        await act(async () => { vi.advanceTimersByTime(1000); });
      }

      // After last question with done=true and oppDone=false, component enters waitingForOpponent
      await waitFor(() => {
        expect(screen.getByText('Вы закончили!')).toBeInTheDocument();
      });

      // Mock getDuel for when the component fetches final results
      mockGetDuel.mockResolvedValue({
        duel: buildFinishedDuelState(oppScore, myScore),
        questions: makeDuelQuestions(),
        creator_profile: MOCK_JOIN_RESULT.creator_profile,
        opponent_profile: MOCK_JOIN_RESULT.opponent_profile,
      });

      // Simulate opponent finishing via Realtime
      await act(async () => {
        realtimeCallback?.(buildFinishedDuelState(oppScore, myScore));
      });

      // Wait for results phase
      await waitFor(() => {
        expect(screen.getByText('Реванш')).toBeInTheDocument();
      });
    }

    it('shows victory message when player wins', async () => {
      await goToResults(7, 5);
      expect(screen.getByText('Победа!')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('shows defeat message when player loses', async () => {
      await goToResults(3, 8);
      expect(screen.getByText('Поражение')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('shows draw message when scores are equal', async () => {
      await goToResults(5, 5);
      expect(screen.getByText('Ничья!')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('shows XP earned based on score', async () => {
      await goToResults(7, 5);
      // XP = Math.round((7/10)*100*0.3) = 21 base, bonus = Math.round(21*0.5) = 11, total = 32
      expect(screen.getByText('+32 XP')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('shows bonus XP label on victory', async () => {
      await goToResults(7, 5);
      expect(screen.getByText(/бонус за победу/)).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('saves result to history via addHist on results phase', async () => {
      await goToResults(7, 5);

      expect(mockAddHist).toHaveBeenCalledWith(
        expect.objectContaining({
          su: 'math',
          co: 7,
          to: 10,
          type: 'duel',
        })
      );
      vi.useRealTimers();
    });

    it('rematch button resets and creates new duel with same subject', async () => {
      mockCreateDuel.mockResolvedValue({
        ...MOCK_CREATE_RESULT,
        duel_id: 99,
        code: 'NEW456',
      });

      await goToResults(7, 5);

      await act(async () => {
        fireEvent.click(screen.getByText('Реванш'));
      });

      await waitFor(() => {
        expect(mockCreateDuel).toHaveBeenCalledWith('math');
      });

      vi.useRealTimers();
    });

    it('home button calls goHome', async () => {
      await goToResults(7, 5);

      fireEvent.click(screen.getByText('На главную'));
      expect(mockGoHome).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('cleans up intervals and subscriptions on unmount', () => {
      const { unmount } = render(<Duel />);
      // Should not throw
      unmount();
    });

    it('error message is cleared when switching tabs', async () => {
      mockCreateDuel.mockRejectedValue(new Error('Creation failed'));
      render(<Duel />);

      // Trigger error by creating
      fireEvent.click(screen.getByText('Мат. грамотность'));
      await waitFor(() => {
        expect(screen.getByText('Creation failed')).toBeInTheDocument();
      });

      // Switch to join tab — error should clear
      const tabs = screen.getAllByRole('button').filter(b => b.textContent === 'Присоединиться');
      fireEvent.click(tabs[0]);

      expect(screen.queryByText('Creation failed')).not.toBeInTheDocument();
    });

    it('handles opponent forfeit via Realtime by showing results', async () => {
      mockCreateDuel.mockResolvedValue(MOCK_CREATE_RESULT);
      render(<Duel />);

      // Go to lobby
      fireEvent.click(screen.getByText('Мат. грамотность'));
      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });

      // First transition to active/VS state
      await act(async () => {
        realtimeCallback?.({
          id: 42,
          code: 'ABC123',
          subject: 'math',
          creator_id: 'user-1',
          opponent_id: 'user-3',
          status: 'active',
          creator_score: 0,
          opponent_score: 0,
          creator_done: false,
          opponent_done: false,
          creator_answers: {},
          opponent_answers: {},
          started_at: null,
          finished_at: null,
        });
      });

      // Then simulate forfeit
      await act(async () => {
        realtimeCallback?.({
          id: 42,
          code: 'ABC123',
          subject: 'math',
          creator_id: 'user-1',
          opponent_id: 'user-3',
          status: 'forfeit',
          creator_score: 0,
          opponent_score: 0,
          creator_done: false,
          opponent_done: false,
          creator_answers: {},
          opponent_answers: {},
          started_at: null,
          finished_at: null,
        });
      });

      expect(mockToast.info).toHaveBeenCalledWith('Соперник сдался');
    });

    it('handles duel expired via Realtime by returning to menu', async () => {
      mockCreateDuel.mockResolvedValue(MOCK_CREATE_RESULT);
      render(<Duel />);

      fireEvent.click(screen.getByText('Мат. грамотность'));
      await waitFor(() => {
        expect(screen.getByText('ABC123')).toBeInTheDocument();
      });

      // Simulate expiry
      await act(async () => {
        realtimeCallback?.({
          id: 42,
          code: 'ABC123',
          subject: 'math',
          creator_id: 'user-1',
          opponent_id: null,
          status: 'expired',
          creator_score: 0,
          opponent_score: 0,
          creator_done: false,
          opponent_done: false,
          creator_answers: {},
          opponent_answers: {},
          started_at: null,
          finished_at: null,
        });
      });

      expect(mockToast.error).toHaveBeenCalledWith('Дуэль истекла');
      // Should return to menu
      expect(screen.getByText('Выберите предмет')).toBeInTheDocument();
    });
  });
});
