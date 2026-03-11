import React, { useState, useEffect, useRef } from "react";
import { ALL_PROFILES } from '../config/questionPools';
import { ENT_CONFIG, PROFILE_BLOCKS } from '../config/ent';
import { getQs } from '../utils/questionHelpers';
import { assembleProfileSection } from '../utils/questionAssembler';
import { scoreQuestion } from '../utils/scoringEngine';
import { getBlockForIndex } from '../utils/questionAssembler';
import MultipleAnswerCard from './ui/MultipleAnswerCard';
import MatchingCard from './ui/MatchingCard';
import BlockIndicator from './ui/BlockIndicator';
import PointsBadge from './ui/PointsBadge';
import { CARD, CARD_COMPACT, TYPE, COLORS } from '../constants/styles';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useApp } from '../contexts/AppContext';
import { useNav } from '../contexts/NavigationContext';
import { formatTimeHMS } from '../utils/formatters';
import TestSkeleton from './ui/TestSkeleton';
import BackButton from './ui/BackButton';
import ProgressBar from './ui/ProgressBar';
import { GraduationCap, AlertTriangle, Share2, Check, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Lightbulb, Grid3X3, Play, Flag, Pause, BookOpen, Crown, WifiOff } from 'lucide-react';
import ShareModal from './ShareModal';
import ReportSheet from './ui/ReportSheet';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { trackEvent } from '../utils/analytics';
import type { Question, TestResult, ENTSection, AnswerValue } from '../types';
import { getSingleCorrect, getQType } from '../types';
import { calcTestXP } from '../utils/xpHelpers';
import ScoreRing from './ui/ScoreRing';
import { useT } from '../locales';
import { canUseFreeFullEnt, useFreeFullEnt } from '../utils/aiLimits';

interface FullENTProps {
  finish: (result: TestResult) => void;
}

interface Section extends ENTSection {
  qs: Question[];
}

interface SectionResult extends Section {
  correct: number;
  pts: number;
  passed: boolean;
  total: number;
}

export default function FullENT({ finish }: FullENTProps) {
  const { prof, st } = useApp();
  const { goHome, openPaywall } = useNav();
  const { user, isPremium } = useAuth();
  const toast = useToast();
  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';
  const fm = formatTimeHMS;
  const t = useT();
  const subName = (id: string) => (t.subjects as Record<string, string>)[id] || id;

  const [phase, setPhase] = useState<"intro" | "test" | "results">("intro");
  const [sections, setSections] = useState<Section[] | null>(null);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  useEffect(() => { let cancelled = false; (async () => {
    const p1 = ALL_PROFILES.find(p => p.id === prof[0]);
    const p2 = ALL_PROFILES.find(p => p.id === prof[1]);
    const lang = st.lang;
    const [mandatoryQs, prof0Qs, prof1Qs] = await Promise.all([
      Promise.all(ENT_CONFIG.sections.map(s => getQs(s.sid, s.cnt, true, null, lang))),
      assembleProfileSection(prof[0], PROFILE_BLOCKS, true, lang),
      assembleProfileSection(prof[1], PROFILE_BLOCKS, true, lang),
    ]);
    if (cancelled) return;
    // Compute real maxPts based on actual question types in the section
    const calcMaxPts = (qs: Question[]) => qs.reduce((sum, qq) => {
      const qt = getQType(qq);
      return sum + (qt === 'multiple' || qt === 'matching' ? 2 : 1);
    }, 0);
    const secs: Section[] = [
      ...ENT_CONFIG.sections.map((s, i) => ({ ...s, label: (t.subjects as Record<string, string>)[s.sid] || s.label, qs: mandatoryQs[i] })),
      { sid: prof[0], label: (t.subjects as Record<string, string>)[prof[0]] || p1?.name || prof[0], icon: p1?.icon || "\uD83D\uDD2C", cnt: ENT_CONFIG.profileCnt, maxPts: calcMaxPts(prof0Qs), threshold: ENT_CONFIG.profileThreshold, ptsPerQ: ENT_CONFIG.profilePtsPerQ, qs: prof0Qs },
      { sid: prof[1], label: (t.subjects as Record<string, string>)[prof[1]] || p2?.name || prof[1], icon: p2?.icon || "\uD83D\uDCBB", cnt: ENT_CONFIG.profileCnt, maxPts: calcMaxPts(prof1Qs), threshold: ENT_CONFIG.profileThreshold, ptsPerQ: ENT_CONFIG.profilePtsPerQ, qs: prof1Qs },
    ];
    setSections(secs); setSectionsLoading(false);
  })(); return () => { cancelled = true } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [curSec, setCurSec] = useState(0);
  const [curQ, setCurQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Record<number, AnswerValue>>>({});
  const [timeLeft, setTimeLeft] = useState(ENT_CONFIG.totalTime);
  const [showGrid, setShowGrid] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [reportIdx, setReportIdx] = useState<string | null>(null); // "sec-qi" key
  const [reportSent, setReportSent] = useState<Record<string, boolean>>({});
  const [reportLoading, setReportLoading] = useState(false);
  const [reportComment, setReportComment] = useState('');
  const [paused, setPaused] = useState(false);
  const [offline, setOffline] = useState(false);
  const [passageOpen, setPassageOpen] = useState(true);
  // Reset passage to open when navigating to a new question
  useEffect(() => { setPassageOpen(true); }, [curSec, curQ]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== "test" || paused || offline) { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } return; }
    timerRef.current = setInterval(() => setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current!); setPhase("results"); return 0; } return p - 1; }), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, paused, offline]);

  // Pause timer when offline
  useEffect(() => {
    if (phase !== "test") return;
    const goOffline = () => { setOffline(true); toast.warning((t.test as Record<string, string>).connectionLost || 'Соединение потеряно'); };
    const goOnline = () => { setOffline(false); toast.success((t.test as Record<string, string>).connectionRestored || 'Соединение восстановлено'); };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, [phase, toast, t.test]);

  const sec = sections?.[curSec];
  const q = sec?.qs[curQ];
  const secAnswers = answers[curSec] || {};
  const answered = Object.keys(secAnswers).length;

  const sel = (idx: number) => { if (getQType(q!) !== 'single') return; setAnswers(p => ({ ...p, [curSec]: { ...(p[curSec] || {}), [curQ]: idx } })); };
  const confirmMulti = (selected: number[]) => { setAnswers(p => ({ ...p, [curSec]: { ...(p[curSec] || {}), [curQ]: selected } })); };
  const confirmMatch = (mapping: Record<number, number>) => { setAnswers(p => ({ ...p, [curSec]: { ...(p[curSec] || {}), [curQ]: mapping } })); };
  const clearAnswer = () => { setAnswers(p => { const copy = { ...p, [curSec]: { ...(p[curSec] || {}) } }; delete copy[curSec][curQ]; return copy; }); };
  const [secPos, setSecPos] = useState<Record<number, number>>({}); // remember last question per section
  const navigateTo = (s: number, qi: number) => { setSecPos(p => ({ ...p, [curSec]: curQ })); setCurSec(s); setCurQ(qi); setShowGrid(false); };
  const nxt = () => { if (curQ < sec!.qs.length - 1) navigateTo(curSec, curQ + 1); else if (curSec < sections!.length - 1) navigateTo(curSec + 1, secPos[curSec + 1] || 0); else finishENT(); };
  const prev = () => { if (curQ > 0) navigateTo(curSec, curQ - 1); };
  const goSec = (i: number) => { navigateTo(i, secPos[i] || 0); };
  const goQ = (i: number) => { navigateTo(curSec, i); };

  const finishENT = () => { if (timerRef.current) clearInterval(timerRef.current); setPhase("results"); const r = calcResults(); trackEvent('FullENT Completed', { totalScore: Math.round(r.reduce((s, x) => s + x.pts, 0) * 10) / 10 }); };

  const calcResults = (): SectionResult[] => {
    return sections!.map((s, si) => {
      const sa = answers[si] || {};
      const isProfile = s.cnt === ENT_CONFIG.profileCnt;
      let totalPts = 0;
      let correct = 0;
      s.qs.forEach((qq, qi) => {
        const userAns = sa[qi];
        if (userAns === undefined) return;
        if (isProfile) {
          // Use actual question type to determine points, not just block position
          // This prevents single fillers from getting 2pts in multiple/matching blocks
          const qType = getQType(qq);
          const pts = qType === 'multiple' || qType === 'matching' ? 2 : 1;
          const result = scoreQuestion(qq, userAns, pts);
          totalPts += result.pts;
          if (result.correct) correct++;
        } else {
          const result = scoreQuestion(qq, userAns, s.ptsPerQ);
          totalPts += result.pts;
          if (result.correct) correct++;
        }
      });
      const pts = Math.round(totalPts * 10) / 10;
      return { ...s, correct, pts, passed: pts >= s.threshold, total: s.qs.length };
    });
  };

  const totalAnswered = Object.values(answers).reduce((s, a) => s + Object.keys(a).length, 0);
  const reportKey = `${curSec}-${curQ}`;

  const reportQuestion = async (key: string, reason: string) => {
    if (!user || !supabase || reportLoading) return;
    setReportLoading(true);
    try {
      const [si, qi] = key.split('-').map(Number);
      const s = sections![si];
      const qItem = s.qs[qi];
      const oi = qItem._oi != null ? qItem._oi : qi;
      const { data: found } = await supabase.from('questions').select('id').eq('subject', s.sid).eq('idx', oi).limit(1).single();
      if (!found) { setReportLoading(false); toast.warning(t.test.questionNotFound); return; }
      const row: Record<string, unknown> = { question_id: found.id, subject: s.sid, idx: oi, reason, user_id: user.id };
      if (reportComment.trim()) row.comment = reportComment.trim();
      const { error } = await supabase.from('question_reports').insert(row);
      if (error && error.code === '23505') { /* Already reported */ }
      else if (error) { toast.error(t.test.reportFailed); setReportLoading(false); return; }
      setReportSent(p => ({ ...p, [key]: true }));
      toast.success(t.test.reportSent);
    } catch { toast.error(t.test.reportNetError); }
    setReportLoading(false);
    setReportIdx(null);
    setReportComment('');
  };

  const openReport = (key: string) => { setReportComment(''); setReportIdx(key); };

  if (sectionsLoading || !sections) {
    const shimmerStyle: React.CSSProperties = {
      background: 'linear-gradient(90deg, var(--skeleton-bg) 25%, var(--border-light) 50%, var(--skeleton-bg) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s ease-in-out infinite',
    };
    return (
      <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
        {/* Hero skeleton */}
        <div style={{ ...shimmerStyle, borderRadius: 22, height: 140, marginBottom: 20 }} />
        {/* Section card skeletons */}
        <div style={{ display: 'grid', gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(2, 1fr)', gap: 6, marginBottom: 18 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{ ...CARD_COMPACT, padding: '14px', display: 'flex', alignItems: 'center' }}>
              <div style={{ ...shimmerStyle, width: 40, height: 40, borderRadius: 11, flexShrink: 0, animationDelay: `${i * 0.08}s` }} />
              <div style={{ marginLeft: 11, flex: 1 }}>
                <div style={{ ...shimmerStyle, height: 13, width: '70%', borderRadius: 6, marginBottom: 6, animationDelay: `${0.05 + i * 0.08}s` }} />
                <div style={{ ...shimmerStyle, height: 10, width: '50%', borderRadius: 5, animationDelay: `${0.1 + i * 0.08}s` }} />
              </div>
            </div>
          ))}
        </div>
        {/* Start button skeleton */}
        <div style={{ ...shimmerStyle, height: 50, borderRadius: 14 }} />
      </div>
    );
  }

  // ===== INTRO =====
  if (phase === "intro") return (
    <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
      <BackButton onClick={goHome} style={{ marginBottom: 14 }} />
      <div style={{ background: COLORS.teal, borderRadius: 22, padding: "32px 20px", textAlign: "center", marginBottom: 20 }}>
        <GraduationCap size={44} color="#fff" style={{ marginBottom: 10 }} />
        <h1 style={{ ...TYPE.h1, fontSize: 22, marginBottom: 8, color: "#fff" }}>{t.fullent.title}</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", margin: 0 }}>{t.fullent.subtitle}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(2, 1fr)', gap: 6, marginBottom: 18 }}>
        {sections.map((s, i) => {
          const isProfile = s.cnt === ENT_CONFIG.profileCnt;
          return (
          <div key={i} style={{ ...CARD_COMPACT, padding: "14px", display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 24, marginRight: 11 }}>{s.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{subName(s.sid)}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.cnt} {t.fullent.sectionInfo} {s.maxPts} {t.fullent.sectionInfoSuffix} {s.threshold} {t.home.pointsShort}</div>
              {isProfile && <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3 }}>{t.fullent.profileBlocksDesc}</div>}
            </div>
          </div>
        ); })}
      </div>
      <div style={{ ...CARD_COMPACT, background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)", padding: "12px 14px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.yellow, fontWeight: 600, marginBottom: 4 }}>
          <AlertTriangle size={14} />{t.fullent.important}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.7 }}>{t.fullent.importantDesc}</div>
      </div>
      <button onClick={() => {
        if (isPremium) { setPhase("test"); return; }
        if (canUseFreeFullEnt()) { useFreeFullEnt(); setPhase("test"); return; }
        openPaywall('fullent');
      }} style={{ width: "100%", padding: "16px", background: (isPremium || canUseFreeFullEnt()) ? COLORS.teal : 'var(--bg-subtle-2)', color: (isPremium || canUseFreeFullEnt()) ? "#fff" : 'var(--text-muted)', border: (isPremium || canUseFreeFullEnt()) ? "none" : '1px solid var(--border)', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: (isPremium || canUseFreeFullEnt()) ? "0 4px 24px rgba(26,154,140,0.25)" : 'none', display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {isPremium ? <Play size={18} /> : canUseFreeFullEnt() ? <Play size={18} /> : <Crown size={18} />}{isPremium ? t.fullent.startEnt : canUseFreeFullEnt() ? t.fullent.startEnt : t.paywall.getPremium}
      </button>
    </div>
  );

  // ===== RESULTS =====
  if (phase === "results") {
    const res = calcResults();
    const totalPts = Math.round(res.reduce((s, r) => s + r.pts, 0) * 10) / 10;
    const allPassed = res.every(r => r.passed);
    const totalCorrect = res.reduce((s, r) => s + r.correct, 0);
    const elapsed = ENT_CONFIG.totalTime - timeLeft;
    return (
      <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
        <div style={{ ...CARD, background: "linear-gradient(135deg,rgba(26,26,50,0.8),rgba(22,33,62,0.8),rgba(15,52,96,0.6))", borderRadius: 22, padding: "32px 20px 28px", textAlign: "center", marginBottom: 18, border: `1px solid ${allPassed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`, animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)" }}>
          <ScoreRing value={totalPts} max={140} label={`${totalPts}`} sublabel={`${t.test.resultOf} 140 ${t.score}`} size={150} color={allPassed ? COLORS.green : COLORS.red} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
            <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{t.correct}</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--text)" }}>{totalCorrect}/120</div>
            </div>
            <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{t.test.timeLabel}</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "var(--text)" }}>{fm(elapsed)}</div>
            </div>
            <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>XP</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: COLORS.amber }}>+{calcTestXP({ type: 'fullent', su: 'fullent', sc: 0, dt: '', sections: res.map(r => ({ pts: r.pts })) as unknown as TestResult['sections'] })}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: allPassed ? COLORS.green : COLORS.red, marginTop: 12, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {allPassed ? <><Check size={14} />{t.fullent.allThresholdsPassed}</> : <><X size={14} />{t.fullent.someThresholdsFailed}</>}
          </div>
        </div>
        <h3 style={{ ...TYPE.h3, margin: "0 0 12px" }}>{t.fullent.subjectResults}</h3>
        <div style={{ display: "grid", gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(2, 1fr)', gap: 7 }}>
        {res.map((r, i) => (
          <div key={i} style={{ ...CARD_COMPACT, padding: "14px", border: `1px solid ${r.passed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`, borderLeft: `3px solid ${r.passed ? COLORS.green : COLORS.red}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 20 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{subName(r.sid)}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{r.correct}/{r.total} {t.fullent.correctOf}</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: r.passed ? COLORS.green : COLORS.red }}>{r.pts}/{r.maxPts}</div>
                <div style={{ fontSize: 10, color: r.passed ? COLORS.green : COLORS.red, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                  {r.passed ? <><Check size={11} />{t.fullent.threshold}</> : `${t.fullent.thresholdFailed} ${r.threshold})`}
                </div>
              </div>
            </div>
          </div>
        ))}
        </div>
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 13, fontWeight: 600, color: COLORS.teal, cursor: "pointer", marginBottom: 10 }}>{t.fullent.reviewAll}</summary>
          {sections.map((s, si) => (
            <div key={si} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{s.icon} {subName(s.sid)}</div>
              {s.qs.map((qq, qi) => { const ua = (answers[si] || {})[qi]; const qt = getQType(qq); const sr = ua !== undefined ? scoreQuestion(qq, ua) : null; const ok = sr?.correct ?? false; const borderColor = ok ? COLORS.green : sr?.partial ? COLORS.yellow : ua !== undefined ? COLORS.red : "var(--text-muted)"; return (
                <div key={qi} style={{ ...CARD_COMPACT, padding: "10px 12px", marginBottom: 4, borderLeft: `3px solid ${borderColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: 11, color: "var(--text-body)", marginBottom: 3, fontWeight: 500, flex: 1 }}>{qi + 1}. {qq.q}</div>
                    {sr && qt !== 'single' && <span style={{ fontSize: 9, fontWeight: 700, color: borderColor, flexShrink: 0, marginLeft: 6 }}>{sr.pts}/{sr.maxPts} б.</span>}
                  </div>
                  {qt === 'single' && (ua !== undefined ? (<div style={{ fontSize: 10, color: ok ? COLORS.green : COLORS.red, display: "flex", alignItems: "center", gap: 3 }}>
                    {ok ? <Check size={11} /> : <X size={11} />} {qq.o[ua as number]}{!ok && <span style={{ color: COLORS.green }}> → {qq.o[getSingleCorrect(qq)]}</span>}
                  </div>) : (<div style={{ fontSize: 10, color: "var(--text-muted)" }}>{t.test.skipped} → {qq.o[getSingleCorrect(qq)]}</div>))}
                  {qt === 'multiple' && (() => { const correctArr = Array.isArray(qq.c) ? qq.c : [qq.c]; const userArr = Array.isArray(ua) ? ua : []; return (
                    <div style={{ fontSize: 10, marginTop: 2 }}>
                      {ua !== undefined ? (<><div style={{ color: borderColor, display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap" }}>
                        {ok ? <Check size={11} /> : sr?.partial ? <span style={{ color: COLORS.yellow }}>~</span> : <X size={11} />}
                        {t.test.yourAnswer} {userArr.map(idx => qq.o[idx]).join(', ')}
                      </div>{!ok && <div style={{ color: COLORS.green, marginTop: 1 }}>{t.test.correctAnswer} {correctArr.map(idx => qq.o[idx]).join(', ')}</div>}</>) : <div style={{ color: "var(--text-muted)" }}>{t.test.skipped} → {correctArr.map(idx => qq.o[idx]).join(', ')}</div>}
                    </div>); })()}
                  {qt === 'matching' && qq.pairs && (<div style={{ fontSize: 10, marginTop: 2 }}>
                    {ua !== undefined ? qq.pairs.map((pair, pi) => {
                      const userMapping = ua as Record<number, number>;
                      const pairOk = userMapping[pi] === pi;
                      return <div key={pi} style={{ color: pairOk ? COLORS.green : COLORS.red, display: "flex", alignItems: "center", gap: 3, marginBottom: 1 }}>
                        {pairOk ? <Check size={10} /> : <X size={10} />} {pair[0]} → {pairOk ? pair[1] : <><s>{qq.pairs![userMapping[pi]]?.[1] ?? '?'}</s> <span style={{ color: COLORS.green }}>{pair[1]}</span></>}
                      </div>;
                    }) : <div style={{ color: "var(--text-muted)" }}>{t.test.skipped}</div>}
                  </div>)}
                  <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.6, background: "rgba(26,154,140,0.04)", padding: "5px 7px", borderRadius: 6, display: "flex", gap: 4 }}>
                    <Lightbulb size={11} color={COLORS.teal} style={{ flexShrink: 0, marginTop: 1 }} /><span>{qq.e}</span>
                  </div>
                  {user && (reportSent[`${si}-${qi}`]
                    ? <div style={{ fontSize: 9, color: COLORS.green, marginTop: 3, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={10} />{t.test.sent}</div>
                    : <button onClick={() => openReport(`${si}-${qi}`)} style={{ background: 'none', border: 'none', padding: '4px 6px', cursor: 'pointer', fontSize: 9, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3, opacity: 0.7, marginTop: 3 }}><Flag size={10} />{t.test.report}</button>
                  )}
                </div>
              ); })}
            </div>
          ))}
        </details>
        <button onClick={() => setShowShare(true)} style={{ width: "100%", padding: "15px", marginTop: 14, background: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealLight})`, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(26,154,140,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Share2 size={16} />{t.test.share}
        </button>
        <button onClick={() => { const res2 = calcResults(); const totalPts2 = Math.round(res2.reduce((s, r) => s + r.pts, 0) * 10) / 10; finish({ type: "fullent", su: "fullent", sc: 0, dt: new Date().toLocaleDateString("ru-RU"), tm: ENT_CONFIG.totalTime - timeLeft, sections: res2.map(r => ({ sid: r.sid, label: r.label, icon: r.icon, pts: r.pts, maxPts: r.maxPts, passed: r.passed, correct: r.correct, total: r.total })) as unknown as TestResult['sections'] } as TestResult & { score: number }); }} style={{ width: "100%", padding: "15px", marginTop: 8, background: COLORS.teal, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{t.test.goHome}</button>
        <ShareModal visible={showShare} onClose={() => setShowShare(false)} type="fullent" data={{ totalPts, maxPts: 140, results: res }} />
        <ReportSheet visible={reportIdx !== null} questionText={reportIdx !== null && sections ? (() => { const [si, qi] = reportIdx.split('-').map(Number); return sections[si]?.qs[qi]?.q; })() : undefined} comment={reportComment} loading={reportLoading} onClose={() => { setReportIdx(null); setReportComment(''); }} onCommentChange={setReportComment} onReport={reason => reportQuestion(reportIdx!, reason)} />
      </div>
    );
  }

  // ===== TEST =====
  const isR = !!q?.px;
  return (
    <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <BackButton onClick={goHome} label={t.test.exit} style={{ padding: "7px 11px" }} />
        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{totalAnswered}/120</div>
        <button onClick={() => setPaused(p => !p)} style={{ ...CARD_COMPACT, background: paused ? "rgba(234,179,8,0.12)" : "var(--bg-card)", border: `1px solid ${paused ? "rgba(234,179,8,0.3)" : "var(--border)"}`, padding: "7px 9px", cursor: "pointer", color: paused ? COLORS.yellow : "var(--text-muted)", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 3 }}>
          {paused ? <><Play size={12} />{t.fullent.resume}</> : <><Pause size={12} />{t.fullent.pause}</>}
        </button>
        <div style={{ ...CARD_COMPACT, background: timeLeft < 600 ? "rgba(239,68,68,0.12)" : "var(--bg-card)", border: `1px solid ${timeLeft < 600 ? "rgba(239,68,68,0.25)" : "var(--border)"}`, padding: "7px 11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: timeLeft < 600 ? COLORS.red : "var(--text)" }}>{fm(timeLeft)}</div>
      </div>
      {paused && !offline && <div style={{ ...CARD, background: "linear-gradient(135deg,rgba(26,26,50,0.95),rgba(22,33,62,0.95))", borderRadius: 18, padding: "48px 20px", textAlign: "center", marginBottom: 16, animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
        <Pause size={40} color={COLORS.yellow} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.yellow, marginBottom: 8 }}>{t.fullent.paused}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>{t.fullent.pauseDesc}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 20 }}>{t.fullent.pauseStats} {totalAnswered}/120 {t.fullent.pauseRemaining} {fm(timeLeft)}</div>
        <button onClick={() => setPaused(false)} style={{ padding: "14px 32px", background: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})`, color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(26,154,140,0.25)" }}>
          <Play size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />{t.fullent.resume}
        </button>
      </div>}
      {offline && <div style={{ ...CARD, background: "linear-gradient(135deg,rgba(26,26,50,0.95),rgba(22,33,62,0.95))", borderRadius: 18, padding: "48px 20px", textAlign: "center", marginBottom: 16, animation: "slideUp 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
        <WifiOff size={40} color={COLORS.red} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.red, marginBottom: 8 }}>{(t.test as Record<string, string>).connectionLost || 'Соединение потеряно'}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>{(t.test as Record<string, string>).timerPaused || 'Таймер на паузе. Ваш прогресс сохранён.'}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.fullent.pauseStats} {totalAnswered}/120 {t.fullent.pauseRemaining} {fm(timeLeft)}</div>
      </div>}
      {!paused && !offline && <><div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto" }}>
        {sections.map((s, i) => { const sa = answers[i] || {}; const cnt = Object.keys(sa).length; const active = i === curSec; return (
          <button key={i} onClick={() => goSec(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: active ? "rgba(26,154,140,0.12)" : "var(--bg-card)", border: active ? "1px solid rgba(26,154,140,0.3)" : "1px solid var(--border)", borderRadius: 10, padding: "7px 9px", cursor: "pointer", minWidth: 56, flexShrink: 0 }}>
            <span style={{ fontSize: 15 }}>{s.icon}</span>
            <span style={{ fontSize: 9, color: active ? COLORS.teal : "var(--text-muted)", fontWeight: 600, marginTop: 3 }}>{cnt}/{s.cnt}</span>
          </button>
        ); })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{sec!.icon} {subName(sec!.sid)}</span>
        <button onClick={() => setShowGrid(!showGrid)} style={{ ...CARD_COMPACT, background: "var(--bg-card)", padding: "5px 10px", cursor: "pointer", color: "var(--text-secondary)", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Grid3X3 size={13} />#{curQ + 1}/{sec!.cnt}
        </button>
      </div>
      {showGrid && <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4, marginBottom: 12 }}>
        {sec!.qs.map((_qq, i) => { const a = (answers[curSec] || {})[i]; const hasAnswer = a !== undefined; return (
          <button key={i} onClick={() => goQ(i)} style={{ background: i === curQ ? "rgba(26,154,140,0.15)" : hasAnswer ? "rgba(26,154,140,0.08)" : "var(--bg-card)", border: `1px solid ${i === curQ ? "rgba(26,154,140,0.35)" : "var(--border-light)"}`, borderRadius: 6, padding: "5px 0", cursor: "pointer", fontSize: 10, color: i === curQ ? COLORS.teal : hasAnswer ? COLORS.teal : "var(--text-muted)", fontWeight: 600 }}>{i + 1}</button>
        ); })}
      </div>}
      <ProgressBar value={curQ + 1} max={sec!.qs.length} gradient={`linear-gradient(90deg,${COLORS.accent},${COLORS.amber})`} style={{ marginBottom: 12 }} />
      <div key={`qblock-${curSec}-${curQ}`}>
      {isR && <div style={{ ...CARD_COMPACT, background: "rgba(26,154,140,0.06)", border: "1px solid rgba(26,154,140,0.18)", padding: passageOpen ? "12px 14px" : "8px 14px", marginBottom: 12, position: "sticky", top: 0, zIndex: 10, maxHeight: passageOpen ? "40vh" : "auto", overflowY: passageOpen ? "auto" : "hidden", transition: "all 0.2s" }}>
        <button onClick={() => setPassageOpen(p => !p)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.teal, display: "flex", alignItems: "center", gap: 4 }}><BookOpen size={12} />{q!.pt}</div>
          {passageOpen ? <ChevronUp size={14} color={COLORS.teal} /> : <ChevronDown size={14} color={COLORS.teal} />}
        </button>
        {passageOpen && <div style={{ fontSize: 11, color: "var(--text-light)", lineHeight: 1.7, marginTop: 4 }}>{q!.px}</div>}
      </div>}
      {(() => { const isProfile = sec!.cnt === ENT_CONFIG.profileCnt; const block = isProfile ? getBlockForIndex(curQ, PROFILE_BLOCKS) : null; return block ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <BlockIndicator currentIndex={curQ} blocks={PROFILE_BLOCKS} />
          <PointsBadge pts={block.ptsPerQ} />
        </div>
      ) : null; })()}
      <div style={{ ...CARD, padding: "18px 14px", marginBottom: 12, animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", lineHeight: 1.6 }}>{q?.q}</div>
          {user && !reportSent[reportKey] && <button onClick={() => openReport(reportKey)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', flexShrink: 0, opacity: 0.4 }}><Flag size={14} color="var(--text-secondary)" /></button>}
          {user && reportSent[reportKey] && <Check size={14} color={COLORS.green} style={{ flexShrink: 0, marginTop: 4 }} />}
        </div>
      </div>
      {getQType(q!) === 'multiple' ? (
        <MultipleAnswerCard question={q!} onConfirm={confirmMulti} showResult={false} userAnswer={secAnswers[curQ] as number[] | undefined} />
      ) : getQType(q!) === 'matching' ? (
        <MatchingCard key={`m-${curSec}-${curQ}`} question={q!} onConfirm={confirmMatch} showResult={false} userAnswer={secAnswers[curQ] as Record<number, number> | undefined} />
      ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q?.o.map((opt, idx) => {
          const picked = secAnswers[curQ] === idx;
          const locked = secAnswers[curQ] !== undefined;
          let bg = "var(--bg-card)", bd = "1px solid var(--border)", tc = "var(--text-body)";
          if (picked) { bg = "rgba(26,154,140,0.1)"; bd = "1px solid rgba(26,154,140,0.35)"; tc = COLORS.teal; }
          return (<button key={idx} onClick={() => sel(idx)} style={{ display: "flex", alignItems: "center", background: bg, border: bd, borderRadius: 12, padding: "12px 13px", cursor: locked ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, border: `2px solid ${tc}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: tc, flexShrink: 0, marginRight: 10 }}>
              {picked ? <Check size={12} /> : String.fromCharCode(65 + idx)}
            </div>
            <span style={{ fontSize: 13, color: tc, fontWeight: picked ? 600 : 400 }}>{opt}</span>
          </button>);
        })}
      </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {curQ > 0 && <button onClick={prev} style={{ flex: 1, padding: "13px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <ChevronLeft size={16} />{t.fullent.prev}
        </button>}
        {secAnswers[curQ] !== undefined ? <button onClick={nxt} style={{ flex: 2, padding: "13px", background: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})`, color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(26,154,140,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {curQ < sec!.qs.length - 1 ? t.fullent.nextQ : curSec < sections.length - 1 ? t.fullent.nextSubject : t.fullent.finish}<ChevronRight size={16} />
        </button> : <button onClick={() => { if (curQ < sec!.qs.length - 1) navigateTo(curSec, curQ + 1); else if (curSec < sections.length - 1) navigateTo(curSec + 1, secPos[curSec + 1] || 0); }} style={{ flex: 2, padding: "13px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {t.fullent.skipQuestion}<ChevronRight size={16} />
        </button>}
      </div>
      <button onClick={() => { if (window.confirm(t.fullent.finishEarlyConfirm)) finishENT(); }} style={{ width: "100%", padding: "13px", marginTop: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, color: COLORS.red, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{t.fullent.finishEarly}</button>
      </div>
      </>}
      <ReportSheet visible={reportIdx !== null} questionText={reportIdx !== null && sections ? (() => { const [si, qi] = reportIdx.split('-').map(Number); return sections[si]?.qs[qi]?.q; })() : undefined} comment={reportComment} loading={reportLoading} onClose={() => { setReportIdx(null); setReportComment(''); }} onCommentChange={setReportComment} onReport={reason => reportQuestion(reportIdx!, reason)} />
    </div>
  );
}
