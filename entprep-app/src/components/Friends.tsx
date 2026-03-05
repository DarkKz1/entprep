import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CARD_COMPACT, TYPE, COLORS } from '../constants/styles';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useNav } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../locales';
import {
  searchUsers,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  listFriends,
  listFriendRequests,
  setNickname,
  buildFriendInviteUrl,
  formatLastActive,
  parseFriendInviteParam,
  resolveNickname,
} from '../utils/socialHelpers';
import { shareToWhatsApp, shareToTelegram, copyText } from '../utils/shareHelpers';
import BackButton from './ui/BackButton';
import EmptyState from './ui/EmptyState';
import SkeletonCard from './ui/SkeletonCard';
import { Users, Search, UserPlus, UserCheck, UserX, Clock, Share2, Copy, Zap, Award, X, Check, MessageCircle, Send, Swords } from 'lucide-react';
import type { Profile, Friendship } from '../types/index';

type Tab = 'friends' | 'requests';

export default function Friends() {
  const t = useT();
  const { goHome, nav } = useNav();
  const { user, profile, needsNickname, refreshProfile } = useAuth();
  const toast = useToast();
  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';

  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingSent, setPendingSent] = useState<Set<string>>(new Set());
  const [showShare, setShowShare] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Handle ?add= invite param
  const inviteNickname = parseFriendInviteParam();
  const [inviteResolved, setInviteResolved] = useState(false);

  useEffect(() => {
    if (!inviteNickname || inviteResolved || !user) return;
    setInviteResolved(true);
    (async () => {
      const p = await resolveNickname(inviteNickname);
      if (p && p.id !== user.id) {
        setSearchQuery(inviteNickname);
        setSearchResults([p]);
      }
    })();
  }, [inviteNickname, inviteResolved, user]);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [f, r] = await Promise.all([listFriends(), listFriendRequests()]);
      setFriends(f);
      setRequests(r);
    } catch {
      // silently fail
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await searchUsers(searchQuery.trim());
        // Exclude self and existing friends
        const friendIds = new Set(friends.map(f => f.profile.id));
        setSearchResults(results.filter(r => r.id !== user?.id && !friendIds.has(r.id)));
      } catch {
        setSearchResults([]);
      }
      setSearching(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, friends, user]);

  const handleSendRequest = async (friendId: string) => {
    try {
      await sendFriendRequest(friendId);
      setPendingSent(prev => new Set([...prev, friendId]));
      toast.success(t.friends.requestSent);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.error;
      if (msg.includes('already')) toast.info(t.friends.requestAlreadySent);
      else toast.error(msg);
    }
  };

  const handleRespond = async (friendshipId: number, response: 'accepted' | 'declined') => {
    try {
      await respondFriendRequest(friendshipId, response);
      toast.success(response === 'accepted' ? t.friends.friendAdded : t.friends.requestDeclined);
      loadData();
    } catch {
      toast.error(t.error);
    }
  };

  const handleRemove = async (friendshipId: number) => {
    try {
      await removeFriend(friendshipId);
      toast.info(t.friends.friendRemoved);
      loadData();
    } catch {
      toast.error(t.error);
    }
  };

  const handleSetNickname = async () => {
    const nick = nicknameInput.trim();
    if (nick.length < 3 || nick.length > 20 || !/^[a-zA-Z0-9_]+$/.test(nick)) {
      setNicknameError(t.settings.nickRule);
      return;
    }
    setNicknameSaving(true);
    setNicknameError('');
    try {
      await setNickname(nick);
      await refreshProfile();
      toast.success(t.friends.nickSet);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t.error;
      if (msg.includes('taken') || msg.includes('unique') || msg.includes('Taken')) {
        setNicknameError(t.friends.nickTaken);
      } else {
        setNicknameError(msg);
      }
    }
    setNicknameSaving(false);
  };

  const inviteUrl = profile ? buildFriendInviteUrl(profile.nickname) : '';
  const inviteText = `${t.friends.inviteText} ${inviteUrl}`;

  // Nickname setup prompt
  if (needsNickname && user) {
    return (
      <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
        <BackButton onClick={goHome} />
        <div style={{ maxWidth: 400, margin: '40px auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Users size={32} color="#fff" />
          </div>
          <h2 style={{ ...TYPE.h2, marginBottom: 8 }}>{t.friends.chooseNickname}</h2>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
            {t.friends.nicknameNeeded}
          </p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={nicknameInput}
              onChange={e => { setNicknameInput(e.target.value.replace(/[^a-zA-Z0-9_]/g, '')); setNicknameError(''); }}
              placeholder="my_nickname"
              maxLength={20}
              style={{
                flex: 1,
                padding: '12px 14px',
                background: 'var(--bg-card)',
                border: nicknameError ? `1.5px solid ${COLORS.red}` : '1px solid var(--border)',
                borderRadius: 12,
                color: 'var(--text)',
                fontSize: 14,
                fontFamily: "'JetBrains Mono',monospace",
                outline: 'none',
              }}
            />
            <button
              onClick={handleSetNickname}
              disabled={nicknameSaving || nicknameInput.trim().length < 3}
              style={{
                padding: '12px 20px',
                background: nicknameInput.trim().length >= 3 ? `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})` : 'var(--bg-subtle-2)',
                border: 'none',
                borderRadius: 12,
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: nicknameInput.trim().length >= 3 ? 'pointer' : 'default',
                opacity: nicknameSaving ? 0.7 : 1,
              }}
            >
              {nicknameSaving ? '...' : 'OK'}
            </button>
          </div>
          {nicknameError && <div style={{ fontSize: 11, color: COLORS.red, textAlign: 'left' }}>{nicknameError}</div>}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'left', marginTop: 4 }}>
            {t.friends.nickHint}
          </div>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
        <BackButton onClick={goHome} />
        <EmptyState icon={Users} title={t.friends.loginRequired} description={t.friends.loginRequiredDesc} />
      </div>
    );
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px 16px',
    background: active ? `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})` : 'var(--bg-card)',
    border: active ? 'none' : '1px solid var(--border)',
    borderRadius: 14,
    color: active ? '#fff' : 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: active ? 700 : 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center',
    position: 'relative',
  });

  return (
    <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
      <BackButton onClick={goHome} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Users size={24} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ ...TYPE.h2, margin: 0 }}>{t.friends.title}</h1>
          <p style={{ ...TYPE.caption, margin: '2px 0 0' }}>
            {profile && <span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--text-secondary)' }}>@{profile.nickname}</span>}
          </p>
        </div>
        <button
          onClick={() => setShowShare(!showShare)}
          style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(26,154,140,0.1)', border: '1px solid rgba(26,154,140,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <Share2 size={18} color={COLORS.teal} />
        </button>
      </div>

      {/* Share panel */}
      {showShare && (
        <div style={{ ...CARD_COMPACT, padding: '14px', marginBottom: 10, animation: 'fadeIn 0.2s ease' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{t.friends.inviteFriend}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { shareToWhatsApp(inviteText); }} style={{ flex: 1, padding: '10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 10, color: '#25D366', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MessageCircle size={15} />{t.friends.whatsapp}
            </button>
            <button onClick={() => { shareToTelegram(inviteText); }} style={{ flex: 1, padding: '10px', background: 'rgba(26,154,140,0.1)', border: '1px solid rgba(26,154,140,0.2)', borderRadius: 10, color: COLORS.teal, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Send size={15} />{t.friends.telegram}
            </button>
            <button onClick={async () => { const ok = await copyText(inviteUrl); toast.success(ok ? t.friends.linkCopied : t.friends.linkCopyFailed); }} style={{ flex: 1, padding: '10px', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 10, color: COLORS.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Copy size={15} />{t.friends.link}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={t.friends.searchPlaceholder}
          style={{
            width: '100%',
            padding: '12px 12px 12px 36px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            color: 'var(--text)',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); setSearchResults([]); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={16} color="var(--text-muted)" />
          </button>
        )}
      </div>

      {/* Search results */}
      {searchQuery.trim().length >= 2 && (
        <div style={{ marginBottom: 14 }}>
          {searching ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[0, 1].map(i => <SkeletonCard key={i} style={{ animationDelay: `${i * 0.1}s` }} />)}
            </div>
          ) : searchResults.length === 0 ? (
            <div style={{ ...CARD_COMPACT, padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.friends.noOneFound}</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {searchResults.map(u => {
                const sent = pendingSent.has(u.id);
                return (
                  <div key={u.id} style={{ ...CARD_COMPACT, display: 'flex', alignItems: 'center', padding: '12px 14px', animation: 'fadeIn 0.2s ease' }}>
                    <Avatar url={u.avatar_url} name={u.display_name || u.nickname} size={36} />
                    <div style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.display_name || u.nickname}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono',monospace" }}>@{u.nickname}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                      <LevelBadge level={u.level} />
                      {sent ? (
                        <div style={{ padding: '6px 12px', background: 'rgba(34,197,94,0.1)', borderRadius: 10, fontSize: 11, fontWeight: 600, color: COLORS.green, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Check size={13} />{t.friends.sentLabel}
                        </div>
                      ) : (
                        <button onClick={() => handleSendRequest(u.id)} style={{ padding: '6px 12px', background: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})`, border: 'none', borderRadius: 10, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <UserPlus size={13} />{t.friends.addButton}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={() => setTab('friends')} style={tabStyle(tab === 'friends')}>
          {t.friends.title} {friends.length > 0 && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>({friends.length})</span>}
        </button>
        <button onClick={() => setTab('requests')} style={tabStyle(tab === 'requests')}>
          {t.friends.requestsTab}
          {requests.length > 0 && (
            <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: 9, background: COLORS.red, color: '#fff', fontSize: 10, fontWeight: 700 }}>
              {requests.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} style={{ animationDelay: `${i * 0.08}s` }} />)}
        </div>
      ) : tab === 'requests' ? (
        requests.length === 0 ? (
          <EmptyState icon={Clock} title={t.friends.noRequests} description={t.friends.noRequestsDesc} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {requests.map((req, i) => (
              <div key={req.id} style={{ ...CARD_COMPACT, display: 'flex', alignItems: 'center', padding: '12px 14px', animation: `fadeIn 0.3s ease ${i * 0.05}s both` }}>
                <Avatar url={req.profile.avatar_url} name={req.profile.display_name || req.profile.nickname} size={40} />
                <div style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {req.profile.display_name || req.profile.nickname}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono',monospace" }}>@{req.profile.nickname}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                  <button onClick={() => handleRespond(req.id, 'accepted')} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <UserCheck size={18} color={COLORS.green} />
                  </button>
                  <button onClick={() => handleRespond(req.id, 'declined')} style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <UserX size={18} color={COLORS.red} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        friends.length === 0 ? (
          <EmptyState icon={Users} title={t.friends.noFriends} description={t.friends.noFriendsDesc} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {friends.map((f, i) => (
              <FriendCard key={f.id} friendship={f} index={i} onRemove={handleRemove} onDuel={() => nav('duel')} />
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ url, name, size }: { url: string | null; name: string; size: number }) {
  const initials = name.slice(0, 2).toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size, borderRadius: size * 0.3, objectFit: 'cover', flexShrink: 0 }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: size * 0.3,
      background: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      fontSize: size * 0.35,
      fontWeight: 700,
      color: '#fff',
    }}>
      {initials}
    </div>
  );
}

function LevelBadge({ level }: { level: number }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      padding: '3px 7px',
      background: 'rgba(245,158,11,0.1)',
      borderRadius: 8,
      fontSize: 10,
      fontWeight: 700,
      color: COLORS.amber,
      fontFamily: "'JetBrains Mono',monospace",
    }}>
      <Award size={11} />
      {level}
    </div>
  );
}

function FriendCard({ friendship, index, onRemove, onDuel }: { friendship: Friendship; index: number; onRemove: (id: number) => void; onDuel: () => void }) {
  const t = useT();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const p = friendship.profile;

  return (
    <div style={{
      ...CARD_COMPACT,
      display: 'flex',
      alignItems: 'center',
      padding: '12px 14px',
      animation: `fadeIn 0.3s ease ${Math.min(index * 0.04, 0.5)}s both`,
    }}>
      <Avatar url={p.avatar_url} name={p.display_name || p.nickname} size={42} />
      <div style={{ marginLeft: 10, flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.display_name || p.nickname}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono',monospace" }}>@{p.nickname}</span>
          <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{formatLastActive(p.last_active)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
        <LevelBadge level={p.level} />
        {p.streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '3px 7px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: 10, fontWeight: 700, color: COLORS.red, fontFamily: "'JetBrains Mono',monospace" }}>
            <Zap size={10} />{p.streak}
          </div>
        )}
        <button onClick={onDuel} title={t.friends.challengeToDuel} style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Swords size={14} color={COLORS.red} />
        </button>
        {confirmRemove ? (
          <button onClick={() => onRemove(friendship.id)} style={{ padding: '5px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: COLORS.red, fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
            {t.friends.removeFriend}
          </button>
        ) : (
          <button onClick={() => setConfirmRemove(true)} style={{ width: 30, height: 30, borderRadius: 8, background: 'none', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', opacity: 0.5 }}>
            <X size={14} color="var(--text-muted)" />
          </button>
        )}
      </div>
    </div>
  );
}
