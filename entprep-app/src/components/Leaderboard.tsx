import React, { useState, useEffect, useMemo } from 'react';
import { CARD_COMPACT, TYPE, COLORS } from '../constants/styles';
import { SUBS, ALL_PROFILES } from '../config/questionPools';
import { SUBJECT_META } from '../config/subjects';
import { supabase } from '../config/supabase';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useNav } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { getFriendIds } from '../utils/socialHelpers';
import { useT } from '../locales';
import BackButton from './ui/BackButton';
import EmptyState from './ui/EmptyState';
import SkeletonCard from './ui/SkeletonCard';
import Chip from './ui/Chip';
import Button from './ui/Button';
import { Trophy, Medal, Users, Activity, UserPlus } from 'lucide-react';

interface LeaderboardRow {
  id: string;
  user_id: string;
  user_name: string;
  nickname?: string;
  avatar_url?: string;
  subject: string;
  score: number;
  created_at: string;
}

interface AggregatedUser {
  user_id: string;
  user_name: string;
  nickname?: string;
  avatar_url?: string;
  testCount: number;
  avgScore: number;
}

type Period = 'week' | 'month' | 'all';
type Scope = 'all' | 'friends';

function getPeriodStart(period: Period): string | null {
  if (period === 'all') return null;
  const d = new Date();
  if (period === 'week') d.setDate(d.getDate() - 7);
  else d.setMonth(d.getMonth() - 1);
  return d.toISOString();
}

function pluralTests(n: number, t1: string, t2: string, t5: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return `${n} ${t1}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${t2}`;
  return `${n} ${t5}`;
}

export default function Leaderboard() {
  const { goHome, nav } = useNav();
  const { user } = useAuth();
  const bp = useBreakpoint();
  const t = useT();
  const [scope, setScope] = useState<Scope>('all');
  const [period, setPeriod] = useState<Period>('week');
  const [filter, setFilter] = useState<string>('all');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendIds, setFriendIds] = useState<string[] | null>(null);

  const PERIODS: { id: Period; label: string }[] = [
    { id: 'week', label: t.leaderboard.week },
    { id: 'month', label: t.leaderboard.month },
    { id: 'all', label: t.leaderboard.allTime },
  ];

  const SCOPES: { id: Scope; label: string }[] = [
    { id: 'all', label: t.leaderboard.allTab },
    { id: 'friends', label: t.leaderboard.friendsTab },
  ];

  const ALL_SUBJECTS = [
    ...Object.values(SUBS).map(s => ({ id: s.id, name: (t.subjects as Record<string, string>)[s.id] || s.name, color: s.color })),
    ...ALL_PROFILES.map(p => ({ id: p.id, name: (t.subjects as Record<string, string>)[p.id] || p.name, color: p.color })),
  ];

  // Load friend IDs when switching to friends scope
  useEffect(() => {
    if (scope !== 'friends' || !user) { setFriendIds(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const ids = await getFriendIds();
        // Include self
        if (!cancelled) setFriendIds([user.id, ...ids]);
      } catch {
        if (!cancelled) setFriendIds([]);
      }
    })();
    return () => { cancelled = true; };
  }, [scope, user]);

  useEffect(() => {
    let cancelled = false;
    // Skip if friends scope but IDs not loaded yet
    if (scope === 'friends' && friendIds === null) return;

    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ period, subject: filter });
        if (scope === 'friends' && friendIds && friendIds.length > 0) {
          params.set('user_ids', friendIds.join(','));
        }
        const res = await fetch(`/api/leaderboard?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setRows([]);
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [period, filter, scope, friendIds]);

  const ranked = useMemo<AggregatedUser[]>(() => {
    const map = new Map<string, { user_name: string; nickname?: string; avatar_url?: string; total: number; sum: number }>();
    for (const r of rows) {
      const entry = map.get(r.user_id);
      if (entry) { entry.total++; entry.sum += r.score; }
      else map.set(r.user_id, { user_name: r.user_name, nickname: r.nickname, avatar_url: r.avatar_url, total: 1, sum: r.score });
    }
    return Array.from(map.entries())
      .map(([uid, v]) => ({
        user_id: uid,
        user_name: v.user_name,
        nickname: v.nickname,
        avatar_url: v.avatar_url,
        testCount: v.total,
        avgScore: Math.round(v.sum / v.total),
      }))
      .sort((a, b) => b.testCount - a.testCount || b.avgScore - a.avgScore)
      .slice(0, 50);
  }, [rows]);

  const periodChipExtra: React.CSSProperties = { padding: '8px 16px', fontSize: 12, flex: 1, textAlign: 'center' };

  const medalColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return null;
  };

  return (
    <div style={{ padding: `0 var(--content-padding) ${bp === 'desktop' ? 40 : 100}px` }}>
      <BackButton onClick={goHome} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${COLORS.green},#10B981)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Trophy size={24} color="#fff" />
        </div>
        <div>
          <h1 style={{ ...TYPE.h2, margin: 0 }}>{t.leaderboard.title}</h1>
          <p style={{ ...TYPE.caption, margin: '2px 0 0' }}>{t.leaderboard.subtitle}</p>
        </div>
      </div>

      {/* Scope: All / Friends */}
      {user && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {SCOPES.map(s => (
            <Chip key={s.id} active={scope === s.id} onClick={() => setScope(s.id)} style={{ flex: 1, padding: '9px 16px', fontSize: 12, textAlign: 'center' }}>
              {s.label}
            </Chip>
          ))}
        </div>
      )}

      {/* Period toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {PERIODS.map(p => (
          <Chip key={p.id} active={period === p.id} onClick={() => setPeriod(p.id)} activeColor="accent" style={periodChipExtra}>{p.label}</Chip>
        ))}
      </div>

      {/* Subject filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 14, WebkitOverflowScrolling: 'touch' as never }}>
        <Chip active={filter === 'all'} onClick={() => setFilter('all')}>{t.leaderboard.allSubjects}</Chip>
        {ALL_SUBJECTS.map(s => (
          <Chip key={s.id} active={filter === s.id} onClick={() => setFilter(s.id)}>{s.name}</Chip>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0, 1, 2, 3, 4].map(i => <SkeletonCard key={i} style={{ animationDelay: `${i * 0.08}s` }} />)}
        </div>
      ) : ranked.length === 0 ? (
        scope === 'friends' ? (
          <div style={{ textAlign: 'center', padding: '32px 16px' }}>
            <EmptyState icon={Users} title={t.leaderboard.noFriendsResults} description={t.leaderboard.addFriendsHint} />
            <Button size="md" Icon={UserPlus} onClick={() => nav('friends')} style={{ marginTop: 12, display: 'inline-flex' }}>
              {t.leaderboard.addFriends}
            </Button>
          </div>
        ) : (
          <EmptyState icon={Users} title={t.leaderboard.noResultsYet} description={t.leaderboard.takeTestHint} />
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ranked.map((entry, i) => {
            const rank = i + 1;
            const medal = medalColor(rank);
            const isMe = user && entry.user_id === user.id;

            return (
              <div
                key={entry.user_id}
                style={{
                  ...CARD_COMPACT,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 14px',
                  border: isMe ? `1.5px solid ${COLORS.accent}` : '1px solid var(--border)',
                  background: isMe ? 'rgba(255,107,53,0.06)' : 'var(--bg-card)',
                  animation: `fadeIn 0.3s ease ${Math.min(i * 0.03, 0.5)}s both`,
                }}
              >
                {/* Rank badge */}
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: medal ? `${medal}20` : 'var(--bg-card)',
                  border: medal ? `1.5px solid ${medal}` : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {medal ? (
                    <Medal size={16} color={medal} />
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: 'var(--text-secondary)' }}>{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                {entry.avatar_url && (
                  <img
                    src={entry.avatar_url}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: '50%', marginLeft: 10, flexShrink: 0, objectFit: 'cover' }}
                  />
                )}

                {/* Name + "You" badge */}
                <div style={{ marginLeft: entry.avatar_url ? 8 : 12, flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {entry.nickname && !entry.nickname.startsWith('user_') ? (
                      <span style={{ fontFamily: "'JetBrains Mono',monospace" }}>@{entry.nickname}</span>
                    ) : entry.user_name}
                    {isMe && <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.accent, background: 'rgba(255,107,53,0.12)', padding: '1px 5px', borderRadius: 4 }}>{t.you}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Activity size={11} color="var(--text-muted)" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{pluralTests(entry.testCount, t.leaderboard.test1, t.leaderboard.test2, t.leaderboard.test5)}</span>
                  </div>
                </div>

                {/* Avg score */}
                <div style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "'JetBrains Mono',monospace",
                  color: entry.avgScore >= 80 ? COLORS.green : entry.avgScore >= 60 ? COLORS.yellow : COLORS.red,
                  background: entry.avgScore >= 80 ? 'rgba(34,197,94,0.1)' : entry.avgScore >= 60 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)',
                  padding: '4px 8px',
                  borderRadius: 8,
                }}>
                  {entry.avgScore}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
