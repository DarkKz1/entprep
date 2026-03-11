import React, { useState, useEffect, useRef } from "react";
import { ALL_PROFILES, SUBS, TOTAL_Q } from '../config/questionPools';
import { getRecommendations, calcStreak, getTopWeakTopic } from '../utils/adaptiveHelpers';
import { getDailyChallenge, getPersonalBests, getGoalProgress } from '../utils/competitionHelpers';
import { getEntCountdown } from '../config/ent';
import { getDueCount } from '../utils/srEngine';
import { CARD_COMPACT, COLORS, TINT } from '../constants/styles';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useNav } from '../contexts/NavigationContext';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { prefetchCounts, getPoolSize, getTotalQ } from '../utils/questionStore';
import { calcTotalXP, getTodayXP } from '../utils/xpHelpers';
import { useT } from '../locales';
import HomeHeaderBar from './HomeHeaderBar';
import HomeCountdown from './HomeCountdown';
import HomeTodayStrip from './HomeTodayStrip';
import HomeSubjectGrid from './HomeSubjectGrid';
import HomeNavCards from './HomeNavCards';
import { Lightbulb, ArrowRight, ArrowDown, KeyRound, AlertCircle, X, BookOpen } from 'lucide-react';
import type { SubjectConfig } from '../types';
import type { EntCountdown } from '../config/ent';

// Module-level flag — animation plays once per browser session (survives re-renders, not page reloads)
let hasAnimatedThisSession = false;
const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Wrapper that staggers children appearance on first Home mount */
function Stagger({ index, children }: { index: number; children: React.ReactNode }) {
  if (hasAnimatedThisSession || reducedMotion) return <>{children}</>;
  return (
    <div style={{
      opacity: 0,
      animation: `fadeIn 0.4s cubic-bezier(0.4,0,0.2,1) ${index * 60}ms forwards`,
    }}>
      {children}
    </div>
  );
}

export default function Home() {
  const { nav } = useNav();
  const { hist, prof, st, srCards, updSt } = useApp();
  const { user, isPremium } = useAuth();
  const bp = useBreakpoint();
  const t = useT();
  const today = new Date().toLocaleDateString('ru-RU');
  const todayTestCount = hist.filter(h => h.dt === today && h.type !== 'fullent').length;

  const [poolSizes, setPoolSizes] = useState<Record<string, number>>({});
  const [totalQ, setTotalQ] = useState(TOTAL_Q);
  const [countdown, setCountdown] = useState<EntCountdown | null>(getEntCountdown);
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    // Fast count-only fetch first, then full prefetch in background
    prefetchCounts().then((updated) => {
      if (updated) {
        const allSids = [...Object.keys(SUBS), ...ALL_PROFILES.map(p => p.id)];
        const unique = [...new Set(allSids)];
        const sizes: Record<string, number> = {};
        for (const sid of unique) sizes[sid] = getPoolSize(sid);
        setPoolSizes(sizes);
        setTotalQ(getTotalQ());
      }
    });
  }, []);

  // Live countdown timer
  useEffect(() => {
    function tick() {
      const cd = getEntCountdown();
      setCountdown(cd);
      if (cd) {
        const diff = cd.targetDate.getTime() - Date.now();
        if (diff <= 0) { setTimeStr(''); return; }
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeStr(`${String(d).padStart(2, '0')}:${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const streak = calcStreak(hist, isPremium, st.streakFreezeUsedAt);
  const totalXP = calcTotalXP(hist);
  const todayXP = getTodayXP(hist);
  const profSubs = prof.map(id => ALL_PROFILES.find(p => p.id === id)).filter(Boolean) as SubjectConfig[];
  const weakTopic = getTopWeakTopic(hist, prof);
  const recs = getRecommendations(hist, prof);
  const topWeak = recs.weak.length > 0 && recs.weak[0].score > 60 ? recs.weak[0] : null;
  const daily = getDailyChallenge(hist, prof);
  const bests = getPersonalBests(hist);
  const goalProg = getGoalProgress(hist, st.goal);
  const mandatorySubs = Object.values(SUBS);

  const dailyGoal = st.dailyGoal || 3;
  const dailyProgress = Math.min(todayTestCount, dailyGoal);
  const dailyDone = dailyProgress >= dailyGoal;
  const srDueCount = getDueCount(srCards);

  // Auto-save freeze date when freeze activates
  useEffect(() => {
    if (streak.frozenToday && st.streakFreezeUsedAt !== new Date().toISOString().slice(0, 10)) {
      updSt({ ...st, streakFreezeUsedAt: new Date().toISOString().slice(0, 10) });
    }
  }, [streak.frozenToday]);

  // Evening error reminder
  const hour = new Date().getHours();
  const todayHasErrors = hist.some(h => h.dt === today && h.qd?.some(q => !q.ok));
  const [eveningDismissed, setEveningDismissed] = useState(false);
  const showEveningBanner = hour >= 19 && todayHasErrors && !eveningDismissed;

  const [authNudgeDismissed, setAuthNudgeDismissed] = useState(
    () => !!localStorage.getItem('entprep_auth_nudge_dismissed'),
  );
  const showAuthNudge = !user && !authNudgeDismissed;

  // Mark animation as played after first render
  const didMarkRef = useRef(false);
  useEffect(() => {
    if (!didMarkRef.current) { didMarkRef.current = true; hasAnimatedThisSession = true; }
  }, []);

  return (
    <div style={{ padding: `0 var(--content-padding) ${bp === 'desktop' ? 40 : 100}px` }}>

      {/* 1. Compact header bar: streak + XP */}
      <Stagger index={0}>
        <HomeHeaderBar
          streak={streak}
          todayXP={todayXP}
          practicedToday={todayTestCount > 0}
        />
      </Stagger>

      {/* 2. Hero: Welcome banner (new users) + ENT countdown */}
      <Stagger index={1}>
        <div style={{ marginBottom: 24 }}>
          {hist.length === 0 && (
            <div style={{
              ...CARD_COMPACT,
              background: TINT.teal.bgLight,
              border: `1px solid ${TINT.teal.borderLight}`,
              padding: '14px 16px',
              marginBottom: countdown ? 12 : 0,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <BookOpen size={20} color={COLORS.teal} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
                  {t.home.welcomeTitle}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {t.home.welcomeDesc}
                </div>
              </div>
              <ArrowDown size={16} color={COLORS.teal} style={{ flexShrink: 0, opacity: 0.6 }} />
            </div>
          )}
          {countdown && (
            <HomeCountdown countdown={countdown} timeStr={timeStr} goalApprox={goalProg} />
          )}
        </div>
      </Stagger>

      {/* 3. Today strip: daily goal + daily challenge */}
      <Stagger index={2}>
        <HomeTodayStrip
          dailyGoal={dailyGoal}
          dailyProgress={dailyProgress}
          dailyDone={dailyDone}
          daily={daily}
          srDueCount={srDueCount}
        />
      </Stagger>

      {/* 4. Subject Grid (2-col) */}
      <Stagger index={3}>
        <HomeSubjectGrid
          mandatory={mandatorySubs}
          profile={profSubs}
          hist={hist}
          poolSizes={poolSizes}
          bests={bests}
        />
      </Stagger>

      {/* 5. Full ENT + Social + Tools */}
      <Stagger index={4}>
        <HomeNavCards isPremium={isPremium} />
      </Stagger>

      {/* 6. Conditional banners at bottom */}
      <div style={{ marginTop: 24 }}>
        {showAuthNudge && (
          <button onClick={() => nav('settings')} style={{
            ...CARD_COMPACT, display: 'flex', alignItems: 'center', width: '100%',
            background: TINT.teal.bgLight, border: `1px solid ${TINT.teal.borderLight}`,
            padding: '10px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.2s',
          }}>
            <KeyRound size={16} color={COLORS.teal} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', marginLeft: 10 }}>
              {t.home.authNudge}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowRight size={14} color={COLORS.teal} />
              <div onClick={e => {
                e.stopPropagation();
                localStorage.setItem('entprep_auth_nudge_dismissed', '1');
                setAuthNudgeDismissed(true);
              }} role="button" aria-label={t.close} style={{
                width: 44, height: 44, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <X size={14} color="var(--text-muted)" />
              </div>
            </div>
          </button>
        )}

        {showEveningBanner && (
          <button onClick={() => nav('errors')} style={{
            ...CARD_COMPACT, display: 'flex', alignItems: 'center', width: '100%',
            background: TINT.amber.bgLight, border: `1px solid ${TINT.amber.borderLight}`,
            padding: '10px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.2s',
          }}>
            <AlertCircle size={16} color={COLORS.amber} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', marginLeft: 10 }}>
              {t.home.errorReviewBanner}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowRight size={14} color={COLORS.amber} />
              <div onClick={e => { e.stopPropagation(); setEveningDismissed(true); }} role="button" aria-label={t.close} style={{
                width: 44, height: 44, borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <X size={14} color="var(--text-muted)" />
              </div>
            </div>
          </button>
        )}

        {(weakTopic || topWeak) && (
          <button onClick={() => weakTopic ? nav('test', weakTopic.subjectId, weakTopic.topicId) : nav('adaptive')} style={{
            ...CARD_COMPACT, display: 'flex', alignItems: 'center', width: '100%',
            background: TINT.accent.bgLight, border: `1px solid ${TINT.accent.borderLight}`,
            padding: '10px 14px', marginBottom: 8, cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.2s',
          }}>
            <Lightbulb size={16} color={COLORS.accent} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)', marginLeft: 10 }}>
              {weakTopic
                ? <>{weakTopic.topicIcon} <strong style={{ color: 'var(--text)' }}>{(t.subjects as Record<string, string>)[weakTopic.subjectId] || weakTopic.subjectName}</strong> — {weakTopic.topicName} ({weakTopic.pct}%)</>
                : <>{t.home.recommend} <strong style={{ color: 'var(--text)' }}>{(t.subjects as Record<string, string>)[topWeak!.id] || topWeak!.name}</strong> ({topWeak!.avg}%)</>}
            </span>
            <ArrowRight size={14} color={COLORS.accent} />
          </button>
        )}
      </div>
    </div>
  );
}
