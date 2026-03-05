import React, { useState, useMemo, useEffect } from "react";
import { SUBJECT_META } from '../config/subjects';
import Bar from './Bar';
import MiniChart from './ui/MiniChart';
import { CARD_COMPACT, TYPE, COLORS, scoreColor } from '../constants/styles';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useApp } from '../contexts/AppContext';
import { getScoreHistory, getPersonalBests } from '../utils/competitionHelpers';
import EmptyState from './ui/EmptyState';
import { BarChart3, GraduationCap, Calendar, FileText, Trophy, ArrowUpDown, Filter, Flame, Medal, Users, Zap, Snowflake, Target } from 'lucide-react';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { calcStreak } from '../utils/adaptiveHelpers';
import StatBadge from './ui/StatBadge';
import { calcTotalXP, getLevel, LEVELS } from '../utils/xpHelpers';
import ProgressBar from './ui/ProgressBar';
import { useT } from '../locales';
import Chip from './ui/Chip';
import type { TestResult } from '../types';

function ActivityHeatmap({ hist }: { hist: TestResult[] }) {
  const t = useT();
  const { st } = useApp();
  const locale = st.lang === 'kk' ? 'kk-KZ' : 'ru-RU';
  const counts: Record<string, number> = {};
  hist.forEach(h => { if (h.dt) counts[h.dt] = (counts[h.dt] || 0) + 1; });

  const today = new Date();
  const days: { date: Date; key: string; count: number }[] = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("ru-RU");
    days.push({ date: d, key, count: counts[key] || 0 });
  }

  const weeks: typeof days[] = [];
  let week: typeof days = [];
  days.forEach((d, i) => {
    if (i === 0) { const pad = d.date.getDay() === 0 ? 6 : d.date.getDay() - 1; for (let p = 0; p < pad; p++) week.push({ date: new Date(0), key: '', count: -1 }); }
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  });
  if (week.length > 0) weeks.push(week);

  const maxCount = Math.max(1, ...days.map(d => d.count));
  const getColor = (c: number) => {
    if (c <= 0) return "var(--bg-subtle)";
    const intensity = c / maxCount;
    if (intensity <= 0.25) return "rgba(34,197,94,0.2)";
    if (intensity <= 0.5) return "rgba(34,197,94,0.4)";
    if (intensity <= 0.75) return "rgba(34,197,94,0.6)";
    return "rgba(34,197,94,0.85)";
  };

  const totalActive = days.filter(d => d.count > 0).length;
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) { if (days[i].count > 0) streak++; else break; }

  const months: string[] = [];
  let lastMonth = -1;
  weeks.forEach(w => {
    const real = w.find(d => d.count >= 0);
    if (real) { const m = real.date.getMonth(); if (m !== lastMonth) { lastMonth = m; months.push(real.date.toLocaleDateString(locale, { month: "short" })); } else { months.push(""); } }
  });

  return (
    <div style={{ ...CARD_COMPACT, padding: "12px 14px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
          <Calendar size={15} />{t.progress.activity}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10, color: "var(--text-muted)" }}>
          {streak > 0 && <span style={{ display: "flex", alignItems: "center", gap: 3, color: COLORS.amber }}><Flame size={11} />{streak} {t.progress.streakDays}</span>}
          <span>{totalActive} {t.progress.activeDays}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, overflowX: "auto" }}>
        {weeks.map((w, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {wi < months.length && <div style={{ fontSize: 8, color: "var(--text-muted)", height: 10, overflow: "hidden" }}>{months[wi]}</div>}
            {w.map((d, di) => (
              <div key={di} title={d.count >= 0 ? `${d.key}: ${d.count} ${t.progress.testCount}` : ""} style={{ width: 10, height: 10, borderRadius: 2, background: d.count < 0 ? "transparent" : getColor(d.count) }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

interface Badge { id: string; icon: string; name: string; desc: string; earned: boolean; }

function computeBadges(hist: TestResult[], subjects: string[], badgeTexts: Record<string, { name: string; desc: string }>): Badge[] {
  const regular = hist.filter(t => t.type !== "fullent");
  const total = regular.length;
  const perfects = regular.filter(t => t.sc === 100).length;
  const fullents = hist.filter(t => t.type === "fullent").length;
  const uniqueSubs = new Set(regular.map(t => t.su));

  // Streak calculation (max consecutive days)
  const dates = [...new Set(hist.map(t => t.dt))].sort((a, b) => {
    const [ad, am, ay] = a.split('.').map(Number);
    const [bd, bm, by] = b.split('.').map(Number);
    return new Date(ay, am - 1, ad).getTime() - new Date(by, bm - 1, bd).getTime();
  });
  let maxStreak = 0, curStreak = 0;
  for (let i = 0; i < dates.length; i++) {
    if (i === 0) { curStreak = 1; }
    else {
      const [pd, pm, py] = dates[i - 1].split('.').map(Number);
      const [cd, cm, cy] = dates[i].split('.').map(Number);
      const diff = (new Date(cy, cm - 1, cd).getTime() - new Date(py, pm - 1, pd).getTime()) / 86400000;
      curStreak = diff === 1 ? curStreak + 1 : 1;
    }
    maxStreak = Math.max(maxStreak, curStreak);
  }

  // Speedrun: any test finished in under 2 minutes
  const hasSpeedrun = regular.some(t => t.tm != null && t.tm > 0 && t.tm < 120);

  // Comeback: scored 90%+ on a subject where you once scored <50%
  const hasComeback = (() => {
    const bySubject = new Map<string, number[]>();
    for (const t of regular) {
      if (!bySubject.has(t.su)) bySubject.set(t.su, []);
      bySubject.get(t.su)!.push(t.sc);
    }
    for (const scores of bySubject.values()) {
      let hadFail = false;
      for (const sc of scores) {
        if (sc < 50) hadFail = true;
        if (hadFail && sc >= 90) return true;
      }
    }
    return false;
  })();

  // Marathon: 10+ tests in one day
  const hasMarathon = (() => {
    const byDate = new Map<string, number>();
    for (const t of regular) {
      byDate.set(t.dt, (byDate.get(t.dt) ?? 0) + 1);
    }
    for (const count of byDate.values()) {
      if (count >= 10) return true;
    }
    return false;
  })();

  // Variety: 5+ different subjects in one day
  const hasVariety = (() => {
    const byDate = new Map<string, Set<string>>();
    for (const t of regular) {
      if (!byDate.has(t.dt)) byDate.set(t.dt, new Set());
      byDate.get(t.dt)!.add(t.su);
    }
    for (const subs of byDate.values()) {
      if (subs.size >= 5) return true;
    }
    return false;
  })();

  // XP milestone
  const totalXP = calcTotalXP(hist);

  // Full ENT 100+ points
  const hasFullent100 = hist.some(t => {
    if (t.type !== 'fullent' || !t.sections) return false;
    const sections = t.sections as unknown as Array<{ pts?: number }> | Record<string, { pts?: number }>;
    const vals = Array.isArray(sections) ? sections : Object.values(sections);
    return vals.reduce((s, r) => s + (r.pts ?? 0), 0) >= 100;
  });

  // Improver: avg of last 5 - avg of first 5 >= 20 on any subject
  const hasImprover = (() => {
    const bySubject = new Map<string, number[]>();
    for (const t of regular) {
      if (!bySubject.has(t.su)) bySubject.set(t.su, []);
      bySubject.get(t.su)!.push(t.sc);
    }
    for (const scores of bySubject.values()) {
      if (scores.length < 10) continue;
      const first5 = scores.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
      const last5 = scores.slice(-5).reduce((a, b) => a + b, 0) / 5;
      if (last5 - first5 >= 20) return true;
    }
    return false;
  })();

  // Triple: 3 consecutive perfect tests (non-fullent)
  const hasTriple = (() => {
    let run = 0;
    for (const t of regular) {
      run = t.sc === 100 ? run + 1 : 0;
      if (run >= 3) return true;
    }
    return false;
  })();

  const b = (id: string) => badgeTexts[id] || { name: id, desc: '' };

  return [
    // — Milestones —
    { id: "firstTest",   icon: "🎯", name: b('firstTest').name,   desc: b('firstTest').desc,   earned: total >= 1 },
    { id: "hundred",     icon: "💯", name: b('hundred').name,     desc: b('hundred').desc,     earned: total >= 100 },
    { id: "perfect",     icon: "⭐", name: b('perfect').name,     desc: b('perfect').desc,     earned: perfects >= 1 },
    { id: "fivePerfect", icon: "🌟", name: b('fivePerfect').name, desc: b('fivePerfect').desc, earned: perfects >= 5 },
    // — Consistency —
    { id: "weekStreak",  icon: "🔥", name: b('weekStreak').name,  desc: b('weekStreak').desc,  earned: maxStreak >= 7 },
    { id: "monthStreak", icon: "🏆", name: b('monthStreak').name, desc: b('monthStreak').desc, earned: maxStreak >= 30 },
    { id: "polyglot",    icon: "📚", name: b('polyglot').name,    desc: b('polyglot').desc,    earned: uniqueSubs.size >= subjects.length },
    { id: "trialEnt",    icon: "🏛️", name: b('trialEnt').name,   desc: b('trialEnt').desc,    earned: fullents >= 1 },
    // — Skill —
    { id: "speedrun",    icon: "🚀", name: b('speedrun').name,    desc: b('speedrun').desc,    earned: hasSpeedrun },
    { id: "comeback",    icon: "📈", name: b('comeback').name,    desc: b('comeback').desc,    earned: hasComeback },
    { id: "hatTrick",    icon: "💫", name: b('hatTrick').name,    desc: b('hatTrick').desc,    earned: hasTriple },
    { id: "grantee",     icon: "🎓", name: b('grantee').name,     desc: b('grantee').desc,     earned: hasFullent100 },
    // — Dedication —
    { id: "marathon",    icon: "🏃", name: b('marathon').name,    desc: b('marathon').desc,    earned: hasMarathon },
    { id: "variety",     icon: "🎨", name: b('variety').name,     desc: b('variety').desc,     earned: hasVariety },
    { id: "xp1000",      icon: "⚡", name: b('xp1000').name,      desc: b('xp1000').desc,      earned: totalXP >= 1000 },
    { id: "improver",    icon: "📊", name: b('improver').name,    desc: b('improver').desc,    earned: hasImprover },
  ];
}

function Badges({ hist, subjects }: { hist: TestResult[]; subjects: string[] }) {
  const t = useT();
  const badges = computeBadges(hist, subjects, t.badges as Record<string, { name: string; desc: string }>);
  const earned = badges.filter(b => b.earned).length;
  const [selected, setSelected] = useState<string | null>(null);
  const selBadge = selected ? badges.find(b => b.id === selected) : null;
  return (
    <div style={{ ...CARD_COMPACT, padding: "12px 14px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
          <Trophy size={15} color={COLORS.amber} />{t.progress.achievements}
        </div>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{earned}/{badges.length}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
        {badges.map(b => (
          <div key={b.id} onClick={() => setSelected(selected === b.id ? null : b.id)} style={{ textAlign: "center", padding: "8px 4px", borderRadius: 8, background: selected === b.id ? (b.earned ? "rgba(245,158,11,0.15)" : "rgba(100,100,100,0.1)") : b.earned ? "rgba(245,158,11,0.06)" : "var(--bg-subtle)", border: selected === b.id ? (b.earned ? "1.5px solid rgba(245,158,11,0.4)" : "1.5px solid var(--border)") : b.earned ? "1px solid rgba(245,158,11,0.15)" : "1px solid transparent", opacity: b.earned ? 1 : 0.35, cursor: "pointer", transition: "all 0.15s" }}>
            <div style={{ fontSize: 20 }}>{b.icon}</div>
            <div style={{ fontSize: 8, color: b.earned ? "var(--text-secondary)" : "var(--text-muted)", marginTop: 2, lineHeight: 1.2 }}>{b.name}</div>
          </div>
        ))}
      </div>
      {selBadge && (
        <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: selBadge.earned ? "rgba(245,158,11,0.06)" : "var(--bg-subtle)", border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, animation: "fadeIn 0.2s ease" }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{selBadge.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{selBadge.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>{selBadge.desc}</div>
          </div>
          {selBadge.earned
            ? <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.green, background: "rgba(34,197,94,0.1)", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>{t.progress.earned}</span>
            : <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "2px 6px", borderRadius: 4, flexShrink: 0 }}>{t.progress.notEarned}</span>
          }
        </div>
      )}
    </div>
  );
}

function XPSection({ hist }: { hist: TestResult[] }) {
  const t = useT();
  const totalXP = calcTotalXP(hist);
  const lvl = getLevel(totalXP);
  const nextLvl = LEVELS[LEVELS.indexOf(lvl) + 1];
  return (
    <div style={{ ...CARD_COMPACT, padding: "14px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text)" }}>
          <Zap size={15} color={lvl.color} />{t.progress.levelLabel} {lvl.level}: {(t.levels as Record<number, string>)[lvl.level] || lvl.name}
        </div>
        <span style={{ fontSize: 11, color: lvl.color, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{totalXP} XP</span>
      </div>
      <ProgressBar value={lvl.progress * 100} max={100} gradient={`linear-gradient(90deg,${lvl.color},${lvl.color}88)`} height={6} />
      {lvl.level < 6 && nextLvl && (
        <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>
          {lvl.nextXP - totalXP} {t.progress.xpToNext} «{(t.levels as Record<number, string>)[nextLvl.level] || nextLvl.name}»
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, marginTop: 10 }}>
        {LEVELS.map(l => {
          const reached = totalXP >= l.minXP;
          return (
            <div key={l.level} style={{
              textAlign: "center", padding: "6px 2px", borderRadius: 8,
              background: reached ? `${l.color}15` : "var(--bg-subtle)",
              border: l.level === lvl.level ? `1.5px solid ${l.color}` : reached ? `1px solid ${l.color}30` : "1px solid transparent",
              opacity: reached ? 1 : 0.4,
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: l.color, fontFamily: "'Unbounded',sans-serif" }}>{l.level}</div>
              <div style={{ fontSize: 7, color: reached ? "var(--text-secondary)" : "var(--text-muted)", marginTop: 1, lineHeight: 1.2 }}>{(t.levels as Record<number, string>)[l.level] || l.name}</div>
              <div style={{ fontSize: 7, color: "var(--text-muted)", marginTop: 1 }}>{l.minXP}+</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LeaderEntry { user_name: string; score: number; subject: string; }

function Leaderboard({ subjects, names }: { subjects: string[]; names: Record<string, string> }) {
  const t = useT();
  const { user } = useAuth();
  const [sub, setSub] = useState(subjects[0] || "math");
  const [rows, setRows] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!supabase || unavailable) return;
    setLoading(true);
    supabase.from('leaderboard').select('user_name,score,subject').eq('subject', sub).order('score', { ascending: false }).limit(10)
      .then(({ data, error }) => {
        if (error) { setUnavailable(true); setLoading(false); return; }
        setRows((data || []) as LeaderEntry[]);
        setLoading(false);
      });
  }, [sub, unavailable]);

  if (unavailable || !supabase) return null;

  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ ...CARD_COMPACT, padding: "12px 14px", marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 8 }}>
        <Users size={15} color={COLORS.teal} />{t.progress.leaderboard}
      </div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {subjects.map(s => (
          <button key={s} onClick={() => setSub(s)} style={{ padding: "4px 8px", borderRadius: 12, fontSize: 9, fontWeight: 600, cursor: "pointer", background: sub === s ? "rgba(26,154,140,0.15)" : "var(--bg-subtle)", color: sub === s ? COLORS.teal : "var(--text-muted)", border: sub === s ? "1px solid rgba(26,154,140,0.3)" : "1px solid transparent" }}>
            {names[s]}
          </button>
        ))}
      </div>
      {loading ? <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", padding: 8 }}>{t.loading}</div>
        : rows.length === 0 ? <div style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", padding: 8 }}>{t.progress.noResults}</div>
        : rows.map((r, i) => {
          const isMe = user && r.user_name === (user.user_metadata?.full_name || user.email || '');
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--bg-subtle)" : "none", background: isMe ? "rgba(26,154,140,0.04)" : "transparent", borderRadius: isMe ? 6 : 0, paddingLeft: isMe ? 6 : 0, paddingRight: isMe ? 6 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, width: 20, textAlign: "center" }}>{i < 3 ? medals[i] : <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{i + 1}</span>}</span>
                <span style={{ fontSize: 11, color: isMe ? COLORS.teal : "var(--text-body)", fontWeight: isMe ? 600 : 400 }}>{r.user_name}{isMe && ` ${t.progress.youLabel}`}</span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: scoreColor(r.score) }}>{r.score}%</span>
            </div>
          );
        })
      }
    </div>
  );
}


function StatsOverview({ hist, bp }: { hist: TestResult[]; bp: string }) {
  const t = useT();
  const { isPremium } = useAuth();
  const { st } = useApp();
  const regular = hist.filter(h => h.type !== 'fullent');
  const tot = regular.length;
  const avg = tot ? Math.round(regular.reduce((s, h) => s + (h.sc || 0), 0) / tot) : 0;
  const best = tot ? Math.max(...regular.map(h => h.sc || 0)) : 0;
  const streak = calcStreak(hist, isPremium, st.streakFreezeUsedAt);
  const totalXP = calcTotalXP(hist);
  const lvl = getLevel(totalXP);
  const levelName = t.levels?.[lvl.level] || lvl.name;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: bp === 'mobile' ? 'repeat(3, 1fr)' : 'repeat(5, 1fr)', gap: 8, marginBottom: 28 }}>
      <StatBadge value={tot} label={t.progress.testsCount?.replace(/\s*$/, '') || 'Тестов'} color={COLORS.accent} />
      <StatBadge value={avg + '%'} label={t.home.avgLabel} color={COLORS.teal} />
      <StatBadge value={best + '%'} label={t.home.bestLabel} color={COLORS.green} />
      <StatBadge
        value={streak.current}
        label={streak.frozenToday ? t.home.frozen : t.home.streak}
        color={streak.frozenToday ? COLORS.blue : COLORS.amber}
        Icon={streak.frozenToday ? Snowflake : Flame}
      />
      <StatBadge value={lvl.level} label={levelName} color={lvl.color} Icon={Zap} />
    </div>
  );
}

export default function Progress() {
  const t = useT();
  const { hist, prof } = useApp();
  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';
  const [filterSub, setFilterSub] = useState("all");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const subjects = [...new Set(["math", "reading", "history", ...(prof || [])])];
  const subName = (id: string) => (t.subjects as Record<string, string>)[id] || SUBJECT_META[id as keyof typeof SUBJECT_META]?.name || id;
  const names: Record<string, string> = Object.fromEntries(Object.entries(SUBJECT_META).map(([k]) => [k, subName(k)]));
  const colors: Record<string, string> = Object.fromEntries(Object.entries(SUBJECT_META).map(([k, v]) => [k, v.color]));
  const bests = getPersonalBests(hist);

  const activeSubjects = useMemo(() => subjects.filter(s => hist.some(t => t.su === s)), [hist, subjects]);

  const filteredHist = useMemo(() => {
    let items = hist.filter(t => t.type !== "fullent");
    if (filterSub !== "all") items = items.filter(t => t.su === filterSub);
    if (sortBy === "score") items = [...items].sort((a, b) => (b.sc || 0) - (a.sc || 0));
    else items = [...items].reverse();
    return items;
  }, [hist, filterSub, sortBy]);

  return (<div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 24px" }}>
      <BarChart3 size={22} color={COLORS.teal} />
      <h2 style={{ ...TYPE.h2 }}>{t.progress.title}</h2>
    </div>
    {hist.length === 0 ? <EmptyState icon={FileText} description={t.progress.firstTestHint} />
      : <>
        <StatsOverview hist={hist} bp={bp} />
        <ActivityHeatmap hist={hist} />
        <XPSection hist={hist} />
        <Badges hist={hist} subjects={subjects} />
        <Leaderboard subjects={subjects} names={names} />
        <div style={{ display: "grid", gridTemplateColumns: bp === 'mobile' ? '1fr' : bp === 'tablet' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 8, marginBottom: 28 }}>
        {subjects.map(sid => {
          const tests = hist.filter(t => t.su === sid);
          if (tests.length === 0) return null;
          const scoreHist = getScoreHistory(hist, sid);
          const pb = bests[sid];
          return (<div key={sid} style={{ ...CARD_COMPACT, padding: "14px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors[sid], marginBottom: 8 }}>{names[sid]}</div>
            {scoreHist.length >= 2
              ? <MiniChart data={scoreHist} color={colors[sid]} />
              : <Bar data={tests.slice(-5).map((t, i) => ({ l: `#${tests.length - Math.min(tests.length, 5) + i + 1}`, v: t.sc }))} color={colors[sid]} mx={100} />
            }
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{t.progress.testsCount} {tests.length}</span>
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{t.progress.avgScore} {Math.round(tests.reduce((s, t) => s + t.sc, 0) / tests.length)}%</span>
              <span style={{ fontSize: 10, color: COLORS.green, display: "flex", alignItems: "center", gap: 2 }}>
                <Trophy size={10} />{pb ? pb.best : Math.max(...tests.map(t => t.sc))}%
              </span>
            </div>
          </div>);
        })}
        </div>
        {hist.filter(t => t.type === "fullent").length > 0 && <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 1.2, margin: "0 0 10px" }}>
            <GraduationCap size={13} />{t.progress.fullEnt}
          </div>
          {hist.filter(t => t.type === "fullent").slice(-3).reverse().map((t: TestResult, i: number) => {
            const fe = t as TestResult & { score?: number; sections?: Array<{ icon?: string; label: string; pts: number; maxPts: number; passed: boolean }> };
            return (
            <div key={`fe${i}`} style={{ ...CARD_COMPACT, padding: "12px 14px", marginBottom: 6, border: "1px solid rgba(26,154,140,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.dt}</span>
                <span style={{ fontSize: 17, fontWeight: 800, fontFamily: "'Unbounded',sans-serif", color: (fe.score || 0) >= 100 ? COLORS.green : (fe.score || 0) >= 70 ? COLORS.yellow : COLORS.red }}>{fe.score}/140</span>
              </div>
              {fe.sections && fe.sections.map((s, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 10 }}>
                  <span style={{ color: "var(--text-secondary)" }}>{s.icon || ""} {s.label}</span>
                  <span style={{ color: s.passed ? COLORS.green : COLORS.red, fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{s.pts}/{s.maxPts} {s.passed ? "\u2713" : "\u2717"}</span>
                </div>
              ))}
            </div>
          ); })}
        </>}
        <div style={{ ...CARD_COMPACT, padding: "14px", marginTop: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
            <Calendar size={15} />{t.progress.testHistory}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            <Chip active={filterSub === "all"} onClick={() => setFilterSub("all")} mode="subtle">
              <Filter size={10} style={{ verticalAlign: "-1px", marginRight: 3 }} />{t.progress.allFilter}
            </Chip>
            {activeSubjects.map(s => (
              <Chip key={s} active={filterSub === s} onClick={() => setFilterSub(s)} mode="subtle">
                {names[s]}
              </Chip>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            <Chip active={sortBy === "date"} onClick={() => setSortBy("date")} mode="subtle">
              <ArrowUpDown size={10} style={{ verticalAlign: "-1px", marginRight: 3 }} />{t.progress.byDate}
            </Chip>
            <Chip active={sortBy === "score"} onClick={() => setSortBy("score")} mode="subtle">
              <ArrowUpDown size={10} style={{ verticalAlign: "-1px", marginRight: 3 }} />{t.progress.byScore}
            </Chip>
          </div>
          {filteredHist.length === 0
            ? <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: "12px 0" }}>{t.progress.noResultsFound}</div>
            : filteredHist.slice(0, 20).map((t, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < Math.min(filteredHist.length, 20) - 1 ? "1px solid var(--bg-subtle)" : "none" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 11, color: "var(--text-body)" }}>{names[t.su] || t.su}</span>
                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{t.dt}{t.tp ? ` • ${t.tp}` : ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{t.co}/{t.to}</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: scoreColor(t.sc) }}>{t.sc}%</span>
              </div>
            </div>))
          }
        </div>
      </>}
  </div>);
}
