import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CARD_COMPACT, TYPE, COLORS } from '../constants/styles';
import { SUBJECT_META } from '../config/subjects';
import { ALL_PROFILES, SUBS } from '../config/questionPools';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useNav } from '../contexts/NavigationContext';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../locales';
import { calcTestXP } from '../utils/xpHelpers';
import { shareToWhatsApp, shareToTelegram, copyText } from '../utils/shareHelpers';
import {
  createDuel, joinDuel, submitAnswer, getDuel, forfeitDuel,
  subscribeToDuel, buildDuelInviteUrl, parseDuelInviteParam,
} from '../utils/duelHelpers';
import type { CreateDuelResult, JoinDuelResult } from '../utils/duelHelpers';
import { trackEvent } from '../utils/analytics';
import BackButton from './ui/BackButton';
import LoadingSpinner from './ui/LoadingSpinner';
import {
  Swords, Copy, MessageCircle, Send, ArrowRight,
  ChevronRight, Crown, Clock, Check, X, Zap, Trophy, RotateCcw,
} from 'lucide-react';
import type { DuelQuestion, DuelState, Profile, TestResult } from '../types/index';

type Phase = 'menu' | 'lobby' | 'vs' | 'playing' | 'results';

const QUESTION_TIME = 30; // seconds per question
const TOTAL_QUESTIONS = 10;

const ALL_SUBJECTS = [
  ...Object.values(SUBS).map(s => ({ id: s.id, name: s.name, icon: s.icon, color: s.color })),
  ...ALL_PROFILES.map(p => ({ id: p.id, name: p.name, icon: p.icon, color: p.color })),
];

export default function Duel() {
  const { goHome } = useNav();
  const { user } = useAuth();
  const { addHist } = useApp();
  const toast = useToast();
  const t = useT();
  const bp = useBreakpoint();

  const [phase, setPhase] = useState<Phase>('menu');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Duel state
  const [duelId, setDuelId] = useState<number | null>(null);
  const [duelCode, setDuelCode] = useState('');
  const [subject, setSubject] = useState('');
  const [questions, setQuestions] = useState<DuelQuestion[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<Profile | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<Profile | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  // Playing state
  const [currentQ, setCurrentQ] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const [oppProgress, setOppProgress] = useState(0);
  const [oppDone, setOppDone] = useState(false);
  const [myDone, setMyDone] = useState(false);
  const [timer, setTimer] = useState(QUESTION_TIME);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<{ correct: boolean; correctIdx: number } | null>(null);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [myAnswers, setMyAnswers] = useState<(boolean | null)[]>([]);
  const [oppAnswers, setOppAnswers] = useState<(boolean | null)[]>([]);

  // Results
  const [finalCreatorScore, setFinalCreatorScore] = useState(0);
  const [finalOpponentScore, setFinalOpponentScore] = useState(0);

  // VS countdown
  const [vsCountdown, setVsCountdown] = useState(3);

  // Join code input
  const [joinCode, setJoinCode] = useState('');
  const [menuTab, setMenuTab] = useState<'create' | 'join'>('create');

  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const unsubRef = useRef<(() => void) | null>(null);
  const submittingRef = useRef(false);

  // Check for ?duel=CODE on mount
  useEffect(() => {
    const code = parseDuelInviteParam();
    if (code) {
      setJoinCode(code.toUpperCase());
      setMenuTab('join');
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (unsubRef.current) unsubRef.current();
    };
  }, []);

  // Handle duel state update (shared between Realtime and polling)
  const handleDuelUpdate = useCallback((duel: DuelState, amCreator: boolean) => {
    // Update opponent's score and progress
    if (amCreator) {
      setOppScore(duel.opponent_score);
      setOppProgress(Object.keys(duel.opponent_answers || {}).length);
      setOppDone(duel.opponent_done);
    } else {
      setOppScore(duel.creator_score);
      setOppProgress(Object.keys(duel.creator_answers || {}).length);
      setOppDone(duel.creator_done);
    }

    // Opponent joined (lobby → vs) — also fetch opponent profile
    if (duel.status === 'active' && duel.opponent_id) {
      setPhase(prev => {
        if (prev === 'lobby') {
          // Fetch opponent profile
          getDuel(duel.id).then(res => {
            if (amCreator) setOpponentProfile(res.opponent_profile);
            else setCreatorProfile(res.creator_profile);
          }).catch(() => {});
          return 'vs';
        }
        return prev;
      });
    }

    // Both done → results
    if (duel.status === 'finished') {
      setFinalCreatorScore(duel.creator_score);
      setFinalOpponentScore(duel.opponent_score);
      setPhase('results');
    }

    // Forfeit by opponent
    if (duel.status === 'forfeit') {
      toast.info(t.duel.opponentForfeit);
      setPhase('results');
      setFinalCreatorScore(duel.creator_score);
      setFinalOpponentScore(duel.opponent_score);
    }

    // Expired
    if (duel.status === 'expired') {
      toast.error(t.duel.duelExpired);
      setPhase('menu');
    }
  }, [toast]);

  // Subscribe to Realtime updates
  const setupRealtime = useCallback((id: number, amCreator: boolean) => {
    if (unsubRef.current) unsubRef.current();
    unsubRef.current = subscribeToDuel(id, (duel: DuelState) => {
      handleDuelUpdate(duel, amCreator);
    });
  }, [handleDuelUpdate]);

  // Polling fallback — runs every 5s in lobby or waiting-for-opponent phases
  const startPolling = useCallback((id: number, amCreator: boolean) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await getDuel(id);
        handleDuelUpdate(res.duel, amCreator);
        // Update opponent profile if available
        if (amCreator && res.opponent_profile) setOpponentProfile(res.opponent_profile);
        if (!amCreator && res.creator_profile) setCreatorProfile(res.creator_profile);
      } catch { /* ignore polling errors */ }
    }, 5000);
  }, [handleDuelUpdate]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = undefined; }
  }, []);

  // Start/stop polling based on phase
  useEffect(() => {
    if ((phase === 'lobby' || (phase === 'playing' && waitingForOpponent)) && duelId) {
      startPolling(duelId, isCreator);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [phase, waitingForOpponent, duelId, isCreator, startPolling, stopPolling]);

  // Lobby timeout (10 min)
  useEffect(() => {
    if (phase !== 'lobby') return;
    const timeout = setTimeout(() => {
      toast.error(t.duel.timeoutError);
      if (duelId) forfeitDuel(duelId).catch(() => {});
      setPhase('menu');
    }, 10 * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [phase, duelId, toast]);

  // ── Create Duel ────────────────────────────────────────────────────────────
  const handleCreate = async (subjectId: string) => {
    if (!user) { toast.error(t.duel.loginRequired); return; }
    setLoading(true);
    setError('');
    try {
      const result: CreateDuelResult = await createDuel(subjectId);
      setDuelId(result.duel_id);
      setDuelCode(result.code);
      setSubject(subjectId);
      setQuestions(result.questions);
      setCreatorProfile(result.creator_profile);
      setIsCreator(true);
      setupRealtime(result.duel_id, true);
      setPhase('lobby');
      trackEvent('Duel Started', { subject: subjectId });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
    setLoading(false);
  };

  // ── Join Duel ──────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!user) { toast.error(t.duel.loginRequired); return; }
    if (joinCode.length !== 6) { setError(t.duel.codeMustBe6); return; }
    setLoading(true);
    setError('');
    try {
      const result: JoinDuelResult = await joinDuel(joinCode);
      if (!result.questions || result.questions.length === 0) {
        throw new Error(t.duel.cantLoadQuestions);
      }
      setDuelId(result.duel_id);
      setDuelCode(joinCode);
      setSubject(result.subject);
      setQuestions(result.questions);
      setCreatorProfile(result.creator_profile);
      setOpponentProfile(result.opponent_profile);
      setIsCreator(false);
      setupRealtime(result.duel_id, false);
      setPhase('vs');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка');
    }
    setLoading(false);
  };

  // ── VS countdown → playing ─────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'vs') return;
    setVsCountdown(3);
    const id = setInterval(() => {
      setVsCountdown(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setPhase('playing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // ── Timer per question ─────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing' || waitingForOpponent) return;
    setTimer(QUESTION_TIME);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          // Auto-submit null (timeout)
          handleSubmit(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, currentQ, waitingForOpponent]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit answer ──────────────────────────────────────────────────────────
  const handleSubmit = async (answer: number | null) => {
    if (!duelId || submittingRef.current) return;
    submittingRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedAnswer(answer);

    try {
      const result = await submitAnswer(duelId, currentQ, answer);
      setAnswerResult({ correct: result.correct, correctIdx: result.correct_answer });
      setMyScore(result.your_score);
      setMyAnswers(prev => [...prev, result.correct]);

      // Brief delay to show correct/wrong
      await new Promise(r => setTimeout(r, 800));

      if (result.done) {
        setMyDone(true);
        if (oppDone) {
          // Both done — get final state
          try {
            const final = await getDuel(duelId);
            setFinalCreatorScore(final.duel.creator_score);
            setFinalOpponentScore(final.duel.opponent_score);
            // Reconstruct opponent answers for per-question grid
            const oppAns = final.duel[isCreator ? 'opponent_answers' : 'creator_answers'];
            const oppCorrectList: (boolean | null)[] = [];
            for (let i = 0; i < TOTAL_QUESTIONS; i++) {
              const a = oppAns[String(i)];
              oppCorrectList.push(a !== undefined ? a !== null : null);
            }
            setOppAnswers(oppCorrectList);
          } catch { /* will get results via realtime */ }
          setPhase('results');
        } else {
          setWaitingForOpponent(true);
        }
      } else {
        // Next question
        setCurrentQ(prev => prev + 1);
        setSelectedAnswer(null);
        setAnswerResult(null);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t.duel.sendError);
    }
    submittingRef.current = false;
  };

  // When opponent finishes while we're waiting
  useEffect(() => {
    if (waitingForOpponent && oppDone && duelId) {
      (async () => {
        try {
          const final = await getDuel(duelId);
          setFinalCreatorScore(final.duel.creator_score);
          setFinalOpponentScore(final.duel.opponent_score);
        } catch { /* realtime will handle */ }
        setPhase('results');
      })();
    }
  }, [waitingForOpponent, oppDone, duelId]);

  // ── Forfeit ────────────────────────────────────────────────────────────────
  const handleForfeit = async () => {
    if (!duelId) return;
    try {
      await forfeitDuel(duelId);
      goHome();
    } catch {
      goHome();
    }
  };

  // ── Save result to history on results screen ───────────────────────────────
  const resultSaved = useRef(false);
  useEffect(() => {
    if (phase !== 'results' || resultSaved.current) return;
    resultSaved.current = true;
    const myFinalScore = isCreator ? finalCreatorScore : finalOpponentScore;
    const pct = Math.round((myFinalScore / TOTAL_QUESTIONS) * 100);
    const result: TestResult = {
      su: subject,
      co: myFinalScore,
      to: TOTAL_QUESTIONS,
      sc: pct,
      dt: new Date().toLocaleDateString('ru-RU'),
      type: 'duel',
    };
    addHist(result);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rematch ────────────────────────────────────────────────────────────────
  const handleRematch = () => {
    // Reset state
    setPhase('menu');
    setDuelId(null);
    setDuelCode('');
    setQuestions([]);
    setCurrentQ(0);
    setMyScore(0);
    setOppScore(0);
    setOppProgress(0);
    setOppDone(false);
    setMyDone(false);
    setSelectedAnswer(null);
    setAnswerResult(null);
    setWaitingForOpponent(false);
    setMyAnswers([]);
    setOppAnswers([]);
    resultSaved.current = false;
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }
    // Auto-create with same subject
    if (subject) handleCreate(subject);
  };

  const meta = SUBJECT_META[subject];
  const inviteUrl = buildDuelInviteUrl(duelCode);
  const inviteText = `${t.duel.inviteText} ${meta?.name || subject} ${t.duel.inviteTextSuffix} ${duelCode}\n${inviteUrl}`;

  const myFinalScore = isCreator ? finalCreatorScore : finalOpponentScore;
  const oppFinalScore = isCreator ? finalOpponentScore : finalCreatorScore;
  const myProfile = isCreator ? creatorProfile : opponentProfile;
  const oppProfileFinal = isCreator ? opponentProfile : creatorProfile;

  // XP calculation
  const duelXP = Math.round((myFinalScore / TOTAL_QUESTIONS) * 100 * 0.3);
  const isWinner = myFinalScore > oppFinalScore;
  const isDraw = myFinalScore === oppFinalScore;
  const bonusXP = isWinner ? Math.round(duelXP * 0.5) : 0;
  const totalXP = duelXP + bonusXP;

  // ── RENDER ─────────────────────────────────────────────────────────────────

  const padBottom = bp === 'desktop' ? 40 : 100;

  // ── Menu Phase ─────────────────────────────────────────────────────────────
  if (phase === 'menu') {
    return (
      <div style={{ padding: `0 var(--content-padding) ${padBottom}px` }}>
        <BackButton onClick={goHome} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg,${COLORS.red},#f97316)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Swords size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ ...TYPE.h2, margin: 0 }}>{t.duel.title}</h1>
            <p style={{ ...TYPE.caption, margin: '2px 0 0' }}>{t.duel.subtitle}</p>
          </div>
        </div>

        {/* Create / Join tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {(['create', 'join'] as const).map(mt => (
            <button key={mt} onClick={() => { setMenuTab(mt); setError(''); }} style={{
              flex: 1, padding: '10px 16px',
              background: menuTab === mt ? `linear-gradient(135deg,${COLORS.red},#f97316)` : 'var(--bg-card)',
              border: menuTab === mt ? 'none' : '1px solid var(--border)',
              borderRadius: 14, color: menuTab === mt ? '#fff' : 'var(--text-secondary)',
              fontSize: 12, fontWeight: menuTab === mt ? 700 : 600,
              cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
            }}>
              {mt === 'create' ? t.duel.create : t.duel.join}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ ...CARD_COMPACT, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: '10px 14px', marginBottom: 10, fontSize: 12, color: COLORS.red }}>
            {error}
          </div>
        )}

        {loading && <LoadingSpinner />}

        {!loading && menuTab === 'create' && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>{t.duel.selectSubject}</div>
            <div style={{ display: 'grid', gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(2, 1fr)', gap: 6 }}>
              {ALL_SUBJECTS.map(s => (
                <button key={s.id} onClick={() => handleCreate(s.id)} style={{
                  ...CARD_COMPACT, display: 'flex', alignItems: 'center',
                  borderLeft: `3px solid ${s.color}`, padding: '13px 14px',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', width: '100%',
                }}>
                  <span style={{ fontSize: 20, marginRight: 10 }}>{s.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{(t.subjects as Record<string, string>)[s.id] || s.name}</span>
                  <ChevronRight size={16} color={s.color} />
                </button>
              ))}
            </div>
          </>
        )}

        {!loading && menuTab === 'join' && (
          <div style={{ maxWidth: 360, margin: '20px auto', textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>{t.duel.enterCode}</div>
            <input
              type="text"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setError(''); }}
              placeholder="ABCDEF"
              maxLength={6}
              style={{
                width: '100%', padding: '16px', textAlign: 'center',
                background: 'var(--bg-card)', border: '1.5px solid var(--border)',
                borderRadius: 14, color: 'var(--text)', fontSize: 24,
                fontFamily: "'JetBrains Mono',monospace", fontWeight: 700,
                letterSpacing: 6, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleJoin}
              disabled={joinCode.length !== 6}
              style={{
                width: '100%', padding: '14px', marginTop: 12,
                background: joinCode.length === 6 ? `linear-gradient(135deg,${COLORS.red},#f97316)` : 'var(--bg-subtle-2)',
                border: 'none', borderRadius: 14, color: '#fff',
                fontSize: 14, fontWeight: 700, cursor: joinCode.length === 6 ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Swords size={18} />Присоединиться
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Lobby Phase ────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <div style={{ padding: `0 var(--content-padding) ${padBottom}px` }}>
        <BackButton onClick={handleForfeit} />
        <div style={{ maxWidth: 400, margin: '30px auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: `linear-gradient(135deg,${COLORS.red},#f97316)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Swords size={32} color="#fff" />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
            {meta?.name || subject}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
            {t.duel.sendCode}
          </div>

          {/* Code display */}
          <div style={{
            padding: '20px', background: 'var(--bg-card)',
            border: '2px dashed var(--border)', borderRadius: 16, marginBottom: 16,
          }}>
            <div style={{
              fontSize: 36, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace",
              letterSpacing: 8, color: 'var(--text)',
            }}>
              {duelCode}
            </div>
          </div>

          {/* Share buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <button onClick={() => shareToWhatsApp(inviteText)} style={{ flex: 1, padding: '10px', background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 10, color: '#25D366', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <MessageCircle size={15} />WhatsApp
            </button>
            <button onClick={() => shareToTelegram(inviteText)} style={{ flex: 1, padding: '10px', background: 'rgba(26,154,140,0.1)', border: '1px solid rgba(26,154,140,0.2)', borderRadius: 10, color: COLORS.teal, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Send size={15} />Telegram
            </button>
            <button onClick={async () => { const ok = await copyText(inviteUrl); toast.success(ok ? 'Скопировано!' : 'Ошибка'); }} style={{ flex: 1, padding: '10px', background: 'rgba(255,107,53,0.1)', border: '1px solid rgba(255,107,53,0.2)', borderRadius: 10, color: COLORS.accent, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Copy size={15} />Ссылка
            </button>
          </div>

          {/* Waiting animation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-secondary)' }}>
            <div style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }}>
              <Clock size={16} />
            </div>
            <span style={{ fontSize: 12 }}>{t.duel.waiting}</span>
          </div>
        </div>
      </div>
    );
  }

  // ── VS Phase ───────────────────────────────────────────────────────────────
  if (phase === 'vs') {
    const p1 = isCreator ? creatorProfile : opponentProfile;
    const p2 = isCreator ? opponentProfile : creatorProfile;

    return (
      <div style={{ padding: `0 var(--content-padding) ${padBottom}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
          {meta?.name || subject}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* Player 1 */}
          <div style={{ textAlign: 'center' }}>
            <PlayerAvatar profile={p1} size={64} />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>
              {p1?.nickname && !p1.nickname.startsWith('user_') ? `@${p1.nickname}` : (p1?.display_name || 'Вы')}
            </div>
          </div>

          {/* VS */}
          <div style={{
            fontSize: vsCountdown > 0 ? 48 : 36, fontWeight: 900,
            fontFamily: "'Unbounded',sans-serif",
            background: `linear-gradient(135deg,${COLORS.red},#f97316)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'firePulse 1s ease-in-out infinite',
          }}>
            {vsCountdown > 0 ? vsCountdown : 'VS'}
          </div>

          {/* Player 2 */}
          <div style={{ textAlign: 'center' }}>
            <PlayerAvatar profile={p2} size={64} />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginTop: 8 }}>
              {p2?.nickname && !p2.nickname.startsWith('user_') ? `@${p2.nickname}` : (p2?.display_name || t.duel.opponent)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Playing Phase ──────────────────────────────────────────────────────────
  if (phase === 'playing') {
    if (waitingForOpponent) {
      return (
        <div style={{ padding: `0 var(--content-padding) ${padBottom}px`, textAlign: 'center', paddingTop: 60 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Check size={32} color={COLORS.green} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            {t.duel.youFinished}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: COLORS.green, marginBottom: 16 }}>
            {myScore}/{TOTAL_QUESTIONS}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-secondary)' }}>
            <div style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }}>
              <Clock size={16} />
            </div>
            <span style={{ fontSize: 12 }}>{t.duel.waiting} ({oppProgress}/{TOTAL_QUESTIONS})</span>
          </div>
        </div>
      );
    }

    const q = questions[currentQ];
    if (!q || !q.o || q.o.length === 0) {
      // Skip broken question — auto-submit null and move on
      if (q && duelId && !submittingRef.current) handleSubmit(null);
      return <LoadingSpinner />;
    }

    const timerColor = timer <= 5 ? COLORS.red : timer <= 10 ? COLORS.amber : 'var(--text)';
    const timerPct = (timer / QUESTION_TIME) * 100;

    return (
      <div style={{ padding: `0 var(--content-padding) 20px` }}>
        {/* Top bar: scores + timer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', marginBottom: 8 }}>
          {/* My score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: COLORS.green }}>
              {myScore}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Вы</div>
          </div>

          {/* Question counter + timer */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {currentQ + 1}/{TOTAL_QUESTIONS}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: timerColor }}>
              {timer}
            </div>
          </div>

          {/* Opponent score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.duel.opponent}</div>
            <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: COLORS.red }}>
              {oppScore}
            </div>
          </div>
        </div>

        {/* Timer bar */}
        <div style={{ height: 4, borderRadius: 2, background: 'var(--bg-secondary)', marginBottom: 12, overflow: 'hidden' }}>
          <div style={{
            width: `${timerPct}%`, height: '100%', borderRadius: 2,
            background: timer <= 5 ? COLORS.red : timer <= 10 ? COLORS.amber : `linear-gradient(90deg,${COLORS.teal},${COLORS.tealLight})`,
            transition: 'width 1s linear',
          }} />
        </div>

        {/* Opponent progress dots */}
        <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 14 }}>
          {Array.from({ length: TOTAL_QUESTIONS }, (_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: 4,
              background: i < oppProgress ? COLORS.red : 'var(--bg-subtle-2)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Question */}
        <div style={{ ...CARD_COMPACT, padding: '16px', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', lineHeight: 1.6 }}>
            {q.q}
          </div>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {q.o.map((opt, i) => {
            let bg = 'var(--bg-card)';
            let border = '1px solid var(--border)';
            let color = 'var(--text)';

            if (answerResult) {
              if (i === answerResult.correctIdx) {
                bg = 'rgba(34,197,94,0.12)';
                border = `1.5px solid ${COLORS.green}`;
                color = COLORS.green;
              } else if (i === selectedAnswer && !answerResult.correct) {
                bg = 'rgba(239,68,68,0.12)';
                border = `1.5px solid ${COLORS.red}`;
                color = COLORS.red;
              }
            } else if (i === selectedAnswer) {
              bg = 'rgba(26,154,140,0.1)';
              border = `1.5px solid ${COLORS.teal}`;
            }

            return (
              <button
                key={i}
                onClick={() => !answerResult && !submittingRef.current && handleSubmit(i)}
                disabled={!!answerResult || submittingRef.current}
                style={{
                  padding: '14px 16px', background: bg, border, borderRadius: 12,
                  color, fontSize: 13, fontWeight: 500, cursor: answerResult ? 'default' : 'pointer',
                  textAlign: 'left', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                  background: answerResult && i === answerResult.correctIdx ? COLORS.green : 'var(--bg-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace",
                  color: answerResult && i === answerResult.correctIdx ? '#fff' : 'var(--text-secondary)',
                }}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Results Phase ──────────────────────────────────────────────────────────
  if (phase === 'results') {
    return (
      <div style={{ padding: `0 var(--content-padding) ${padBottom}px` }}>
        <div style={{ maxWidth: 400, margin: '20px auto', textAlign: 'center' }}>
          {/* Winner announcement */}
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 12px',
            background: isDraw ? 'rgba(245,158,11,0.1)' : isWinner ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isDraw ? <Swords size={32} color={COLORS.amber} /> : isWinner ? <Crown size={32} color={COLORS.green} /> : <X size={32} color={COLORS.red} />}
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: isDraw ? COLORS.amber : isWinner ? COLORS.green : COLORS.red, marginBottom: 4 }}>
            {isDraw ? t.duel.draw : isWinner ? t.duel.victory : t.duel.defeat}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16 }}>
            {meta?.name || subject}
          </div>

          {/* Score comparison */}
          <div style={{
            ...CARD_COMPACT, padding: '16px', marginBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          }}>
            <div style={{ textAlign: 'center' }}>
              <PlayerAvatar profile={myProfile} size={44} />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6 }}>Вы</div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: COLORS.green }}>
                {myFinalScore}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>из {TOTAL_QUESTIONS}</div>
            </div>
            <div style={{
              fontSize: 14, fontWeight: 800, color: 'var(--text-muted)',
              fontFamily: "'Unbounded',sans-serif",
            }}>VS</div>
            <div style={{ textAlign: 'center' }}>
              <PlayerAvatar profile={oppProfileFinal} size={44} />
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6 }}>
                {oppProfileFinal?.nickname && !oppProfileFinal.nickname.startsWith('user_') ? `@${oppProfileFinal.nickname}` : (oppProfileFinal?.display_name || t.duel.opponent)}
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: COLORS.red }}>
                {oppFinalScore}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>из {TOTAL_QUESTIONS}</div>
            </div>
          </div>

          {/* Per-question grid */}
          {myAnswers.length > 0 && (
            <div style={{ ...CARD_COMPACT, padding: '12px', marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{t.duel.byQuestions}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
                {myAnswers.map((correct, i) => (
                  <div key={i} style={{
                    width: '100%', aspectRatio: '1', borderRadius: 6,
                    background: correct ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700,
                    color: correct ? COLORS.green : COLORS.red,
                  }}>
                    {correct ? <Check size={12} /> : <X size={12} />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* XP earned */}
          <div style={{
            ...CARD_COMPACT, padding: '12px 16px', marginBottom: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Zap size={18} color={COLORS.amber} />
            <span style={{ fontSize: 16, fontWeight: 700, color: COLORS.amber, fontFamily: "'JetBrains Mono',monospace" }}>
              +{totalXP} XP
            </span>
            {bonusXP > 0 && (
              <span style={{ fontSize: 10, color: COLORS.green, fontWeight: 600 }}>
                (+{bonusXP} {t.duel.bonusXP})
              </span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleRematch} style={{
              flex: 1, padding: '14px', background: `linear-gradient(135deg,${COLORS.red},#f97316)`,
              border: 'none', borderRadius: 14, color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <RotateCcw size={16} />{t.duel.rematch}
            </button>
            <button onClick={goHome} style={{
              flex: 1, padding: '14px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 14, color: 'var(--text)',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {t.test.goHome}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── PlayerAvatar sub-component ───────────────────────────────────────────────

function PlayerAvatar({ profile, size }: { profile: Profile | null; size: number }) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        style={{
          width: size, height: size, borderRadius: size * 0.3,
          objectFit: 'cover', display: 'block', margin: '0 auto',
        }}
      />
    );
  }
  const initials = (profile?.display_name || profile?.nickname || '?').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.3,
      background: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealLight})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: '#fff', margin: '0 auto',
    }}>
      {initials}
    </div>
  );
}
