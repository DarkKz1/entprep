import React, { useState, useEffect } from "react";
import { getRecommendations, calcTopicStats, getWrongQuestions, calcStreak } from '../utils/adaptiveHelpers.js';
import { supabase } from '../config/supabase.js';
import { CARD_COMPACT, CARD_HERO, TYPE } from '../constants/styles.js';
import { useNav } from '../contexts/NavigationContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import EmptyState from './ui/EmptyState.jsx';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, AlertTriangle, FileText, XCircle, Sparkles, Calendar, BookOpen, Lightbulb, ClipboardList, RefreshCw, Lock, Loader } from 'lucide-react';

const PLAN_KEY = "entprep_plan";
const PLAN_MAX_AGE = 3 * 24 * 60 * 60 * 1000;

function loadCachedPlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached.date || !cached.data) return null;
    if (Date.now() - new Date(cached.date).getTime() > PLAN_MAX_AGE) return null;
    return cached;
  } catch { return null; }
}

function savePlanCache(data) {
  localStorage.setItem(PLAN_KEY, JSON.stringify({ date: new Date().toISOString(), data }));
}

const DAY_NAMES = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function Adaptive() {
  const { nav } = useNav();
  const { hist, prof } = useApp();
  const { user } = useAuth();
  const { weak, strong, overall, totalTests } = getRecommendations(hist, prof);
  const [expanded, setExpanded] = useState({});
  const [topicCache, setTopicCache] = useState({});
  const wrongCount = getWrongQuestions(hist, 1).length;
  const hasQd = hist.some(t => t.qd);

  const [plan, setPlan] = useState(null);
  const [planDate, setPlanDate] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [openDay, setOpenDay] = useState(null);

  useEffect(() => {
    const cached = loadCachedPlan();
    if (cached) { setPlan(cached.data); setPlanDate(cached.date); }
  }, []);

  const generatePlan = async () => {
    if (!user || !supabase) return;
    setPlanLoading(true);
    setPlanError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setPlanError("Сессия истекла. Перезайдите в аккаунт."); setPlanLoading(false); return; }
      const weakWithTopics = weak.map(s => {
        const ts = calcTopicStats(s.id, hist);
        return { name: s.name, avg: s.avg, trend: s.trend, topics: ts ? ts.filter(t => t.pct >= 0).map(t => ({ name: t.name, pct: t.pct })) : [] };
      });
      const strongData = strong.map(s => ({ name: s.name, avg: s.avg }));
      const { current: streak } = calcStreak(hist);
      const res = await fetch("/api/ai-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ weak: weakWithTopics, strong: strongData, overall, totalTests, streak }),
      });
      const json = await res.json();
      if (!res.ok) { setPlanError(json.error || "Ошибка генерации плана"); setPlanLoading(false); return; }
      setPlan(json);
      setPlanDate(new Date().toISOString());
      savePlanCache(json);
      setOpenDay(0);
    } catch { setPlanError("Сетевая ошибка. Проверьте подключение."); }
    setPlanLoading(false);
  };

  const planAge = planDate ? Date.now() - new Date(planDate).getTime() : null;
  const planIsOld = planAge && planAge > PLAN_MAX_AGE;

  const toggle = (id) => {
    if (!expanded[id] && !topicCache[id]) {
      const stats = calcTopicStats(id, hist);
      if (stats) setTopicCache(p => ({ ...p, [id]: stats }));
    }
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  };

  const TrendIcon = ({ trend }) => {
    if (trend === "improving") return <TrendingUp size={13} color="#22c55e" />;
    if (trend === "declining") return <TrendingDown size={13} color="#ef4444" />;
    return <Minus size={13} color="#94a3b8" />;
  };
  const trendLabel = (trend) => trend === "improving" ? "растёт" : trend === "declining" ? "падает" : trend === "none" ? "" : "стабильно";
  const stripColor = (score) => score > 60 ? "#ef4444" : score > 40 ? "#eab308" : "#22c55e";

  const taskIcon = (type) => {
    if (type === "test") return <ClipboardList size={14} color="#0EA5E9" />;
    if (type === "review") return <BookOpen size={14} color="#a78bfa" />;
    return <Lightbulb size={14} color="#eab308" />;
  };

  const renderTopics = (subjectId) => {
    const stats = topicCache[subjectId];
    if (!stats) return null;
    return (
      <div style={{ paddingLeft: 50, paddingTop: 6, paddingBottom: 6 }}>
        {stats.map(t => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 15, width: 22, textAlign: "center", flexShrink: 0 }}>{t.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: t.pct < 0 ? "#64748b" : t.pct >= 70 ? "#22c55e" : t.pct >= 50 ? "#eab308" : "#ef4444", flexShrink: 0, marginLeft: 6 }}>
                  {t.pct < 0 ? "\u2014" : t.pct + "%"}
                </span>
              </div>
              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2 }}>
                {t.pct >= 0 && <div style={{ height: "100%", width: t.pct + "%", background: t.pct >= 70 ? "#22c55e" : t.pct >= 50 ? "#eab308" : "#ef4444", borderRadius: 2, transition: "width 0.3s" }} />}
              </div>
            </div>
            {t.weak && <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    );
  };

  const SubjectCard = ({ s, showExpand }) => {
    const canExpand = showExpand && s.id !== "reading";
    const isOpen = expanded[s.id];
    return (
      <div key={s.id} style={{ ...CARD_COMPACT, borderLeft: `4px solid ${stripColor(s.score)}`, padding: "16px 14px", marginBottom: 10, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10, cursor: canExpand ? "pointer" : "default" }} onClick={() => canExpand && toggle(s.id)}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: s.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
          <div style={{ marginLeft: 11, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 4 }}>
              {s.count > 0 ? (
                <>
                  <span style={{ fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: s.avg >= 70 ? "#22c55e" : s.avg >= 50 ? "#eab308" : "#ef4444" }}>{s.avg}%</span>
                  <span>средний</span>
                  {s.trend !== "none" && <><TrendIcon trend={s.trend} /><span style={{ color: s.trend === "improving" ? "#22c55e" : s.trend === "declining" ? "#ef4444" : "#94a3b8" }}>{trendLabel(s.trend)}</span></>}
                </>
              ) : (
                <span style={{ color: "#64748b" }}>Нет данных</span>
              )}
            </div>
          </div>
          {canExpand && (
            <ChevronDown size={16} color="#64748b" style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)", flexShrink: 0, marginLeft: 6 }} />
          )}
        </div>
        {canExpand && isOpen && renderTopics(s.id)}
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10, paddingLeft: 50 }}>{s.message}</div>
        <button
          onClick={() => nav("test", s.id)}
          style={{ marginLeft: 50, background: s.color + "18", border: `1px solid ${s.color}33`, borderRadius: 10, padding: "9px 18px", color: s.color, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 5 }}
          onMouseEnter={e => { e.currentTarget.style.background = s.color + "28"; }}
          onMouseLeave={e => { e.currentTarget.style.background = s.color + "18"; }}
        >
          Начать тест <ChevronRight size={14} />
        </button>
      </div>
    );
  };

  const renderPlanSection = () => {
    if (totalTests === 0) return null;
    if (!user) {
      return (
        <div style={{ ...CARD_COMPACT, background: "linear-gradient(135deg,rgba(30,30,50,0.6),rgba(26,32,42,0.6))", border: "1px solid rgba(148,163,184,0.12)", padding: "18px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(148,163,184,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Lock size={20} color="#64748b" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>AI-план подготовки</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>Войдите в аккаунт для персонального плана</div>
          </div>
        </div>
      );
    }
    if (plan && !planIsOld) {
      return (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} color="#a78bfa" />
              <h2 style={{ ...TYPE.h3, margin: 0 }}>AI-план на 7 дней</h2>
            </div>
            <button onClick={generatePlan} disabled={planLoading} style={{ background: "none", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 8, padding: "5px 10px", color: "#a78bfa", fontSize: 11, cursor: planLoading ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              <RefreshCw size={12} /> Обновить
            </button>
          </div>
          <div style={{ ...CARD_COMPACT, background: "linear-gradient(135deg,rgba(30,25,50,0.7),rgba(42,26,42,0.5))", border: "1px solid rgba(167,139,250,0.15)", padding: "14px 16px", marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.5 }}>{plan.summary}</div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
            {(plan.days || []).map((d, i) => (
              <button key={i} onClick={() => setOpenDay(openDay === i ? null : i)} style={{ background: openDay === i ? "rgba(167,139,250,0.18)" : "rgba(255,255,255,0.04)", border: openDay === i ? "1px solid rgba(167,139,250,0.35)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 14px", color: openDay === i ? "#a78bfa" : "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}>
                <Calendar size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
                {DAY_NAMES[i] || `День ${d.day}`}
              </button>
            ))}
          </div>
          {openDay !== null && plan.days[openDay] && (
            <div style={{ ...CARD_COMPACT, border: "1px solid rgba(167,139,250,0.12)", padding: "14px 14px", animation: "slideUp 0.3s ease" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 12 }}>{plan.days[openDay].title}</div>
              {(plan.days[openDay].tasks || []).map((task, ti) => (
                <div key={ti} onClick={() => { if (task.type === "test" && task.subject) nav("test", task.subject, task.topic || null); }} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", marginBottom: 6, borderRadius: 10, background: task.type === "test" ? "rgba(14,165,233,0.06)" : task.type === "review" ? "rgba(167,139,250,0.06)" : "rgba(234,179,8,0.06)", border: `1px solid ${task.type === "test" ? "rgba(14,165,233,0.12)" : task.type === "review" ? "rgba(167,139,250,0.12)" : "rgba(234,179,8,0.12)"}`, cursor: task.type === "test" ? "pointer" : "default", transition: "all 0.2s" }} onMouseEnter={e => { if (task.type === "test") e.currentTarget.style.borderColor = "rgba(14,165,233,0.3)"; }} onMouseLeave={e => { if (task.type === "test") e.currentTarget.style.borderColor = "rgba(14,165,233,0.12)"; }}>
                  <div style={{ marginTop: 2, flexShrink: 0 }}>{taskIcon(task.type)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.4 }}>{task.text}</div>
                    {task.type === "test" && (
                      <div style={{ fontSize: 11, color: "#0EA5E9", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        Начать тест <ChevronRight size={12} />
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
      <div style={{ ...CARD_COMPACT, background: "linear-gradient(135deg,rgba(30,25,50,0.7),rgba(42,26,42,0.5))", border: "1px solid rgba(167,139,250,0.18)", padding: "20px 16px", marginBottom: 18, textAlign: "center" }}>
        <Sparkles size={28} color="#a78bfa" style={{ marginBottom: 10 }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
          {planIsOld ? "План устарел" : "AI-план подготовки"}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14, lineHeight: 1.5 }}>
          {planIsOld ? "Прошло больше 3 дней. Обнови план на основе новых результатов" : "Получи персональный 7-дневный план на основе своих результатов"}
        </div>
        {planError && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 10 }}>{planError}</div>}
        <button onClick={generatePlan} disabled={planLoading} style={{ background: planLoading ? "rgba(167,139,250,0.15)" : "linear-gradient(135deg,#a78bfa,#7c3aed)", border: "none", borderRadius: 12, padding: "12px 24px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: planLoading ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 8, transition: "all 0.2s" }}>
          {planLoading ? <><Loader size={16} style={{ animation: "spin 1s linear infinite" }} /> Генерирую план...</> : <><Sparkles size={16} /> {planIsOld ? "Обновить план" : "Составить план"}</>}
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: "0 20px 100px" }}>
      <div style={{ ...CARD_HERO, marginBottom: 18 }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,107,53,0.12)", filter: "blur(25px)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={TYPE.label}>АНАЛИЗ</div>
          <h1 style={{ ...TYPE.h1, fontSize: 22, margin: "6px 0 10px" }}>Умная подготовка</h1>
          <div style={{ display: "flex", gap: 20 }}>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: totalTests > 0 ? "#FF6B35" : "#64748b", fontFamily: "'Unbounded',sans-serif" }}>{totalTests > 0 ? overall + "%" : "\u2014"}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Средний балл</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#0EA5E9", fontFamily: "'Unbounded',sans-serif" }}>{totalTests}</div>
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Тестов</div>
            </div>
          </div>
        </div>
      </div>

      {renderPlanSection()}

      {hasQd && (
        <div onClick={() => nav("errors")} style={{ ...CARD_COMPACT, background: "linear-gradient(135deg,rgba(30,30,50,0.6),rgba(42,26,26,0.6))", border: "1px solid rgba(239,68,68,0.18)", padding: "16px 16px", marginBottom: 18, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(239,68,68,0.18)"; }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(239,68,68,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <XCircle size={22} color="#ef4444" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Работа над ошибками</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              {wrongCount > 0 ? `${wrongCount} ${wrongCount === 1 ? "ошибка" : wrongCount < 5 ? "ошибки" : "ошибок"} для повторения` : "Просмотри свои ошибки"}
            </div>
          </div>
          <ChevronRight size={18} color="#64748b" />
        </div>
      )}

      {weak.length > 0 && (
        <>
          <h2 style={{ ...TYPE.h3, margin: "0 0 12px" }}>Требует внимания</h2>
          {weak.map(s => <SubjectCard key={s.id} s={s} showExpand={hasQd} />)}
        </>
      )}

      {strong.length > 0 && (
        <>
          <h2 style={{ ...TYPE.h3, margin: "18px 0 12px" }}>Сильные стороны</h2>
          {strong.map(s => (
            <div key={s.id} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", borderLeft: "4px solid #22c55e", padding: "14px 14px", marginBottom: 8, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
              <div style={{ fontSize: 18, marginRight: 11 }}>{s.icon}</div>
              <div style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#fff" }}>{s.name}</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: "#22c55e" }}>{s.avg}%</div>
              {s.trend !== "none" && <span style={{ marginLeft: 6 }}><TrendIcon trend={s.trend} /></span>}
            </div>
          ))}
        </>
      )}

      {totalTests === 0 && (
        <EmptyState
          icon={FileText}
          title="Пока нет данных"
          description="Пройди несколько тестов, и здесь появятся персональные рекомендации"
          style={{ background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.15)", marginTop: 10 }}
          action={
            <button onClick={() => nav("home")} style={{ marginTop: 16, background: "#FF6B35", border: "none", borderRadius: 10, padding: "11px 22px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}>
              К предметам <ChevronRight size={14} />
            </button>
          }
        />
      )}
    </div>
  );
}
