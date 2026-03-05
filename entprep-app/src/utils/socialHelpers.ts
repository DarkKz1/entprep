// Client-side helpers for social features (friends, profiles, invite links)

import { supabase } from '../config/supabase';
import type { Profile, Friendship } from '../types/index';

// ── API call helper ──────────────────────────────────────────────────────────

async function socialAPI<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error('Supabase not configured');
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/social', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...params }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

// ── Profile ──────────────────────────────────────────────────────────────────

export async function getMyProfile(): Promise<Profile> {
  const data = await socialAPI<{ profile: Profile }>('get_profile');
  return data.profile;
}

export async function setNickname(nickname: string): Promise<void> {
  await socialAPI('set_nickname', { nickname });
}

// ── Search ───────────────────────────────────────────────────────────────────

export async function searchUsers(query: string): Promise<Profile[]> {
  const data = await socialAPI<{ users: Profile[] }>('search_users', { query });
  return data.users;
}

export async function resolveNickname(nickname: string): Promise<Profile | null> {
  try {
    const data = await socialAPI<{ profile: Profile }>('resolve_nickname', { nickname });
    return data.profile;
  } catch {
    return null;
  }
}

// ── Friends ──────────────────────────────────────────────────────────────────

export async function sendFriendRequest(friendId: string): Promise<void> {
  await socialAPI('send_friend_request', { friend_id: friendId });
}

export async function respondFriendRequest(friendshipId: number, response: 'accepted' | 'declined'): Promise<void> {
  await socialAPI('respond_friend_request', { friendship_id: friendshipId, response });
}

export async function removeFriend(friendshipId: number): Promise<void> {
  await socialAPI('remove_friend', { friendship_id: friendshipId });
}

export async function listFriends(): Promise<Friendship[]> {
  const data = await socialAPI<{ friends: Friendship[] }>('list_friends');
  return data.friends;
}

export async function listFriendRequests(): Promise<Friendship[]> {
  const data = await socialAPI<{ requests: Friendship[] }>('list_requests');
  return data.requests;
}

export async function getFriendIds(): Promise<string[]> {
  const data = await socialAPI<{ ids: string[] }>('get_friend_ids');
  return data.ids;
}

// ── Profile sync (called from cloudSync) ─────────────────────────────────────

export async function syncProfileStats(userId: string, xp: number, level: number, streak: number, avatarUrl?: string): Promise<void> {
  if (!supabase) return;
  // Direct Supabase client update (RLS allows owner to update own profile)
  const update: Record<string, unknown> = {
    xp,
    level,
    streak,
    last_active: new Date().toISOString(),
  };
  if (avatarUrl) update.avatar_url = avatarUrl;
  await supabase.from('profiles').update(update).eq('id', userId);
}

// ── Invite links ─────────────────────────────────────────────────────────────

export function buildFriendInviteUrl(nickname: string): string {
  return `https://entprep.netlify.app?add=${encodeURIComponent(nickname)}`;
}

export function parseFriendInviteParam(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('add');
}

// ── Relative time formatting (Russian) ───────────────────────────────────────

export function formatLastActive(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн назад`;
  return `${Math.floor(days / 7)} нед назад`;
}
