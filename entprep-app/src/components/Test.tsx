import React, { useState, useEffect, useRef } from "react";
import { SUBS, ALL_PROFILES } from '../config/questionPools';
import { getQs } from '../utils/questionHelpers';
import { supabase } from '../config/supabase';
import { CARD, CARD_COMPACT, TYPE, COLORS, scoreColor } from '../constants/styles';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useNav } from '../contexts/NavigationContext';
import { useToast } from '../contexts/ToastContext';
import { formatTime } from '../utils/formatters';
import { isNewRecord, completeDailyChallenge, loadDaily } from '../utils/competitionHelpers';
import TestSkeleton from './ui/TestSkeleton';
import BackButton from './ui/BackButton';
import ProgressBar from './ui/ProgressBar';
import { Lightbulb, Bot, Share2, Check, X, ChevronDown, ChevronUp, Swords, Trophy, Flag, WifiOff } from 'lucide-react';
import { trackEvent } from '../utils/analytics';
import ShareModal from './ShareModal';
import ReportSheet from './ui/ReportSheet';
import type { Question, TestResult, AnswerValue } from '../types';
import { getSingleCorrect, getQType } from '../types';
import { scoreQuestion } from '../utils/scoringEngine';
import { useExplain, getExplainRemaining } from '../utils/aiLimits';
import MultipleAnswerCard from './ui/MultipleAnswerCard';
import MatchingCard from './ui/MatchingCard';
import { calcTestXP } from '../utils/xpHelpers';
import ScoreRing from './ui/ScoreRing';
import { useT } from '../locales';

interface TestProps {
  sid: string;
  tid?: string | null;
  customQs?: Question[] | null;
  finish: (result: TestResult) => void;
}

interface AIText {
  short: string;
  detailed: string;
}

interface ChallengeSession {
  subjectId: string;
  score: number;
}

export default function Test({ sid, tid, customQs = null, finish }: TestProps) {
  const { st, hist } = useApp();
  const { user, isPremium } = useAuth();
  const { goHome, setCustomQs: setNavCustomQs, setScreen, openPaywall } = useNav();
  const toast = useToast();
  const t = useT();
  const { exp: showExp = true, tmr: useTmr = true, shf: useShuffle = true } = st;
  const sub = SUBS[sid] || ALL_PROFILES.find(p => p.id === sid);

  const [qs, setQs] = useState<Question[] | null>(null);
  const [loading, setLoading] = useState(true);
  const baseTime = sid === "history" ? 30 * 60 : 20 * 60;
  const [cur, setCur] = useState(0); const [ans, setAns] = useState<Record<number, AnswerValue>>({}); const [show, setShow] = useState(false);
  const [tl, setTl] = useState(baseTime); const [fin, setFin] = useState(false); const tr = useRef<ReturnType<typeof setInterval> | null>(null); const autoFinished = useRef(false);
  const [aiText, setAiText] = useState<Record<number, AIText>>({});
  const [aiLoad, setAiLoad] = useState<Record<number, boolean>>({});
  const [aiExpanded, setAiExpanded] = useState<Record<number, boolean>>({});
  const [showShare, setShowShare] = useState(false);
  const [challenge] = useState<ChallengeSession | null>(() => { try { const c = sessionStorage.getItem("entprep_challenge"); return c ? JSON.parse(c) : null; } catch { return null; } });
  const dailyMarkedRef = useRef(false);
  const [reportIdx, setReportIdx] = useState<number | null>(null);
  const [reportSent, setReportSent] = useState<Record<number, boolean>>({});
  const [reportLoading, setReportLoading] = useState(false);
  const [reportComment, setReportComment] = useState('');
  const [focused, setFocused] = useState(-1);
  const [offline, setOffline] = useState(false);

  const handleBack = () => {
    if (customQs) { setNavCustomQs(null); setScreen('errors'); }
    else if (sid === "reading") { goHome(); }
    else { setScreen('topics'); }
  };

  useEffect(() => { let cancelled = false; (async () => { const questions = customQs ? customQs.map(q => ({ ...q, o: [...q.o] })) : await getQs(sid, sub.cnt, useShuffle, tid, st.lang); if (cancelled) return; const tot = questions.length; const timerSec = tid ? Math.max(5 * 60, Math.round(baseTime * (tot / sub.cnt))) : baseTime; setQs(questions); setTl(timerSec); setLoading(false); })(); return () => { cancelled = true } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (loading || !useTmr || offline) { if (tr.current) { clearInterval(tr.current); tr.current = null; } return; } tr.current = setInterval(() => setTl(p => { if (p <= 1) { clearInterval(tr.current!); autoFinished.current = true; setFin(true); return 0; } return p - 1; }), 1000); return () => { if (tr.current) clearInterval(tr.current); }; }, [loading, offline]);
  useEffect(() => { if (!fin || !autoFinished.current || !qs) return; autoFinished.current = false; const tot = qs.length; const timerSec = tid ? Math.max(5 * 60, Math.round(baseTime * (tot / sub.cnt))) : baseTime; const cc = qs.filter((q, i) => ans[i] !== undefined && scoreQuestion(q, ans[i]).correct).length; const qd = qs.map((q, i) => ({ oi: q._oi!, ok: ans[i] !== undefined && scoreQuestion(q, ans[i]).correct, tp: q._topic, stp: q._subtopic })); finish({ su: sid, tp: tid || undefined, co: cc, to: tot, sc: tot ? Math.round(cc / tot * 100) : 0, dt: new Date().toLocaleDateString("ru-RU"), tm: timerSec, qd }); }, [fin]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!fin || dailyMarkedRef.current || customQs || !qs) return;
    const tot = qs.length;
    const cc = qs.filter((q, i) => ans[i] !== undefined && scoreQuestion(q, ans[i]).correct).length;
    const pctVal = tot ? Math.round(cc / tot * 100) : 0;
    const daily = loadDaily();
    if (daily && daily.subjectId === sid && !daily.completed) {
      completeDailyChallenge(pctVal);
      dailyMarkedRef.current = true;
    }
  }, [fin]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (fin && qs) { const cnt = qs.length; const c = qs.filter((q, i) => ans[i] !== undefined && scoreQuestion(q, ans[i]).correct).length; trackEvent('Test Completed', { subject: sid, score: cnt ? Math.round(c / cnt * 100) : 0, questionCount: cnt }); } }, [fin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setFocused(-1); }, [cur]);

  useEffect(() => {
    if (loading || !qs || fin) return;
    const handler = (e: KeyboardEvent) => {
      const optCount = qs[cur]?.o?.length || 4;
      if (!show) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault();
          setFocused(f => f < optCount - 1 ? f + 1 : 0);
        } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setFocused(f => f > 0 ? f - 1 : optCount - 1);
        }
        else if ((e.key === 'Enter' || e.key === ' ') && focused >= 0) {
          e.preventDefault();
          sel(focused);
        }
        else if (e.key >= '1' && e.key <= String(optCount)) {
          e.preventDefault();
          const idx = parseInt(e.key) - 1;
          setFocused(idx);
          sel(idx);
        }
      } else {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
          e.preventDefault();
          nxt();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [loading, qs, fin, cur, show, focused]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause timer when offline
  useEffect(() => {
    if (loading || fin) return;
    const goOffline = () => { setOffline(true); toast.warning((t.test as Record<string, string>).connectionLost || 'Соединение потеряно'); };
    const goOnline = () => { setOffline(false); toast.success((t.test as Record<string, string>).connectionRestored || 'Соединение восстановлено'); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, [loading, fin, toast, t.test]);

  if (loading || !qs) return <TestSkeleton color={sub?.color} />;

  const tot = qs.length; const timerSec = tid ? Math.max(5 * 60, Math.round(baseTime * (tot / sub.cnt))) : baseTime;
  const q = qs[cur]; const qType = getQType(q); const cc = qs.filter((qq, i) => ans[i] !== undefined && scoreQuestion(qq, ans[i]).correct).length;
  const sel = (idx: number) => { if (show || ans[cur] !== undefined || qType !== 'single') return; setAns(p => ({ ...p, [cur]: idx })); if (showExp) { setShow(true); } else { setTimeout(() => { if (cur < tot - 1) { setCur(c => c + 1); } else { if (tr.current) clearInterval(tr.current); setFin(true); } }, 300); } };
  const confirmMulti = (selected: number[]) => { if (ans[cur] !== undefined) return; setAns(p => ({ ...p, [cur]: selected })); if (showExp) { setShow(true); } else { setTimeout(() => { if (cur < tot - 1) { setCur(c => c + 1); } else { if (tr.current) clearInterval(tr.current); setFin(true); } }, 300); } };
  const confirmMatch = (mapping: Record<number, number>) => { if (ans[cur] !== undefined) return; setAns(p => ({ ...p, [cur]: mapping })); if (showExp) { setShow(true); } else { setTimeout(() => { if (cur < tot - 1) { setCur(c => c + 1); } else { if (tr.current) clearInterval(tr.current); setFin(true); } }, 300); } };
  const nxt = () => { setShow(false); if (cur < tot - 1) { setCur(cur + 1); } else { if (tr.current) clearInterval(tr.current); setFin(true); } };
  const fm = formatTime;
  const askAI = async (index: number) => {
    if (aiText[index] || aiLoad[index]) return;
    if (!useExplain()) { toast.warning(t.test.aiLimitReached); return; }
    setAiLoad(p => ({ ...p, [index]: true }));
    try {
      const { data: { session } } = await supabase!.auth.getSession();
      const token = session?.access_token;
      if (!token) { setAiLoad(p => ({ ...p, [index]: false })); return; }
      const qItem = qs[index];
      const res = await fetch("/api/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ question: qItem.q, options: qItem.o, userAnswer: ans[index], correctAnswer: qItem.c, explanation: qItem.e, questionType: getQType(qItem), pairs: qItem.pairs, lang: st.lang })
      });
      if (res.status === 403) { openPaywall('ai'); setAiLoad(p => ({ ...p, [index]: false })); return; }
      const data = await res.json();
      if (data.short) setAiText(p => ({ ...p, [index]: { short: data.short, detailed: data.detailed || data.short } }));
      else if (data.explanation) setAiText(p => ({ ...p, [index]: { short: data.explanation, detailed: data.explanation } }));
      else setAiText(p => ({ ...p, [index]: { short: t.test.aiError, detailed: t.test.aiError } }));
    } catch { setAiText(p => ({ ...p, [index]: { short: t.test.aiConnectionError, detailed: t.test.aiConnectionErrorFull } })); }
    setAiLoad(p => ({ ...p, [index]: false }));
  };
  const reportQuestion = async (index: number, reason: string) => {
    if (!user || reportLoading) return;
    setReportLoading(true);
    try {
      const qItem = qs[index];
      const oi = qItem._oi != null ? qItem._oi : index;
      const { data: found } = await supabase!.from('questions').select('id').eq('subject', sid).eq('idx', oi).limit(1).single();
      if (!found) { setReportLoading(false); toast.warning(t.test.questionNotFound); return; }
      const row: Record<string, unknown> = { question_id: found.id, subject: sid, idx: oi, reason, user_id: user.id };
      if (reportComment.trim()) row.comment = reportComment.trim();
      const { error } = await supabase!.from('question_reports').insert(row);
      if (error && error.code === '23505') {
        // Already reported
      } else if (error) {
        console.error('Report error:', error.message);
        toast.error(t.test.reportFailed);
        setReportLoading(false);
        return;
      }
      setReportSent(p => ({ ...p, [index]: true }));
      toast.success(t.test.reportSent);
    } catch (err) {
      console.error('Report failed:', err);
      toast.error(t.test.reportNetError);
    }
    setReportLoading(false);
    setReportIdx(null);
    setReportComment('');
  };

  const openReport = (idx: number) => { setReportComment(''); setReportIdx(idx); };

  const pct = tot ? Math.round(cc / tot * 100) : 0;
  const record = fin && !customQs ? isNewRecord(hist, { su: sid, sc: pct } as TestResult) : { isRecord: false, prevBest: 0, improvement: 0 };
  const aiBtn = (index: number) => (
    <div style={{ marginTop: 8 }}>
      {user ? <>
        {!aiText[index] && <button onClick={() => askAI(index)} disabled={aiLoad[index]} style={{ ...CARD_COMPACT, background: "linear-gradient(135deg,rgba(26,154,140,0.1),rgba(26,154,140,0.1))", border: "1px solid rgba(26,154,140,0.25)", padding: "9px 14px", cursor: aiLoad[index] ? "wait" : "pointer", color: COLORS.cyan, fontSize: 11, fontWeight: 600, transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Bot size={14} />{aiLoad[index] ? t.test.thinking : `${t.test.aiExplain} (${getExplainRemaining()}/3)`}
        </button>}
        {aiText[index] && <div style={{ ...CARD_COMPACT, fontSize: 11, color: "#5eead4", lineHeight: 1.7, background: "rgba(26,154,140,0.06)", border: "1px solid rgba(26,154,140,0.18)", padding: "10px 12px", marginTop: 4, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
          <Bot size={13} color={COLORS.cyan} style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} /><span style={{ color: COLORS.cyan, fontWeight: 700 }}>{t.test.aiLabel} </span>{aiExpanded[index] ? aiText[index].detailed : aiText[index].short}
          {aiText[index].short !== aiText[index].detailed && <button onClick={() => setAiExpanded(p => ({ ...p, [index]: !p[index] }))} style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 6, background: "none", border: "none", padding: 0, cursor: "pointer", color: COLORS.teal, fontSize: 10, fontWeight: 600 }}>
            {aiExpanded[index] ? <><ChevronUp size={12} />{t.test.brief}</> : <><ChevronDown size={12} />{t.test.detailed}</>}
          </button>}
        </div>}
      </> : <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
        <Bot size={13} style={{ opacity: 0.6 }} /> {t.test.aiLoginHint}
      </div>}
    </div>
  );

  if (fin) return (<div style={{ padding: "0 20px 100px" }}>
    <div style={{ ...CARD, background: "linear-gradient(135deg,rgba(26,26,50,0.8),rgba(22,33,62,0.8),rgba(15,52,96,0.6))", borderRadius: 22, padding: "32px 20px 28px", textAlign: "center", marginBottom: 18, border: `1px solid ${scoreColor(pct)}22`, animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)" }}>
      <ScoreRing value={pct} label={`${pct}%`} sublabel={`${cc}/${tot} ${t.correct}`} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
        <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "10px 8px" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{t.test.timeLabel}</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--text)" }}>{fm(timerSec - tl)}</div>
        </div>
        <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "10px 8px" }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>XP</div>
          <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: COLORS.amber }}>+{calcTestXP({ su: sid, sc: pct, dt: '', co: cc, to: tot })}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: scoreColor(pct), marginTop: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
        {pct >= 70 ? <><Check size={14} />{t.test.aboveThreshold}</> : pct >= 50 ? t.test.needReview : t.test.needMorePrep}
      </div>
      {record.isRecord && <div style={{ marginTop: 12, padding: "8px 14px", background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Trophy size={16} color={COLORS.amber} />
          <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.amber }}>{t.test.newRecord}</span>
        </div>
        {record.prevBest > 0 && <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 3 }}>
          {t.test.was} {record.prevBest}{t.test.became} {pct}% (+{record.improvement}%)
        </div>}
      </div>}
    </div>
    <h3 style={{ ...TYPE.h3, margin: "0 0 10px" }}>{t.test.reviewAnswers}</h3>
    {qs.map((q, i) => { const ua = ans[i]; const qt = getQType(q); const sr = ua !== undefined ? scoreQuestion(q, ua) : null; const ok = sr?.correct ?? false; const borderColor = ok ? COLORS.green : sr?.partial ? COLORS.yellow : ua !== undefined ? COLORS.red : "var(--text-muted)"; return (
      <div key={i} style={{ ...CARD_COMPACT, padding: "12px 13px", marginBottom: 6, borderLeft: `3px solid ${borderColor}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ fontSize: 12, color: "var(--text-body)", marginBottom: 3, fontWeight: 500, flex: 1 }}>{i + 1}. {q.q}</div>
          {sr && qt !== 'single' && <span style={{ fontSize: 10, fontWeight: 700, color: borderColor, flexShrink: 0, marginLeft: 8 }}>{sr.pts}/{sr.maxPts} б.</span>}
        </div>
        {qt === 'single' && (ua !== undefined ? (<div style={{ fontSize: 11, color: ok ? COLORS.green : COLORS.red, display: "flex", alignItems: "center", gap: 4 }}>
          {ok ? <Check size={13} /> : <X size={13} />} {q.o[ua as number]}{!ok && <span style={{ color: COLORS.green }}> → {q.o[getSingleCorrect(q)]}</span>}
        </div>) : (<div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.test.skipped} → {q.o[getSingleCorrect(q)]}</div>))}
        {qt === 'multiple' && (() => { const correctArr = Array.isArray(q.c) ? q.c : [q.c]; const userArr = Array.isArray(ua) ? ua : []; return (<div style={{ fontSize: 11, marginTop: 2 }}>
          {ua !== undefined ? (<><div style={{ color: borderColor, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {ok ? <Check size={13} /> : sr?.partial ? <span style={{ color: COLORS.yellow }}>~</span> : <X size={13} />}
            {t.test.yourAnswer} {userArr.map(idx => q.o[idx]).join(', ')}
          </div>{!ok && <div style={{ color: COLORS.green, marginTop: 2 }}>{t.test.correctAnswer} {correctArr.map(idx => q.o[idx]).join(', ')}</div>}</>) : <div style={{ color: "var(--text-muted)" }}>{t.test.skipped} → {correctArr.map(idx => q.o[idx]).join(', ')}</div>}
        </div>); })()}
        {qt === 'matching' && q.pairs && (<div style={{ fontSize: 11, marginTop: 2 }}>
          {ua !== undefined ? q.pairs.map((pair, pi) => {
            const userMapping = ua as Record<number, number>;
            const pairOk = userMapping[pi] === pi;
            return <div key={pi} style={{ color: pairOk ? COLORS.green : COLORS.red, display: "flex", alignItems: "center", gap: 4, marginBottom: 1 }}>
              {pairOk ? <Check size={11} /> : <X size={11} />} {pair[0]} → {pairOk ? pair[1] : <><s>{q.pairs![userMapping[pi]]?.[1] ?? '?'}</s> <span style={{ color: COLORS.green }}>{pair[1]}</span></>}
            </div>;
          }) : <div style={{ color: "var(--text-muted)" }}>{t.test.skipped}</div>}
        </div>)}
        <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.7, background: "rgba(26,154,140,0.04)", padding: "6px 8px", borderRadius: 8 }}>
          <span style={{ color: COLORS.teal, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}><Lightbulb size={12} /></span> {q.e}
        </div>
        {!ok && aiBtn(i)}
        {user && <div style={{ marginTop: 6, display: 'flex', justifyContent: 'flex-end' }}>
          {reportSent[i]
            ? <span style={{ fontSize: 10, color: COLORS.green, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={11} />{t.test.sent}</span>
            : <button onClick={() => setReportIdx(i)} style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', fontSize: 10, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3, opacity: 0.7 }}><Flag size={11} />{t.test.report}</button>
          }
        </div>}
      </div>
    ); })}
    {challenge && challenge.subjectId === sid && (<div style={{ ...CARD_COMPACT, background: "linear-gradient(135deg,rgba(255,107,53,0.06),rgba(26,154,140,0.06))", border: "1px solid rgba(255,107,53,0.2)", padding: "16px", marginTop: 14, textAlign: "center", animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}><Swords size={18} color={COLORS.accent} /><span style={{ fontSize: 14, fontWeight: 700, color: COLORS.accent }}>{t.test.challengeResult}</span></div>
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 6 }}>
        <div><div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.test.friend}</div><div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-muted)" }}>{challenge.score}%</div></div>
        <div style={{ fontSize: 20, color: "var(--text-muted)", alignSelf: "center" }}>vs</div>
        <div><div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.you}</div><div style={{ fontSize: 24, fontWeight: 800, color: scoreColor(pct > challenge.score ? 70 : pct === challenge.score ? 50 : 0) }}>{pct}%</div></div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: scoreColor(pct > challenge.score ? 70 : pct === challenge.score ? 50 : 0) }}>{pct > challenge.score ? t.test.youWon : pct === challenge.score ? t.test.tie : t.test.friendWon}</div>
    </div>)}
    <button onClick={() => setShowShare(true)} style={{ width: "100%", padding: "15px", marginTop: 14, background: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealLight})`, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(26,154,140,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Share2 size={16} />{t.test.share}
    </button>
    <button onClick={() => { if (challenge) sessionStorage.removeItem("entprep_challenge"); const qd = qs.map((qq, i) => ({ oi: qq._oi!, ok: ans[i] !== undefined && scoreQuestion(qq, ans[i]).correct, tp: qq._topic, stp: qq._subtopic })); finish({ su: sid, tp: tid || undefined, co: cc, to: tot, sc: pct, dt: new Date().toLocaleDateString("ru-RU"), tm: timerSec - tl, qd }); }} style={{ width: "100%", padding: "15px", marginTop: 8, background: sub.color, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{t.test.goHome}</button>
    <ShareModal visible={showShare} onClose={() => setShowShare(false)} type="test" data={{ subjectName: (t.subjects as Record<string, string>)[sid] || sub.name, subjectEmoji: sub.icon, topicName: tid || null, subjectId: sid, topicId: tid, score: cc, total: tot, pct }} />
    <ReportSheet visible={reportIdx !== null} questionText={reportIdx !== null ? qs[reportIdx]?.q : undefined} comment={reportComment} loading={reportLoading} onClose={() => { setReportIdx(null); setReportComment(''); }} onCommentChange={setReportComment} onReport={reason => reportQuestion(reportIdx!, reason)} />
  </div>);

  const isR = !!q.px;
  return (<div style={{ padding: "0 20px 100px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <BackButton onClick={handleBack} label={t.test.exit} />
      {useTmr && <div style={{ ...CARD_COMPACT, background: tl < 120 ? "rgba(239,68,68,0.12)" : "var(--bg-card)", border: `1px solid ${tl < 120 ? "rgba(239,68,68,0.25)" : "var(--border)"}`, padding: "8px 12px", fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: tl < 120 ? COLORS.red : "var(--text)" }}>{fm(tl)}</div>}
    </div>
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.test.questionN} {cur + 1} {t.test.of} {tot}</span>
        <span style={{ fontSize: 11, color: COLORS.green, fontFamily: "'JetBrains Mono',monospace" }}>{cc} {t.correct}</span>
      </div>
      <ProgressBar value={cur + 1} max={tot} />
    </div>
    {offline && <div style={{ ...CARD, background: "linear-gradient(135deg,rgba(26,26,50,0.95),rgba(22,33,62,0.95))", borderRadius: 18, padding: "32px 20px", textAlign: "center", marginBottom: 16, animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
      <WifiOff size={32} color={COLORS.red} style={{ marginBottom: 10 }} />
      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.red, marginBottom: 6 }}>{(t.test as Record<string, string>).connectionLost || 'Соединение потеряно'}</div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{(t.test as Record<string, string>).timerPaused || 'Таймер на паузе. Ваш прогресс сохранён.'}</div>
    </div>}
    {!offline && <div key={`qblock-${cur}`}>
    {isR && <div style={{ ...CARD_COMPACT, background: "rgba(26,154,140,0.06)", border: "1px solid rgba(26,154,140,0.18)", padding: "12px 14px", marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.teal, marginBottom: 4 }}>{"\uD83D\uDCD6"} {q.pt}</div>
      <div style={{ fontSize: 11, color: "var(--text-light)", lineHeight: 1.7 }}>{q.px}</div>
    </div>}
    <div style={{ ...CARD, padding: "20px 16px", marginBottom: 12, animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", lineHeight: 1.6 }}>{q.q}</div>
        {user && !reportSent[cur] && <button onClick={() => openReport(cur)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', flexShrink: 0, opacity: 0.4 }}><Flag size={14} color="var(--text-secondary)" /></button>}
        {user && reportSent[cur] && <Check size={14} color={COLORS.green} style={{ flexShrink: 0, marginTop: 4 }} />}
      </div>
    </div>
    {qType === 'multiple' ? (
      <MultipleAnswerCard
        key={cur}
        question={q}
        onConfirm={confirmMulti}
        showResult={show}
        userAnswer={ans[cur] as number[] | undefined}
      />
    ) : qType === 'matching' ? (
      <MatchingCard
        key={cur}
        question={q}
        onConfirm={confirmMatch}
        showResult={show}
        userAnswer={ans[cur] as Record<number, number> | undefined}
      />
    ) : (
    <div role="radiogroup" aria-label={t.test.answerOptions} style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {q.o.map((opt, idx) => {
        const picked = ans[cur] === idx; const correct = getSingleCorrect(q) === idx;
        let bg = "var(--bg-card)", bd = "1px solid var(--border)", tc = "var(--text-body)";
        if (show && correct) { bg = "rgba(34,197,94,0.1)"; bd = "1px solid rgba(34,197,94,0.35)"; tc = COLORS.green; }
        else if (show && picked && !correct) { bg = "rgba(239,68,68,0.1)"; bd = "1px solid rgba(239,68,68,0.35)"; tc = COLORS.red; }
        else if (picked) { bg = "rgba(255,107,53,0.1)"; bd = "1px solid rgba(255,107,53,0.35)"; tc = COLORS.accent; }
        const isFocused = !show && focused === idx;
        if (isFocused && !picked) { bd = "1px solid rgba(26,154,140,0.5)"; bg = "rgba(26,154,140,0.08)"; }
        return (<button key={`${cur}-${idx}`} onClick={() => sel(idx)} role="radio" aria-checked={picked} aria-label={`${t.test.option} ${String.fromCharCode(65 + idx)}: ${opt}`} style={{ display: "flex", alignItems: "center", background: bg, border: bd, borderRadius: 13, padding: "13px 14px", cursor: show ? "default" : "pointer", textAlign: "left", transition: "all 0.2s", position: "relative", overflow: "hidden", outline: isFocused ? "2px solid rgba(26,154,140,0.4)" : "none", outlineOffset: 1 }}>
          <div style={{ width: 26, height: 26, borderRadius: 13, border: `2px solid ${tc}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: tc, flexShrink: 0, marginRight: 11 }}>
            {show && correct ? <Check size={14} /> : show && picked && !correct ? <X size={14} /> : String.fromCharCode(65 + idx)}
          </div>
          <span style={{ fontSize: 14, color: tc, fontWeight: picked ? 600 : 400 }}>{opt}</span>
        </button>);
      })}
    </div>
    )}
    {show && <div style={{ ...CARD_COMPACT, background: "rgba(26,154,140,0.05)", border: "1px solid rgba(26,154,140,0.12)", padding: "12px 14px", marginTop: 12, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7, display: "flex", gap: 6 }}>
        <Lightbulb size={15} color={COLORS.teal} style={{ flexShrink: 0, marginTop: 2 }} /><span>{q.e}</span>
      </div>
      {aiBtn(cur)}
    </div>}
    {show && <button onClick={nxt} style={{ width: "100%", padding: "15px", marginTop: 12, background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`, color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 4px 20px rgba(255,107,53,0.25)" }}>{cur < tot - 1 ? t.test.nextQuestion : t.test.finishTest}</button>}
    </div>}
    <ReportSheet visible={reportIdx !== null} questionText={reportIdx !== null ? qs[reportIdx]?.q : undefined} comment={reportComment} loading={reportLoading} onClose={() => { setReportIdx(null); setReportComment(''); }} onCommentChange={setReportComment} onReport={reason => reportQuestion(reportIdx!, reason)} />
  </div>);
}
