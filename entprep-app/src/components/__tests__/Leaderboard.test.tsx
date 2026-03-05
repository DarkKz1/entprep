import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoHome = vi.fn();
const mockNav = vi.fn();
let mockUser: { id: string } | null = { id: 'user-me' };

vi.mock('../../contexts/NavigationContext', () => ({
  useNav: () => ({ goHome: mockGoHome, nav: mockNav }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../../hooks/useBreakpoint', () => ({
  useBreakpoint: () => 'mobile',
}));

const mockT = {
  leaderboard: {
    title: 'Лидерборд',
    subtitle: 'Соревнуйся с другими',
    week: 'Неделя',
    month: 'Месяц',
    allTime: 'Все время',
    allTab: 'Все',
    friendsTab: 'Друзья',
    allSubjects: 'Все предметы',
    noResultsYet: 'Пока нет результатов',
    takeTestHint: 'Пройди тест, чтобы попасть в таблицу',
    noFriendsResults: 'У друзей нет результатов',
    addFriendsHint: 'Добавь друзей, чтобы соревноваться',
    addFriends: 'Добавить друзей',
    test1: 'тест',
    test2: 'теста',
    test5: 'тестов',
  },
  subjects: {
    math: 'Мат. грамотность',
    physics: 'Физика',
  } as Record<string, string>,
  you: 'Вы',
  back: 'Назад',
};

vi.mock('../../locales', () => ({
  useT: () => mockT,
}));

vi.mock('../../utils/socialHelpers', () => ({
  getFriendIds: vi.fn(),
}));

vi.mock('../../config/supabase', () => ({
  supabase: {},
}));

vi.mock('../../config/questionPools', () => ({
  SUBS: {
    math: { id: 'math', name: 'Мат. грамотность', color: '#3B82F6' },
  },
  ALL_PROFILES: [
    { id: 'physics', name: 'Физика', color: '#8B5CF6' },
  ],
}));

vi.mock('../../config/subjects', () => ({
  SUBJECT_META: {},
}));

// Mock UI components to simplify rendering
vi.mock('../ui/BackButton', () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="back-button" onClick={onClick}>Назад</button>
  ),
}));

vi.mock('../ui/EmptyState', () => ({
  default: ({ title, description }: { title?: string; description?: string }) => (
    <div data-testid="empty-state">
      {title && <span>{title}</span>}
      {description && <span>{description}</span>}
    </div>
  ),
}));

vi.mock('../ui/SkeletonCard', () => ({
  default: ({ style }: { style?: React.CSSProperties }) => (
    <div data-testid="skeleton-card" style={style} />
  ),
}));

vi.mock('../ui/Chip', () => ({
  default: ({ children, onClick, active }: { children: React.ReactNode; onClick: () => void; active: boolean }) => (
    <button data-testid="chip" data-active={active} onClick={onClick}>{children}</button>
  ),
}));

vi.mock('../ui/Button', () => ({
  default: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="button" onClick={onClick}>{children}</button>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Trophy: () => <span data-testid="icon-trophy" />,
  Medal: () => <span data-testid="icon-medal" />,
  Users: () => <span data-testid="icon-users" />,
  Activity: () => <span data-testid="icon-activity" />,
  UserPlus: () => <span data-testid="icon-user-plus" />,
}));

// Mock styles constants
vi.mock('../../constants/styles', () => ({
  CARD_COMPACT: {},
  TYPE: { h2: {}, caption: {} },
  COLORS: {
    green: '#22c55e',
    yellow: '#eab308',
    red: '#ef4444',
    accent: '#FF6B35',
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { getFriendIds } from '../../utils/socialHelpers';

function makeRow(overrides: Partial<{
  id: string;
  user_id: string;
  user_name: string;
  nickname: string;
  avatar_url: string;
  subject: string;
  score: number;
  created_at: string;
}> = {}) {
  return {
    id: overrides.id ?? 'row-1',
    user_id: overrides.user_id ?? 'user-1',
    user_name: overrides.user_name ?? 'Alice',
    nickname: overrides.nickname,
    avatar_url: overrides.avatar_url,
    subject: overrides.subject ?? 'math',
    score: overrides.score ?? 80,
    created_at: overrides.created_at ?? '2026-02-20T10:00:00Z',
  };
}

/** Resolve a pending fetch with the given JSON payload */
function respondWithRows(rows: ReturnType<typeof makeRow>[]) {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    json: async () => rows,
  });
}

/** Wait until loading skeletons are gone */
async function waitForLoaded() {
  await waitFor(() => {
    expect(screen.queryAllByTestId('skeleton-card').length).toBe(0);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Lazy-import the component AFTER all vi.mock calls are registered
let Leaderboard: React.ComponentType;

beforeEach(async () => {
  vi.resetModules();

  // Reset mutable mock state
  mockGoHome.mockReset();
  mockNav.mockReset();
  mockUser = { id: 'user-me' };
  (getFriendIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);

  // Default fetch returns empty
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });

  // Dynamic import after mocks are set
  const mod = await import('../Leaderboard');
  Leaderboard = mod.default;
});

describe('Leaderboard', () => {
  // 1
  it('renders loading skeletons initially', () => {
    // Never resolve fetch so component stays in loading state
    global.fetch = vi.fn(() => new Promise(() => {})) as unknown as typeof fetch;
    render(<Leaderboard />);
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons.length).toBe(5);
  });

  // 2
  it('renders leaderboard rows after loading', async () => {
    respondWithRows([
      makeRow({ user_id: 'u1', user_name: 'Alice', score: 90 }),
      makeRow({ user_id: 'u2', user_name: 'Bob', score: 70 }),
    ]);
    render(<Leaderboard />);
    await waitForLoaded();

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  // 3
  it('highlights current user\'s row with accent border', async () => {
    respondWithRows([
      makeRow({ user_id: 'user-me', user_name: 'Me' }),
      makeRow({ user_id: 'u2', user_name: 'Other' }),
    ]);
    render(<Leaderboard />);
    await waitForLoaded();

    // The "Вы" badge is only rendered for current user
    expect(screen.getByText('Вы')).toBeInTheDocument();
  });

  // 4
  it('shows medal icons for top 3', async () => {
    respondWithRows([
      makeRow({ user_id: 'u1', user_name: 'Gold', score: 90 }),
      makeRow({ user_id: 'u2', user_name: 'Silver', score: 80 }),
      makeRow({ user_id: 'u3', user_name: 'Bronze', score: 70 }),
    ]);
    render(<Leaderboard />);
    await waitForLoaded();

    const medals = screen.getAllByTestId('icon-medal');
    expect(medals.length).toBe(3);
  });

  // 5
  it('shows rank number for positions 4+', async () => {
    respondWithRows([
      makeRow({ id: 'r1', user_id: 'u1', user_name: 'A', score: 90 }),
      makeRow({ id: 'r2', user_id: 'u2', user_name: 'B', score: 80 }),
      makeRow({ id: 'r3', user_id: 'u3', user_name: 'C', score: 70 }),
      makeRow({ id: 'r4', user_id: 'u4', user_name: 'D', score: 60 }),
      makeRow({ id: 'r5', user_id: 'u5', user_name: 'E', score: 50 }),
    ]);
    render(<Leaderboard />);
    await waitForLoaded();

    // Positions 4 and 5 should show numeric rank
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    // Medal icons only for top 3
    expect(screen.getAllByTestId('icon-medal').length).toBe(3);
  });

  // 6
  it('aggregates multiple rows per user correctly (testCount, avgScore)', async () => {
    // 3 rows for the same user: scores 80, 90, 100 => avg 90, count 3
    respondWithRows([
      makeRow({ id: 'r1', user_id: 'u1', user_name: 'Alice', score: 80 }),
      makeRow({ id: 'r2', user_id: 'u1', user_name: 'Alice', score: 90 }),
      makeRow({ id: 'r3', user_id: 'u1', user_name: 'Alice', score: 100 }),
    ]);
    render(<Leaderboard />);
    await waitForLoaded();

    // Average = (80+90+100)/3 = 90
    expect(screen.getByText('90%')).toBeInTheDocument();
    // 3 теста (plural form)
    expect(screen.getByText('3 теста')).toBeInTheDocument();
  });

  // 7
  it('sorts by testCount desc, then avgScore desc', async () => {
    // User A: 2 tests, avg 70; User B: 3 tests, avg 60; User C: 2 tests, avg 90
    // Expected order: B (3 tests) > C (2 tests, 90 avg) > A (2 tests, 70 avg)
    respondWithRows([
      makeRow({ id: 'r1', user_id: 'uA', user_name: 'UserA', score: 70 }),
      makeRow({ id: 'r2', user_id: 'uA', user_name: 'UserA', score: 70 }),
      makeRow({ id: 'r3', user_id: 'uB', user_name: 'UserB', score: 60 }),
      makeRow({ id: 'r4', user_id: 'uB', user_name: 'UserB', score: 60 }),
      makeRow({ id: 'r5', user_id: 'uB', user_name: 'UserB', score: 60 }),
      makeRow({ id: 'r6', user_id: 'uC', user_name: 'UserC', score: 90 }),
      makeRow({ id: 'r7', user_id: 'uC', user_name: 'UserC', score: 90 }),
    ]);
    render(<Leaderboard />);
    await waitForLoaded();

    const names = screen.getAllByText(/^User[ABC]$/);
    expect(names[0].textContent).toBe('UserB');
    expect(names[1].textContent).toBe('UserC');
    expect(names[2].textContent).toBe('UserA');
  });

  // 8
  it('caps at 50 entries', async () => {
    // Create 55 distinct users
    const rows = Array.from({ length: 55 }, (_, i) =>
      makeRow({ id: `r${i}`, user_id: `u${i}`, user_name: `Player${i}`, score: 80 }),
    );
    respondWithRows(rows);
    render(<Leaderboard />);
    await waitForLoaded();

    // Should only show 50 user rows (each has an Activity icon)
    const activityIcons = screen.getAllByTestId('icon-activity');
    expect(activityIcons.length).toBe(50);
  });

  // 9
  it('shows empty state when no results', async () => {
    respondWithRows([]);
    render(<Leaderboard />);
    await waitForLoaded();

    expect(screen.getByText('Пока нет результатов')).toBeInTheDocument();
    expect(screen.getByText('Пройди тест, чтобы попасть в таблицу')).toBeInTheDocument();
  });

  // 10
  it('shows friends empty state with "add friends" button when friends scope is empty', async () => {
    (getFriendIds as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // First call: default "all" scope fetch (may or may not have data)
    // Second call: friends scope fetch (empty)
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ json: async () => [] })
      .mockResolvedValueOnce({ json: async () => [] });

    render(<Leaderboard />);
    await waitForLoaded();

    // Click "Друзья" tab to switch scope
    const friendsTab = screen.getByText('Друзья');
    fireEvent.click(friendsTab);

    await waitFor(() => {
      expect(screen.getByText('У друзей нет результатов')).toBeInTheDocument();
    });
    expect(screen.getByText('Добавить друзей')).toBeInTheDocument();

    // Clicking "Добавить друзей" navigates to friends screen
    fireEvent.click(screen.getByText('Добавить друзей'));
    expect(mockNav).toHaveBeenCalledWith('friends');
  });

  // 11
  it('switching period filter re-fetches data', async () => {
    respondWithRows([]);
    render(<Leaderboard />);
    await waitForLoaded();

    const firstCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    // Provide another response for the re-fetch
    respondWithRows([]);

    // Click "Месяц" period chip
    fireEvent.click(screen.getByText('Месяц'));

    await waitFor(() => {
      const secondCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });

    // Verify the re-fetch includes period=month
    const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0]![0] as string;
    expect(lastCall).toContain('period=month');
  });

  // 12
  it('switching subject filter re-fetches data', async () => {
    respondWithRows([]);
    render(<Leaderboard />);
    await waitForLoaded();

    const firstCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    respondWithRows([]);

    // Click "Физика" subject chip
    fireEvent.click(screen.getByText('Физика'));

    await waitFor(() => {
      const secondCallCount = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.length;
      expect(secondCallCount).toBeGreaterThan(firstCallCount);
    });

    const lastCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.slice(-1)[0]![0] as string;
    expect(lastCall).toContain('subject=physics');
  });

  // 13
  it('scope tabs only show when user is logged in', async () => {
    // Logged in — tabs should exist
    respondWithRows([]);
    const { unmount } = render(<Leaderboard />);
    await waitForLoaded();

    expect(screen.getByText('Все')).toBeInTheDocument();
    expect(screen.getByText('Друзья')).toBeInTheDocument();
    unmount();

    // Logged out — tabs should NOT exist
    mockUser = null;
    respondWithRows([]);
    render(<Leaderboard />);
    await waitForLoaded();

    expect(screen.queryByText('Друзья')).not.toBeInTheDocument();
    // "Все" might appear in "Все предметы" chip, but the scope "Все" tab should not
    // Since scope tabs are not rendered at all, "Все" as a scope tab is gone.
    // "Все предметы" is the subject filter chip which is always rendered.
    const allChips = screen.getAllByText('Все предметы');
    expect(allChips.length).toBeGreaterThanOrEqual(1);
  });

  // 14
  it('clicking back button calls goHome', async () => {
    respondWithRows([]);
    render(<Leaderboard />);

    fireEvent.click(screen.getByTestId('back-button'));
    expect(mockGoHome).toHaveBeenCalled();
  });

  // 15
  it('score color: green for >=80, yellow for >=60, red for <60', async () => {
    respondWithRows([
      makeRow({ id: 'r1', user_id: 'u1', user_name: 'Green', score: 85 }),
      makeRow({ id: 'r2', user_id: 'u2', user_name: 'Yellow', score: 65 }),
      makeRow({ id: 'r3', user_id: 'u3', user_name: 'Red', score: 45 }),
    ]);
    render(<Leaderboard />);
    await waitForLoaded();

    const greenScore = screen.getByText('85%');
    const yellowScore = screen.getByText('65%');
    const redScore = screen.getByText('45%');

    // Green for >=80 (jsdom converts hex to rgb)
    expect(greenScore.style.color).toBe('rgb(34, 197, 94)');
    // Yellow for >=60
    expect(yellowScore.style.color).toBe('rgb(234, 179, 8)');
    // Red for <60
    expect(redScore.style.color).toBe('rgb(239, 68, 68)');
  });

  // 16
  it('shows nickname with @ prefix when available', async () => {
    respondWithRows([
      makeRow({ user_id: 'u1', user_name: 'Alice Real', nickname: 'alice_cool' }),
      makeRow({ user_id: 'u2', user_name: 'Bob Real', nickname: 'user_abc123' }), // user_ prefix -> show user_name
      makeRow({ user_id: 'u3', user_name: 'Charlie Real' }), // no nickname -> show user_name
    ]);
    render(<Leaderboard />);
    await waitForLoaded();

    // alice_cool should be shown with @ prefix
    expect(screen.getByText('@alice_cool')).toBeInTheDocument();

    // user_abc123 starts with "user_", so user_name "Bob Real" is shown instead
    expect(screen.getByText('Bob Real')).toBeInTheDocument();
    expect(screen.queryByText('@user_abc123')).not.toBeInTheDocument();

    // No nickname, so user_name shown
    expect(screen.getByText('Charlie Real')).toBeInTheDocument();
  });

  // 17
  it('pluralTests helper works correctly (1 тест, 2 теста, 5 тестов)', async () => {
    // We test indirectly through rendered output with different test counts

    // 1 test => "1 тест"
    respondWithRows([
      makeRow({ user_id: 'u1', user_name: 'One', score: 80 }),
    ]);
    const { unmount: u1 } = render(<Leaderboard />);
    await waitForLoaded();
    expect(screen.getByText('1 тест')).toBeInTheDocument();
    u1();

    // 2 tests => "2 теста"
    respondWithRows([
      makeRow({ id: 'r1', user_id: 'u1', user_name: 'Two', score: 80 }),
      makeRow({ id: 'r2', user_id: 'u1', user_name: 'Two', score: 90 }),
    ]);
    const { unmount: u2 } = render(<Leaderboard />);
    await waitForLoaded();
    expect(screen.getByText('2 теста')).toBeInTheDocument();
    u2();

    // 5 tests => "5 тестов"
    respondWithRows([
      makeRow({ id: 'r1', user_id: 'u1', user_name: 'Five', score: 80 }),
      makeRow({ id: 'r2', user_id: 'u1', user_name: 'Five', score: 80 }),
      makeRow({ id: 'r3', user_id: 'u1', user_name: 'Five', score: 80 }),
      makeRow({ id: 'r4', user_id: 'u1', user_name: 'Five', score: 80 }),
      makeRow({ id: 'r5', user_id: 'u1', user_name: 'Five', score: 80 }),
    ]);
    const { unmount: u3 } = render(<Leaderboard />);
    await waitForLoaded();
    expect(screen.getByText('5 тестов')).toBeInTheDocument();
    u3();

    // 21 tests => "21 тест" (mod10=1, mod100=21 != 11)
    const rows21 = Array.from({ length: 21 }, (_, i) =>
      makeRow({ id: `r${i}`, user_id: 'u1', user_name: 'TwentyOne', score: 80 }),
    );
    respondWithRows(rows21);
    const { unmount: u4 } = render(<Leaderboard />);
    await waitForLoaded();
    expect(screen.getByText('21 тест')).toBeInTheDocument();
    u4();

    // 11 tests => "11 тестов" (mod100=11, exception)
    const rows11 = Array.from({ length: 11 }, (_, i) =>
      makeRow({ id: `r${i}`, user_id: 'u1', user_name: 'Eleven', score: 80 }),
    );
    respondWithRows(rows11);
    render(<Leaderboard />);
    await waitForLoaded();
    expect(screen.getByText('11 тестов')).toBeInTheDocument();
  });
});
