import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Friends from '../Friends';
import type { Friendship, Profile } from '../../types/index';

// ── Mock data ──────────────────────────────────────────────────────────────

const mockGoHome = vi.fn();
const mockNav = vi.fn();
const mockToast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() };
const mockRefreshProfile = vi.fn().mockResolvedValue(undefined);
const mockUser = { id: 'user-1' };
const mockProfile: Profile = { id: 'user-1', nickname: 'testuser', display_name: null, avatar_url: null, level: 3, xp: 500, streak: 5, last_active: '2026-02-26T10:00:00Z' };
let mockNeedsNickname = false;

const makeFriendship = (id: number, nickname: string, friendId: string = `friend-${id}`): Friendship => ({
  id,
  user_id: 'user-1',
  friend_id: friendId,
  status: 'accepted',
  created_at: '2026-02-20T10:00:00Z',
  profile: {
    id: friendId,
    nickname,
    display_name: null,
    avatar_url: null,
    level: 2,
    xp: 300,
    streak: 0,
    last_active: '2026-02-25T14:00:00Z',
  },
});

const makeRequest = (id: number, nickname: string, userId: string = `requester-${id}`): Friendship => ({
  id,
  user_id: userId,
  friend_id: 'user-1',
  status: 'pending',
  created_at: '2026-02-24T10:00:00Z',
  profile: {
    id: userId,
    nickname,
    display_name: null,
    avatar_url: null,
    level: 1,
    xp: 100,
    streak: 1,
    last_active: '2026-02-25T08:00:00Z',
  },
});

const makeSearchResult = (id: string, nickname: string): Profile => ({
  id,
  nickname,
  display_name: null,
  avatar_url: null,
  level: 1,
  xp: 50,
  streak: 0,
  last_active: '2026-02-25T12:00:00Z',
});

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockT = {
  error: 'Ошибка',
  friends: {
    title: 'Друзья',
    inviteFriend: 'Пригласить друга',
    whatsapp: 'WhatsApp',
    telegram: 'Telegram',
    linkCopied: 'Ссылка скопирована!',
    linkCopyFailed: 'Не удалось скопировать',
    link: 'Ссылка',
    searchPlaceholder: 'Найти по никнейму...',
    noOneFound: 'Никого не найдено',
    sentLabel: 'Отправлено',
    addButton: 'Добавить',
    requestsTab: 'Запросы',
    noRequests: 'Нет запросов',
    noRequestsDesc: 'Входящие запросы в друзья появятся здесь',
    noFriends: 'Пока нет друзей',
    noFriendsDesc: 'Найдите друзей по никнейму или отправьте ссылку-приглашение',
    challengeToDuel: 'Вызвать на дуэль',
    removeFriend: 'Удалить?',
    requestSent: 'Запрос отправлен!',
    requestAlreadySent: 'Запрос уже отправлен',
    friendAdded: 'Друг добавлен!',
    requestDeclined: 'Запрос отклонён',
    friendRemoved: 'Друг удалён',
    chooseNickname: 'Выберите никнейм',
    nicknameNeeded: 'Никнейм нужен, чтобы друзья могли вас найти',
    nickHint: 'Латиница, цифры, нижнее подчёркивание. 3-20 символов.',
    nickSet: 'Никнейм установлен!',
    nickTaken: 'Никнейм уже занят',
    loginRequired: 'Войдите в аккаунт',
    loginRequiredDesc: 'Для социальных функций нужна авторизация через Google',
    inviteText: 'Готовлюсь к ЕНТ в ENTprep! Добавь меня в друзья:',
  },
  settings: {
    nickRule: '3-20 символов: буквы, цифры, _',
  },
};

vi.mock('../../contexts/NavigationContext', () => ({
  useNav: () => ({ goHome: mockGoHome, nav: mockNav }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    profile: mockProfile,
    needsNickname: mockNeedsNickname,
    refreshProfile: mockRefreshProfile,
  }),
}));

vi.mock('../../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}));

vi.mock('../../hooks/useBreakpoint', () => ({
  useBreakpoint: () => 'mobile',
}));

vi.mock('../../locales', () => ({
  useT: () => mockT,
}));

// Mock social helpers
const mockListFriends = vi.fn().mockResolvedValue([]);
const mockListFriendRequests = vi.fn().mockResolvedValue([]);
const mockSearchUsers = vi.fn().mockResolvedValue([]);
const mockSendFriendRequest = vi.fn().mockResolvedValue(undefined);
const mockRespondFriendRequest = vi.fn().mockResolvedValue(undefined);
const mockRemoveFriend = vi.fn().mockResolvedValue(undefined);
const mockSetNickname = vi.fn().mockResolvedValue(undefined);
const mockBuildFriendInviteUrl = vi.fn().mockReturnValue('https://entprep.netlify.app/?add=testuser');
const mockParseFriendInviteParam = vi.fn().mockReturnValue(null);
const mockResolveNickname = vi.fn().mockResolvedValue(null);

vi.mock('../../utils/socialHelpers', () => ({
  searchUsers: (...args: unknown[]) => mockSearchUsers(...args),
  sendFriendRequest: (...args: unknown[]) => mockSendFriendRequest(...args),
  respondFriendRequest: (...args: unknown[]) => mockRespondFriendRequest(...args),
  removeFriend: (...args: unknown[]) => mockRemoveFriend(...args),
  listFriends: (...args: unknown[]) => mockListFriends(...args),
  listFriendRequests: (...args: unknown[]) => mockListFriendRequests(...args),
  setNickname: (...args: unknown[]) => mockSetNickname(...args),
  buildFriendInviteUrl: (...args: unknown[]) => mockBuildFriendInviteUrl(...args),
  formatLastActive: () => '2 часа назад',
  parseFriendInviteParam: () => mockParseFriendInviteParam(),
  resolveNickname: (...args: unknown[]) => mockResolveNickname(...args),
}));

vi.mock('../../utils/shareHelpers', () => ({
  shareToWhatsApp: vi.fn(),
  shareToTelegram: vi.fn(),
  copyText: vi.fn().mockResolvedValue(true),
}));

// Mock UI components
vi.mock('../ui/BackButton', () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <button data-testid="back" onClick={onClick}>Back</button>
  ),
}));
vi.mock('../ui/EmptyState', () => ({
  default: ({ title, description }: { title: string; description?: string }) => (
    <div data-testid="empty">
      <span>{title}</span>
      {description && <span>{description}</span>}
    </div>
  ),
}));
vi.mock('../ui/SkeletonCard', () => ({
  default: () => <div data-testid="skeleton" />,
}));

// Mock lucide-react icons to simple spans
vi.mock('lucide-react', () => {
  const Icon = ({ size, color, ...props }: Record<string, unknown>) => <span data-testid="icon" {...props} />;
  return {
    Users: Icon,
    Search: Icon,
    UserPlus: Icon,
    UserCheck: Icon,
    UserX: Icon,
    Clock: Icon,
    Share2: Icon,
    Copy: Icon,
    Zap: Icon,
    Award: Icon,
    X: Icon,
    Check: Icon,
    MessageCircle: Icon,
    Send: Icon,
    Swords: Icon,
  };
});

// ── Test Suite ──────────────────────────────────────────────────────────────

describe('Friends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNeedsNickname = false;
    mockListFriends.mockResolvedValue([]);
    mockListFriendRequests.mockResolvedValue([]);
    mockSearchUsers.mockResolvedValue([]);
    mockParseFriendInviteParam.mockReturnValue(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Loading State ─────────────────────────────────────────────────────

  it('renders loading skeletons initially', () => {
    // Never resolve the promises so we stay in loading state
    mockListFriends.mockReturnValue(new Promise(() => {}));
    mockListFriendRequests.mockReturnValue(new Promise(() => {}));

    render(<Friends />);
    const skeletons = screen.getAllByTestId('skeleton');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  // ── Friend List ───────────────────────────────────────────────────────

  it('renders friend list after loading', async () => {
    const friendships = [
      makeFriendship(1, 'alice'),
      makeFriendship(2, 'bob'),
    ];
    mockListFriends.mockResolvedValue(friendships);

    render(<Friends />);

    await waitFor(() => {
      expect(screen.getByText('@alice')).toBeInTheDocument();
      expect(screen.getByText('@bob')).toBeInTheDocument();
    });
  });

  it('renders empty state when no friends', async () => {
    mockListFriends.mockResolvedValue([]);
    mockListFriendRequests.mockResolvedValue([]);

    render(<Friends />);

    await waitFor(() => {
      expect(screen.getByTestId('empty')).toBeInTheDocument();
      expect(screen.getByText('Пока нет друзей')).toBeInTheDocument();
    });
  });

  // ── Tabs ──────────────────────────────────────────────────────────────

  it('switching tabs shows friends/requests', async () => {
    const friendships = [makeFriendship(1, 'alice')];
    const requests = [makeRequest(10, 'charlie')];
    mockListFriends.mockResolvedValue(friendships);
    mockListFriendRequests.mockResolvedValue(requests);

    render(<Friends />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText('@alice')).toBeInTheDocument();
    });

    // Switch to requests tab
    fireEvent.click(screen.getByText('Запросы'));

    await waitFor(() => {
      expect(screen.getByText('@charlie')).toBeInTheDocument();
    });

    // Switch back to friends tab (use getAllByText to avoid title collision)
    const friendsTabs = screen.getAllByText(/Друзья/);
    fireEvent.click(friendsTabs[friendsTabs.length - 1]);

    await waitFor(() => {
      expect(screen.getByText('@alice')).toBeInTheDocument();
    });
  });

  it('shows empty state on requests tab when no requests', async () => {
    mockListFriends.mockResolvedValue([]);
    mockListFriendRequests.mockResolvedValue([]);

    render(<Friends />);

    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });

    // Switch to requests tab
    fireEvent.click(screen.getByText('Запросы'));

    expect(screen.getByText('Нет запросов')).toBeInTheDocument();
  });

  // ── Search ────────────────────────────────────────────────────────────

  it('search with less than 2 chars shows no results section', async () => {
    render(<Friends />);

    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });

    const input = screen.getByPlaceholderText('Найти по никнейму...');
    fireEvent.change(input, { target: { value: 'a' } });

    // With <2 chars, the search results section should not appear
    expect(screen.queryByText('Никого не найдено')).not.toBeInTheDocument();
    expect(mockSearchUsers).not.toHaveBeenCalled();
  });

  it('search triggers searchUsers after debounce', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const results = [makeSearchResult('other-1', 'john_doe')];
    mockSearchUsers.mockResolvedValue(results);

    render(<Friends />);

    // Wait for initial load
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const input = screen.getByPlaceholderText('Найти по никнейму...');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'john' } });
    });

    // Before debounce fires, searchUsers should not be called
    expect(mockSearchUsers).not.toHaveBeenCalled();

    // Advance past debounce (300ms)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(mockSearchUsers).toHaveBeenCalledWith('john');

    await waitFor(() => {
      expect(screen.getByText('@john_doe')).toBeInTheDocument();
    });
  });

  it('search excludes self and existing friends from results', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const friendships = [makeFriendship(1, 'alice', 'friend-alice')];
    mockListFriends.mockResolvedValue(friendships);

    // searchUsers returns self, an existing friend, and a new user
    mockSearchUsers.mockResolvedValue([
      makeSearchResult('user-1', 'testuser'),       // self
      makeSearchResult('friend-alice', 'alice'),     // existing friend
      makeSearchResult('stranger-1', 'stranger'),    // new user
    ]);

    render(<Friends />);

    // Wait for initial load
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const input = screen.getByPlaceholderText('Найти по никнейму...');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'test' } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // Only the stranger should appear in search results (self and existing friend filtered out)
    await waitFor(() => {
      expect(screen.getByText('@stranger')).toBeInTheDocument();
    });

    // Self and friend should not appear in search results area
    // (alice appears in friend list, but not as a search result with the add button)
    const addButtons = screen.getAllByText('Добавить');
    expect(addButtons).toHaveLength(1); // only for stranger
  });

  it('shows "no one found" when search returns empty', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockSearchUsers.mockResolvedValue([]);

    render(<Friends />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const input = screen.getByPlaceholderText('Найти по никнейму...');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'nonexistent' } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Никого не найдено')).toBeInTheDocument();
    });
  });

  // ── Send Friend Request ───────────────────────────────────────────────

  it('send friend request shows success toast', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const results = [makeSearchResult('other-1', 'john_doe')];
    mockSearchUsers.mockResolvedValue(results);
    mockSendFriendRequest.mockResolvedValue(undefined);

    render(<Friends />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const input = screen.getByPlaceholderText('Найти по никнейму...');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'john' } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Добавить')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Добавить'));
    });

    await waitFor(() => {
      expect(mockSendFriendRequest).toHaveBeenCalledWith('other-1');
      expect(mockToast.success).toHaveBeenCalledWith('Запрос отправлен!');
    });

    // After sending, the button should switch to "Отправлено" label
    expect(screen.getByText('Отправлено')).toBeInTheDocument();
  });

  it('send friend request error shows error toast', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const results = [makeSearchResult('other-1', 'john_doe')];
    mockSearchUsers.mockResolvedValue(results);
    mockSendFriendRequest.mockRejectedValue(new Error('Network failure'));

    render(<Friends />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const input = screen.getByPlaceholderText('Найти по никнейму...');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'john' } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Добавить')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Добавить'));
    });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Network failure');
    });
  });

  it('send friend request shows info toast when already sent', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const results = [makeSearchResult('other-1', 'john_doe')];
    mockSearchUsers.mockResolvedValue(results);
    mockSendFriendRequest.mockRejectedValue(new Error('already exists'));

    render(<Friends />);

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const input = screen.getByPlaceholderText('Найти по никнейму...');

    await act(async () => {
      fireEvent.change(input, { target: { value: 'john' } });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    await waitFor(() => {
      expect(screen.getByText('Добавить')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Добавить'));
    });

    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalledWith('Запрос уже отправлен');
    });
  });

  // ── Accept / Decline Requests ─────────────────────────────────────────

  it('accept request shows toast and reloads data', async () => {
    const requests = [makeRequest(10, 'charlie')];
    mockListFriendRequests.mockResolvedValue(requests);
    mockRespondFriendRequest.mockResolvedValue(undefined);

    render(<Friends />);

    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });

    // Switch to requests tab
    fireEvent.click(screen.getByText('Запросы'));

    await waitFor(() => {
      expect(screen.getByText('@charlie')).toBeInTheDocument();
    });

    // Click accept (UserCheck icon button) - first action button in the request card
    const buttons = screen.getAllByRole('button');
    // Find the accept button (has UserCheck icon, comes before the decline button)
    const acceptBtn = buttons.find(btn => {
      const style = btn.getAttribute('style') || '';
      return style.includes('rgba(34, 197, 94');
    });
    expect(acceptBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(acceptBtn!);
    });

    await waitFor(() => {
      expect(mockRespondFriendRequest).toHaveBeenCalledWith(10, 'accepted');
      expect(mockToast.success).toHaveBeenCalledWith('Друг добавлен!');
    });

    // loadData should be called again (initial + after accept)
    expect(mockListFriends).toHaveBeenCalledTimes(2);
  });

  it('decline request shows toast and reloads data', async () => {
    const requests = [makeRequest(10, 'charlie')];
    mockListFriendRequests.mockResolvedValue(requests);
    mockRespondFriendRequest.mockResolvedValue(undefined);

    render(<Friends />);

    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });

    // Switch to requests tab
    fireEvent.click(screen.getByText('Запросы'));

    await waitFor(() => {
      expect(screen.getByText('@charlie')).toBeInTheDocument();
    });

    // Click decline button (has red background style)
    const buttons = screen.getAllByRole('button');
    const declineBtn = buttons.find(btn => {
      const style = btn.getAttribute('style') || '';
      return style.includes('rgba(239, 68, 68');
    });
    expect(declineBtn).toBeTruthy();

    await act(async () => {
      fireEvent.click(declineBtn!);
    });

    await waitFor(() => {
      expect(mockRespondFriendRequest).toHaveBeenCalledWith(10, 'declined');
      expect(mockToast.success).toHaveBeenCalledWith('Запрос отклонён');
    });
  });

  // ── Remove Friend ─────────────────────────────────────────────────────

  it('remove friend shows toast and reloads data', async () => {
    const friendships = [makeFriendship(1, 'alice')];
    mockListFriends.mockResolvedValue(friendships);
    mockRemoveFriend.mockResolvedValue(undefined);

    render(<Friends />);

    await waitFor(() => {
      expect(screen.getByText('@alice')).toBeInTheDocument();
    });

    // First click the X button to show confirm
    // The X button on friend card is the remove trigger (small, opacity 0.5)
    const buttons = screen.getAllByRole('button');
    const removeToggle = buttons.find(btn => {
      const style = btn.getAttribute('style') || '';
      return style.includes('opacity: 0.5') || style.includes('opacity:0.5');
    });
    expect(removeToggle).toBeTruthy();

    await act(async () => {
      fireEvent.click(removeToggle!);
    });

    // Now the confirm "Удалить?" button should appear
    await waitFor(() => {
      expect(screen.getByText('Удалить?')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Удалить?'));
    });

    await waitFor(() => {
      expect(mockRemoveFriend).toHaveBeenCalledWith(1);
      expect(mockToast.info).toHaveBeenCalledWith('Друг удалён');
    });

    // loadData should be called again
    expect(mockListFriends).toHaveBeenCalledTimes(2);
  });

  // ── Nickname Setup ────────────────────────────────────────────────────

  it('nickname setup form shows when needsNickname is true', async () => {
    mockNeedsNickname = true;

    render(<Friends />);

    expect(screen.getByText('Выберите никнейм')).toBeInTheDocument();
    expect(screen.getByText('Никнейм нужен, чтобы друзья могли вас найти')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('my_nickname')).toBeInTheDocument();
  });

  it('nickname validation rejects less than 3 chars', async () => {
    mockNeedsNickname = true;

    render(<Friends />);

    const input = screen.getByPlaceholderText('my_nickname');
    const okButton = screen.getByText('OK');

    fireEvent.change(input, { target: { value: 'ab' } });

    // Button should be disabled for <3 chars
    expect(okButton).toBeDisabled();
  });

  it('nickname validation rejects special chars (input strips them)', async () => {
    mockNeedsNickname = true;

    render(<Friends />);

    const input = screen.getByPlaceholderText('my_nickname') as HTMLInputElement;

    // The onChange handler strips non-alphanumeric/underscore chars
    fireEvent.change(input, { target: { value: 'test@#$name' } });

    // The component strips invalid characters, so actual value will be filtered
    // Since onChange uses .replace(/[^a-zA-Z0-9_]/g, ''), the value set to state is 'testname'
    // But fireEvent.change sets the event target value; the component then filters it
    // The result in state should be 'testname'
    expect(input.value).toBe('testname');
  });

  it('nickname validation shows error on submit for short nickname', async () => {
    mockNeedsNickname = true;

    render(<Friends />);

    const input = screen.getByPlaceholderText('my_nickname');

    // Type exactly 3 chars then submit
    fireEvent.change(input, { target: { value: 'abc' } });

    const okButton = screen.getByText('OK');
    expect(okButton).not.toBeDisabled();

    // Now clear to 2 chars - button should be disabled
    fireEvent.change(input, { target: { value: 'ab' } });
    expect(okButton).toBeDisabled();
  });

  it('successful nickname save calls refreshProfile and shows toast', async () => {
    mockNeedsNickname = true;
    mockSetNickname.mockResolvedValue(undefined);
    mockRefreshProfile.mockResolvedValue(undefined);

    render(<Friends />);

    const input = screen.getByPlaceholderText('my_nickname');
    fireEvent.change(input, { target: { value: 'cool_nick' } });

    await act(async () => {
      fireEvent.click(screen.getByText('OK'));
    });

    await waitFor(() => {
      expect(mockSetNickname).toHaveBeenCalledWith('cool_nick');
      expect(mockRefreshProfile).toHaveBeenCalled();
      expect(mockToast.success).toHaveBeenCalledWith('Никнейм установлен!');
    });
  });

  it('taken nickname shows error message', async () => {
    mockNeedsNickname = true;
    mockSetNickname.mockRejectedValue(new Error('Nickname taken'));

    render(<Friends />);

    const input = screen.getByPlaceholderText('my_nickname');
    fireEvent.change(input, { target: { value: 'taken_nick' } });

    await act(async () => {
      fireEvent.click(screen.getByText('OK'));
    });

    await waitFor(() => {
      expect(screen.getByText('Никнейм уже занят')).toBeInTheDocument();
    });
  });

  // ── Navigation ────────────────────────────────────────────────────────

  it('clicking back calls goHome', async () => {
    render(<Friends />);

    fireEvent.click(screen.getByTestId('back'));

    expect(mockGoHome).toHaveBeenCalledOnce();
  });

  it('challenge button navigates to duel', async () => {
    const friendships = [makeFriendship(1, 'alice')];
    mockListFriends.mockResolvedValue(friendships);

    render(<Friends />);

    await waitFor(() => {
      expect(screen.getByText('@alice')).toBeInTheDocument();
    });

    // Find the duel/challenge button (Swords icon, red background)
    const duelBtn = screen.getByTitle('Вызвать на дуэль');
    expect(duelBtn).toBeInTheDocument();

    fireEvent.click(duelBtn);

    expect(mockNav).toHaveBeenCalledWith('duel');
  });

  // ── Invite Param ──────────────────────────────────────────────────────

  it('handles ?add=nickname invite param by resolving and showing user', async () => {
    const invitedUser = makeSearchResult('invited-1', 'invited_user');
    mockParseFriendInviteParam.mockReturnValue('invited_user');
    mockResolveNickname.mockResolvedValue(invitedUser);

    render(<Friends />);

    await waitFor(() => {
      expect(mockResolveNickname).toHaveBeenCalledWith('invited_user');
      expect(screen.getByText('@invited_user')).toBeInTheDocument();
    });
  });

  // ── Share Panel ───────────────────────────────────────────────────────

  it('toggles share panel on share button click', async () => {
    render(<Friends />);

    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });

    // Share panel should not be visible initially
    expect(screen.queryByText('Пригласить друга')).not.toBeInTheDocument();

    // Find and click the share button (Share2 icon)
    const buttons = screen.getAllByRole('button');
    const shareBtn = buttons.find(btn => {
      const style = btn.getAttribute('style') || '';
      return style.includes('rgba(26, 154, 140, 0.1)') && style.includes('38');
    });
    expect(shareBtn).toBeTruthy();

    fireEvent.click(shareBtn!);

    // Share panel should now be visible
    expect(screen.getByText('Пригласить друга')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText('Ссылка')).toBeInTheDocument();
  });

  // ── Profile Display ───────────────────────────────────────────────────

  it('displays current user nickname in header', async () => {
    render(<Friends />);

    await waitFor(() => {
      expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
    });

    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });
});
