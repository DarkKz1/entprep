import React from "react";
import { SUBJECT_META } from '../config/subjects.js';
import Bar from './Bar.jsx';
import MiniChart from './ui/MiniChart.jsx';
import { CARD_COMPACT, TYPE } from '../constants/styles.js';
import { useApp } from '../contexts/AppContext.jsx';
import { getScoreHistory, getPersonalBests } from '../utils/competitionHelpers.js';
import EmptyState from './ui/EmptyState.jsx';
import { BarChart3, GraduationCap, Calendar, FileText, Trophy } from 'lucide-react';

export default function Progress() {
  const { hist, prof } = useApp();
  const subjects = [...new Set(["math", "reading", "history", ...(prof || [])])];
  const names = Object.fromEntries(Object.entries(SUBJECT_META).map(([k, v]) => [k, v.name]));
  const colors = Object.fromEntries(Object.entries(SUBJECT_META).map(([k, v]) => [k, v.color]));
  const bests = getPersonalBests(hist);
  return (<div style={{ padding: "0 20px 100px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 16px" }}>
      <BarChart3 size={22} color="#0EA5E9" />
      <h2 style={{ ...TYPE.h2 }}>Прогресс</h2>
    </div>
    {hist.length === 0 ? <EmptyState icon={FileText} description="Пройдите первый тест!" />
      : <>
        {subjects.map(sid => {
          const tests = hist.filter(t => t.su === sid);
          if (tests.length === 0) return null;
          const scoreHist = getScoreHistory(hist, sid);
          const pb = bests[sid];
          return (<div key={sid} style={{ ...CARD_COMPACT, padding: "14px", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: colors[sid], marginBottom: 8 }}>{names[sid]}</div>
            {scoreHist.length >= 2
              ? <MiniChart data={scoreHist} color={colors[sid]} />
              : <Bar data={tests.slice(-5).map((t, i) => ({ l: `#${tests.length - Math.min(tests.length, 5) + i + 1}`, v: t.sc }))} color={colors[sid]} mx={100} />
            }
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={{ fontSize: 10, color: "#64748b" }}>Тестов: {tests.length}</span>
              <span style={{ fontSize: 10, color: "#94a3b8" }}>Средний: {Math.round(tests.reduce((s, t) => s + t.sc, 0) / tests.length)}%</span>
              <span style={{ fontSize: 10, color: "#22c55e", display: "flex", alignItems: "center", gap: 2 }}>
                <Trophy size={10} />{pb ? pb.best : Math.max(...tests.map(t => t.sc))}%
              </span>
            </div>
          </div>);
        })}
        {hist.filter(t => t.type === "fullent").length > 0 && <>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#0EA5E9", margin: "12px 0 8px" }}>
            <GraduationCap size={16} />Полный ЕНТ
          </div>
          {hist.filter(t => t.type === "fullent").slice(-3).reverse().map((t, i) => (
            <div key={`fe${i}`} style={{ ...CARD_COMPACT, padding: "12px 14px", marginBottom: 6, border: "1px solid rgba(14,165,233,0.15)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>{t.dt}</span>
                <span style={{ fontSize: 17, fontWeight: 800, fontFamily: "'Unbounded',sans-serif", color: t.score >= 100 ? "#22c55e" : t.score >= 70 ? "#eab308" : "#ef4444" }}>{t.score}/140</span>
              </div>
              {t.sections && t.sections.map((s, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 10 }}>
                  <span style={{ color: "#94a3b8" }}>{s.icon || ""} {s.label}</span>
                  <span style={{ color: s.passed ? "#22c55e" : "#ef4444", fontFamily: "'JetBrains Mono',monospace", fontWeight: 600 }}>{s.pts}/{s.maxPts} {s.passed ? "\u2713" : "\u2717"}</span>
                </div>
              ))}
            </div>
          ))}
        </>}
        <div style={{ ...CARD_COMPACT, padding: "14px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
            <Calendar size={15} />Последние тесты
          </div>
          {hist.slice(-8).reverse().map((t, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < Math.min(hist.length, 8) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>{t.type === "fullent" ? "Полный ЕНТ" : (names[t.su] || t.su)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: t.type === "fullent" ? (t.score >= 100 ? "#22c55e" : "#eab308") : (t.sc >= 70 ? "#22c55e" : t.sc >= 50 ? "#eab308" : "#ef4444") }}>{t.type === "fullent" ? `${t.score}/140` : `${t.sc}%`}</span>
          </div>))}
        </div>
      </>}
  </div>);
}
