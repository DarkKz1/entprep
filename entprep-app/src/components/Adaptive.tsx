import React, { useState, useEffect } from "react";
import { getRecommendations, calcTopicStats, calcSubtopicStats, getWrongQuestions, calcStreak } from '../utils/adaptiveHelpers';
import { supabase } from '../config/supabase';
import { usePlan as usePlanLimit, canGeneratePlan } from '../utils/aiLimits';
import { CARD_COMPACT, CARD_HERO, TYPE, COLORS, scoreColor } from '../constants/styles';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useNav } from '../contexts/NavigationContext';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useT } from '../locales';
import EmptyState from './ui/EmptyState';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, AlertTriangle, FileText, XCircle, Sparkles, Calendar, BookOpen, Lightbulb, ClipboardList, RefreshCw, Lock, Loader } from 'lucide-react';
import type { TopicStats } from '../types';

interface PlanTask {
  type: string;
  text: string;
  subject?: string;
  topic?: string | null;
}

interface PlanDay {
  day: number;
  title: string;
  tasks: PlanTask[];
}

interface Plan {
  summary: string;
  days: PlanDay[];
}

interface SubjectAnalysis {
  id: string;
  name: string;
  icon: string;
  color: string;
  avg: number;
  score: number;
  trend: string;
  count: number;
  message: string;
}

const PLAN_KEY = "entprep_plan";
const PLAN_MAX_AGE = 3 * 24 * 60 * 60 * 1000;

function loadCachedPlan(): { date: string; data: Plan } | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { date?: string; data?: Plan };
    if (!cached.date || !cached.data) return null;
    if (Date.now() - new Date(cached.date).getTime() > PLAN_MAX_AGE) return null;
    return cached as { date: string; data: Plan };
  } catch { return null; }
}

function savePlanCache(data: Plan): void {
  localStorage.setItem(PLAN_KEY, JSON.stringify({ date: new Date().toISOString(), data }));
}

export default function Adaptive() {
  const { nav, openPaywall } = useNav();
  const { hist, prof, st } = useApp();
  const { user, isPremium } = useAuth();
  const toast = useToast();
  const bp = useBreakpoint();
  const t = useT();
  const isDesktop = bp === 'desktop';
  const { weak, strong, overall, totalTests } = getRecommendations(hist, prof);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [topicCache, setTopicCache] = useState<Record<string, TopicStats[]>>({});
  const [expandedSection, setExpandedSection] = useState<Record<string, boolean>>({});
  const [subtopicCache, setSubtopicCache] = useState<Record<string, TopicStats[]>>({});
  const wrongCount = getWrongQuestions(hist, 1).length;
  const hasQd = hist.some(t => t.qd);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [planDate, setPlanDate] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [openDay, setOpenDay] = useState<number | null>(null);

  useEffect(() => {
    const cached = loadCachedPlan();
    if (cached) { setPlan(cached.data); setPlanDate(cached.date); }
  }, []);

  const generatePlan = async () => {
    if (!user || !supabase) return;
    if (!canGeneratePlan()) { toast.warning(t.adaptive.planAlreadyGenerated); return; }
    setPlanLoading(true);
    setPlanError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setPlanError(t.adaptive.sessionExpired); toast.warning(t.adaptive.sessionExpiredShort); setPlanLoading(false); return; }
      const weakWithTopics = weak.map(s => {
        const ts = calcTopicStats(s.id, hist);
        return { name: s.name, avg: s.avg, trend: s.trend, topics: ts ? ts.filter(t => t.pct >= 0).map(t => ({ name: t.name, pct: t.pct })) : [] };
      });
      const strongData = strong.map(s => ({ name: s.name, avg: s.avg }));
      const { current: streak } = calcStreak(hist);
      const res = await fetch("/api/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ weak: weakWithTopics, strong: strongData, overall, totalTests, streak, lang: st.lang }),
      });
      const json = await res.json();
      if (!res.ok) { setPlanError(json.error || t.adaptive.planError); toast.error(t.adaptive.planError, { action: generatePlan, actionLabel: 'Повторить' }); setPlanLoading(false); return; }
      usePlanLimit(); // consume limit only on success
      setPlan(json);
      setPlanDate(new Date().toISOString());
      savePlanCache(json);
      setOpenDay(0);
    } catch { setPlanError(t.adaptive.networkError); toast.error(t.adaptive.networkErrorShort, { action: generatePlan, actionLabel: 'Повторить' }); }
    setPlanLoading(false);
  };

  const planAge = planDate ? Date.now() - new Date(planDate).getTime() : null;
  const planIsOld = planAge != null && planAge > PLAN_MAX_AGE;

  const toggle = (id: string) => {
    if (!expanded[id] && !topicCache[id]) {
      const stats = calcTopicStats(id, hist);
      if (stats) setTopicCache(p => ({ ...p, [id]: stats }));
    }
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "improving") return <TrendingUp size={13} color={COLORS.green} />;
    if (trend === "declining") return <TrendingDown size={13} color={COLORS.red} />;
    return <Minus size={13} color="var(--text-secondary)" />;
  };
  const trendLabel = (trend: string) => trend === "improving" ? t.adaptive.improving : trend === "declining" ? t.adaptive.declining : trend === "none" ? "" : "стабильно";
  const stripColor = (score: number) => score > 60 ? COLORS.red : score > 40 ? COLORS.yellow : COLORS.green;

  const taskIcon = (type: string) => {
    if (type === "test") return <ClipboardList size={14} color={COLORS.teal} />;
    if (type === "review") return <BookOpen size={14} color={COLORS.cyan} />;
    return <Lightbulb size={14} color={COLORS.yellow} />;
  };

  const toggleSection = (subjectId: string, sectionId: string) => {
    const key = `${subjectId}:${sectionId}`;
    if (!expandedSection[key] && !subtopicCache[key]) {
      const stats = calcSubtopicStats(subjectId, sectionId, hist);
      if (stats) setSubtopicCache(p => ({ ...p, [key]: stats }));
      else return; // no subtopics to show
    }
    setExpandedSection(p => ({ ...p, [key]: !p[key] }));
  };

  const renderTopics = (subjectId: string) => {
    const stats = topicCache[subjectId];
    if (!stats) return null;
    return (
      <div style={{ paddingLeft: 50, paddingTop: 6, paddingBottom: 6 }}>
        {stats.map(t => {
          const key = `${subjectId}:${t.id}`;
          const hasSubtopics = calcSubtopicStats(subjectId, t.id, hist) !== null;
          const isSectionOpen = expandedSection[key];
          const stStats = subtopicCache[key];
          return (
            <div key={t.id}>
              <div
                style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7, cursor: hasSubtopics ? "pointer" : "default" }}
                onClick={() => hasSubtopics && toggleSection(subjectId, t.id)}
              >
                <span style={{ fontSize: 15, width: 22, textAlign: "center", flexShrink: 0 }}>{t.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: "var(--text-body)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: t.pct < 0 ? "var(--text-muted)" : scoreColor(t.pct), flexShrink: 0, marginLeft: 6 }}>
                      {t.pct < 0 ? "\u2014" : t.pct + "%"}
                    </span>
                  </div>
                  <div style={{ height: 3, background: "var(--bg-subtle-2)", borderRadius: 2 }}>
                    {t.pct >= 0 && <div style={{ height: "100%", width: t.pct + "%", background: scoreColor(t.pct), borderRadius: 2, transition: "width 0.3s" }} />}
                  </div>
                </div>
                {t.weak && <AlertTriangle size={12} color={COLORS.red} style={{ flexShrink: 0 }} />}
                {hasSubtopics && (
                  <ChevronDown size={12} color="var(--text-muted)" style={{ flexShrink: 0, transition: "transform 0.2s", transform: isSectionOpen ? "rotate(180deg)" : "rotate(0)" }} />
                )}
              </div>
              {isSectionOpen && stStats && (
                <div style={{ paddingLeft: 30, paddingBottom: 4 }}>
                  {stStats.map(st => (
                    <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                      <div style={{ width: 4, height: 4, borderRadius: 2, background: "var(--text-muted)", flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{st.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: st.pct < 0 ? "var(--text-muted)" : scoreColor(st.pct), flexShrink: 0, marginLeft: 4 }}>
                            {st.pct < 0 ? "\u2014" : st.pct + "%"}
                          </span>
                        </div>
                        <div style={{ height: 2, background: "var(--bg-subtle-2)", borderRadius: 1 }}>
                          {st.pct >= 0 && <div style={{ height: "100%", width: st.pct + "%", background: scoreColor(st.pct), borderRadius: 1, transition: "width 0.3s" }} />}
                        </div>
                      </div>
                      {st.weak && <AlertTriangle size={10} color={COLORS.red} style={{ flexShrink: 0 }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const SubjectCard = ({ s, showExpand }: { s: SubjectAnalysis; showExpand: boolean }) => {
    const canExpand = showExpand && s.id !== "reading";
    const isOpen = expanded[s.id];
    const subjectName = (t.subjects as Record<string, string>)[s.id] || s.name;
    return (
      <div key={s.id} style={{ ...CARD_COMPACT, borderLeft: `4px solid ${stripColor(s.score)}`, padding: "16px 14px", animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10, cursor: canExpand ? "pointer" : "default" }} onClick={() => canExpand && toggle(s.id)}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: s.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
          <div style={{ marginLeft: 11, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{subjectName}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
              {s.count > 0 ? (
                <>
                  <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: scoreColor(s.avg) }}>{s.avg}%</span>
                  <span>{t.adaptive.avg}</span>
                  {s.trend !== "none" && <><TrendIcon trend={s.trend} /><span style={{ color: s.trend === "improving" ? COLORS.green : s.trend === "declining" ? COLORS.red : "var(--text-secondary)" }}>{trendLabel(s.trend)}</span></>}
                </>
              ) : (
                <span style={{ color: "var(--text-muted)" }}>{t.adaptive.noDataShort}</span>
              )}
            </div>
          </div>
          {canExpand && (
            <ChevronDown size={16} color="var(--text-muted)" style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)", flexShrink: 0, marginLeft: 6 }} />
          )}
        </div>
        {canExpand && isOpen && renderTopics(s.id)}
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10, paddingLeft: 50 }}>{s.message}</div>
        <button
          onClick={() => nav("test", s.id)}
          style={{ marginLeft: 50, background: s.color + "18", border: `1px solid ${s.color}33`, borderRadius: 10, padding: "9px 18px", color: s.color, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 5 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = s.color + "28"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = s.color + "18"; }}
        >
          {t.adaptive.startTest} <ChevronRight size={14} />
        </button>
      </div>
    );
  };

  const renderPlanSection = () => {
    if (totalTests === 0) return null;
    if (!user) {
      return (
        <div style={{ ...CARD_COMPACT, border: "1px solid var(--border-md)", padding: "18px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "var(--bg-subtle-2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Lock size={20} color="var(--text-muted)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{t.adaptive.aiPlan}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.adaptive.aiPlanLogin}</div>
          </div>
        </div>
      );
    }
    if (plan && !planIsOld) {
      return (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} color={COLORS.cyan} />
              <h2 style={{ ...TYPE.h3, margin: 0 }}>{t.adaptive.aiPlan7Days}</h2>
            </div>
            <button onClick={generatePlan} disabled={planLoading} style={{ background: "none", border: "1px solid rgba(26,154,140,0.2)", borderRadius: 8, padding: "5px 10px", color: COLORS.cyan, fontSize: 11, cursor: planLoading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <RefreshCw size={12} /> {t.adaptive.refresh}
            </button>
          </div>
          <div style={{ ...CARD_COMPACT, background: "var(--bg-elevated)", border: "1px solid rgba(26,154,140,0.18)", padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.5 }}>{plan.summary}</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
            {(plan.days || []).map((d, i) => (
              <button key={i} onClick={() => setOpenDay(openDay === i ? null : i)} style={{ background: openDay === i ? "rgba(26,154,140,0.18)" : "var(--bg-subtle)", border: openDay === i ? "1px solid rgba(26,154,140,0.35)" : "1px solid var(--border)", borderRadius: 10, padding: "8px 14px", color: openDay === i ? COLORS.cyan : "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}>
                <Calendar size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                {(t.progress.dayNames as string[])[i] || `${t.adaptive.dayN} ${d.day}`}
              </button>
            ))}
          </div>
          {openDay !== null && plan.days[openDay] && (
            <div style={{ ...CARD_COMPACT, border: "1px solid rgba(26,154,140,0.12)", padding: "14px 14px", animation: "slideUp 0.3s ease" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{plan.days[openDay].title}</div>
              {(plan.days[openDay].tasks || []).map((task, ti) => (
                <div key={ti} onClick={() => { if (task.type === "test" && task.subject) nav("test", task.subject, task.topic || null); }} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: task.type === "test" ? "rgba(26,154,140,0.06)" : task.type === "review" ? "rgba(26,154,140,0.06)" : "rgba(234,179,8,0.06)", border: `1px solid ${task.type === "test" ? "rgba(26,154,140,0.12)" : task.type === "review" ? "rgba(26,154,140,0.12)" : "rgba(234,179,8,0.12)"}`, cursor: task.type === "test" ? "pointer" : "default", transition: "all 0.2s" }} onMouseEnter={e => { if (task.type === "test") (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,154,140,0.3)"; }} onMouseLeave={e => { if (task.type === "test") (e.currentTarget as HTMLElement).style.borderColor = "rgba(26,154,140,0.12)"; }}>
                  <div style={{ marginTop: 2, flexShrink: 0 }}>{taskIcon(task.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--text-body)", lineHeight: 1.4 }}>{task.text}</div>
                    {task.type === "test" && (
                      <div style={{ fontSize: 11, color: COLORS.teal, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        {t.adaptive.startTest} <ChevronRight size={12} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }
    return (
      <div style={{ ...CARD_COMPACT, background: "var(--bg-elevated)", border: "1px solid rgba(26,154,140,0.18)", padding: "20px 16px", marginBottom: 28, textAlign: "center" }}>
        <Sparkles size={28} color={COLORS.cyan} style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
          {planIsOld ? t.adaptive.planOutdated : t.adaptive.aiPlan}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
          {planIsOld ? t.adaptive.planOutdatedDesc : t.adaptive.planDesc}
        </div>
        {planError && <div style={{ fontSize: 12, color: COLORS.red, marginBottom: 10 }}>{planError}</div>}
        <button onClick={generatePlan} disabled={planLoading} style={{ background: planLoading ? "rgba(26,154,140,0.15)" : `linear-gradient(135deg,${COLORS.teal},${COLORS.tealDark})`, border: "none", borderRadius: 12, padding: "12px 24px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: planLoading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
          {planLoading ? <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> {t.adaptive.generating}</> : <><Sparkles size={16} /> {planIsOld ? t.adaptive.refreshPlan : t.adaptive.createPlan}</>}
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
      <div style={{ ...CARD_HERO, marginBottom: 28 }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,107,53,0.12)", filter: "blur(25px)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={TYPE.label}>{t.adaptive.title}</div>
          <h1 style={{ ...TYPE.h1, fontSize: 22, margin: "6px 0 10px" }}>{t.adaptive.subtitle}</h1>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: totalTests > 0 ? COLORS.accent : "var(--text-muted)", fontFamily: "'Unbounded',sans-serif" }}>{totalTests > 0 ? overall + "%" : "\u2014"}</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{t.adaptive.avgScore}</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.teal, fontFamily: "'Unbounded',sans-serif" }}>{totalTests}</div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>{t.adaptive.testsLabel}</div>
            </div>
          </div>
        </div>
      </div>

      {renderPlanSection()}

      {hasQd && (
        <div onClick={() => nav("errors")} style={{ ...CARD_COMPACT, border: "1px solid rgba(239,68,68,0.18)", padding: "16px 16px", marginBottom: 28, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.35)"; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(239,68,68,0.18)"; }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <XCircle size={22} color={COLORS.red} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{t.adaptive.errorReview}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {wrongCount > 0 ? `${wrongCount} ${wrongCount === 1 ? t.adaptive.error1 : wrongCount < 5 ? t.adaptive.error2 : t.adaptive.error5} ${t.adaptive.errorsForReview}` : t.adaptive.reviewErrors}
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-muted)" />
        </div>
      )}

      {weak.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 1.2, margin: "0 0 10px" }}>{t.adaptive.needsAttention}</div>
          <div style={{ display: "grid", gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
            {weak.map(s => <SubjectCard key={s.id} s={s} showExpand={hasQd} />)}
          </div>
        </>
      )}

      {strong.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" as const, letterSpacing: 1.2, margin: "28px 0 10px" }}>{t.adaptive.strengths}</div>
          <div style={{ display: "grid", gridTemplateColumns: bp === 'mobile' ? '1fr' : 'repeat(2, 1fr)', gap: 8 }}>
          {strong.map(s => (
            <div key={s.id} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", borderLeft: `4px solid ${COLORS.green}`, padding: "14px 14px", animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ fontSize: 18, marginRight: 11 }}>{s.icon}</div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{(t.subjects as Record<string, string>)[s.id] || s.name}</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: COLORS.green }}>{s.avg}%</div>
              {s.trend !== "none" && <span style={{ marginLeft: 6 }}><TrendIcon trend={s.trend} /></span>}
            </div>
          ))}
          </div>
        </>
      )}

      {totalTests === 0 && (
        <EmptyState
          icon={FileText}
          title={t.adaptive.noData}
          description={t.adaptive.noDataDesc}
          style={{ background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.15)", marginTop: 10 }}
          action={
            <button onClick={() => nav("home")} style={{ marginTop: 16, background: COLORS.accent, border: "none", borderRadius: 10, padding: "11px 22px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
              {t.adaptive.toSubjects} <ChevronRight size={14} />
            </button>
          }
        />
      )}
    </div>
  );
}
