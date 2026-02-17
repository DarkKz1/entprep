import React from "react";
import { ALL_PROFILES, SUBS, TOTAL_Q } from '../config/questionPools.js';
import { UNIS } from '../data/universities.js';
import { getRecommendations, calcStreak } from '../utils/adaptiveHelpers.js';
import { getDailyChallenge, getPersonalBests, getStreakMotivation, getGoalProgress } from '../utils/competitionHelpers.js';
import { CARD_HERO, CARD_COMPACT, TYPE } from '../constants/styles.js';
import { useNav } from '../contexts/NavigationContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import StatBadge from './ui/StatBadge.jsx';
import ProgressBar from './ui/ProgressBar.jsx';
import { Lightbulb, ArrowRight, GraduationCap, Flame, ChevronRight, Calculator, Trophy, Zap, Check } from 'lucide-react';

export default function Home() {
  const { nav } = useNav();
  const { hist, prof, st } = useApp();
  const regular = hist.filter(t => t.type !== "fullent");
  const tot = regular.length;
  const avg = tot ? Math.round(regular.reduce((s, t) => s + (t.sc || 0), 0) / tot) : 0;
  const best = tot ? Math.max(...regular.map(t => t.sc || 0)) : 0;
  const streak = calcStreak(hist);
  const profSubs = prof.map(id => ALL_PROFILES.find(p => p.id === id)).filter(Boolean);
  const recs = getRecommendations(hist, prof);
  const topWeak = recs.weak.length > 0 && recs.weak[0].score > 60 ? recs.weak[0] : null;
  const daily = getDailyChallenge(hist, prof);
  const bests = getPersonalBests(hist);
  const streakText = getStreakMotivation(streak.current);
  const goalProg = getGoalProgress(hist, st.goal);

  const SubjectCard = ({ s }) => {
    const tests = hist.filter(t => t.su === s.id);
    const ls = tests.length ? tests[tests.length - 1].sc : null;
    const pb = bests[s.id];
    return (
      <button key={s.id} onClick={() => nav(s.id === "reading" ? "test" : "topics", s.id)} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", width: "100%", borderLeft: `3px solid ${s.color}`, padding: "15px 14px", marginBottom: 8, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 20px ${s.color}18`; e.currentTarget.style.borderColor = s.color + "44" }} onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: s.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{s.icon}</div>
        <div style={{ marginLeft: 12, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{s.name}</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.cnt} заданий • Порог: {SUBS[s.id] ? (s.id === "history" ? "5 б." : "3 б.") : "5 б."}</div>
          <div style={{ fontSize: 10, color: "#4a5568" }}>Банк: {s.pool} вопросов</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginRight: 6, gap: 2 }}>
          {ls !== null && <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: ls >= 70 ? "#22c55e" : ls >= 50 ? "#eab308" : "#ef4444" }}>{ls}%</div>}
          {pb && pb.best > (ls || 0) && <div style={{ fontSize: 9, color: "#f59e0b", fontWeight: 600, display: "flex", alignItems: "center", gap: 2 }}><Trophy size={10} />{pb.best}%</div>}
        </div>
        <ChevronRight size={18} color={s.color} />
      </button>
    );
  };

  return (
    <div style={{ padding: "0 20px 100px" }}>
      {/* A. Daily Challenge */}
      {daily && daily.sub && (
        <button onClick={() => { if (!daily.completed) nav("test", daily.subjectId); }} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", width: "100%", background: daily.completed ? "rgba(34,197,94,0.08)" : "linear-gradient(135deg,rgba(245,158,11,0.08),rgba(255,107,53,0.08))", border: `1px solid ${daily.completed ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`, padding: "14px 14px", marginBottom: 14, cursor: daily.completed ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: daily.completed ? "rgba(34,197,94,0.15)" : `${daily.sub.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
            {daily.completed ? <Check size={20} color="#22c55e" /> : <span>{daily.sub.icon}</span>}
          </div>
          <div style={{ marginLeft: 12, flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: daily.completed ? "#22c55e" : "#f59e0b", display: "flex", alignItems: "center", gap: 4 }}>
              <Zap size={12} />{daily.completed ? "Пройден!" : "Ежедневный вызов"}
            </div>
            <div style={{ fontSize: 12, color: "#fff", fontWeight: 500, marginTop: 2 }}>{daily.sub.name}</div>
            {daily.completed && daily.score != null && (
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
                {daily.score}%{daily.prevScore != null ? ` (вчера ${daily.prevScore}%)` : ""}
              </div>
            )}
          </div>
          {!daily.completed && <ArrowRight size={16} color="#f59e0b" />}
        </button>
      )}

      {topWeak && (
        <button onClick={() => nav("adaptive")} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", width: "100%", background: "rgba(255,107,53,0.08)", border: "1px solid rgba(255,107,53,0.2)", padding: "13px 14px", marginBottom: 14, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,107,53,0.14)" }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,107,53,0.08)" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,107,53,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Lightbulb size={18} color="#FF6B35" />
          </div>
          <span style={{ flex: 1, fontSize: 12, color: "#fff", marginLeft: 12 }}>Рекомендуем: <strong>{topWeak.name}</strong> ({topWeak.avg}%)</span>
          <ArrowRight size={16} color="#FF6B35" />
        </button>
      )}
      <div style={{ ...CARD_HERO, marginBottom: 18 }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,107,53,0.12)", filter: "blur(30px)" }} />
        <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(14,165,233,0.1)", filter: "blur(25px)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={TYPE.label}>ENT 2025</div>
          <h1 style={{ ...TYPE.h1, margin: "6px 0 8px" }}>Подготовка к ЕНТ</h1>
          <p style={{ ...TYPE.bodySmall, margin: 0 }}>{TOTAL_Q} вопросов • {UNIS.length} вузов • 4 часа</p>
          <p style={{ ...TYPE.caption, margin: "4px 0 0" }}>120 заданий • 5 предметов • Макс. 140 баллов • 2025/2026</p>
        </div>
      </div>
      {tot > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          <StatBadge value={tot} label="Тестов" color="#FF6B35" />
          <StatBadge value={avg + "%"} label="Средний" color="#0EA5E9" />
          <StatBadge value={best + "%"} label="Лучший" color="#22c55e" />
          {/* B. Enhanced streak */}
          <StatBadge
            value={streak.current}
            label={streak.current >= 3 ? streakText.slice(0, 25) : "Серия"}
            color="#f59e0b"
            Icon={Flame}
            style={streak.current >= 3 ? { animation: "firePulse 2s ease-in-out infinite" } : undefined}
          />
        </div>
      )}
      {/* Show best streak if different */}
      {tot > 0 && streak.best > streak.current && streak.best > 1 && (
        <div style={{ textAlign: "center", fontSize: 10, color: "#64748b", marginBottom: 8 }}>
          Лучшая серия: {streak.best} дн.
        </div>
      )}
      {/* C. Goal progress */}
      {goalProg && (
        <div style={{ ...CARD_COMPACT, padding: "12px 14px", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, color: "#fff" }}>
              <Trophy size={13} color="#f59e0b" />Цель ЕНТ
            </div>
            <span style={{ fontSize: 10, color: goalProg.onTrack ? "#22c55e" : "#eab308", fontWeight: 600 }}>
              {goalProg.daysLeft > 0 ? `${goalProg.daysLeft} дн.` : "Сегодня!"}
            </span>
          </div>
          <ProgressBar value={goalProg.pct} max={100} gradient={goalProg.onTrack ? "linear-gradient(90deg,#22c55e,#10B981)" : "linear-gradient(90deg,#eab308,#f59e0b)"} height={5} />
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>~{goalProg.approxScore}/{goalProg.target} баллов</div>
        </div>
      )}
      {!goalProg && tot > 0 && <div style={{ marginBottom: 18 }} />}
      <h2 style={{ ...TYPE.h2, margin: "0 0 12px" }}>Обязательные предметы</h2>
      {Object.values(SUBS).map(s => <SubjectCard key={s.id} s={s} />)}
      {profSubs.length > 0 && <>
        <h2 style={{ ...TYPE.h2, margin: "18px 0 12px" }}>Профильные предметы</h2>
        {profSubs.map(s => <SubjectCard key={s.id} s={s} />)}
      </>}
      <button onClick={() => nav("fullent")} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", width: "100%", background: "linear-gradient(135deg,rgba(14,165,233,0.12),rgba(139,92,246,0.12))", border: "1px solid rgba(14,165,233,0.25)", padding: "18px 14px", marginTop: 18, marginBottom: 8, cursor: "pointer", textAlign: "left", transition: "all 0.2s", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }} onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 24px rgba(14,165,233,0.15)"; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; }}>
        <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg,#0EA5E9,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <GraduationCap size={24} color="#fff" />
        </div>
        <div style={{ marginLeft: 14, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Полный ЕНТ</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>120 заданий • 5 предметов • 4 часа • 140 баллов</div>
        </div>
        <ChevronRight size={18} color="#0EA5E9" />
      </button>
      <h2 style={{ ...TYPE.h2, margin: "18px 0 12px" }}>Инструменты</h2>
      <button onClick={() => nav("calc")} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", width: "100%", background: "linear-gradient(135deg,#FF6B35,#e85d26)", border: "none", padding: "16px 14px", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Calculator size={22} color="#fff" />
        </div>
        <div style={{ marginLeft: 12, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Калькулятор грантов</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{UNIS.length} вузов Алматы и Астаны • 2024/2025</div>
        </div>
        <ChevronRight size={18} color="#fff" />
      </button>
      <div style={{ ...CARD_COMPACT, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.15)", padding: "11px 13px", marginTop: 14 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#0EA5E9", marginBottom: 3 }}>Формат ЕНТ 2025/2026</div>
        <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.7 }}>История — 20 зад. (5 б. порог) • Мат. грамотность — 10 зад. (3 б.) • Чтение — 10 зад. (3 б.) • 2 проф. предмета — по 40 зад. (50 б., порог 5) • Итого 120 зад., 140 б., 4 часа</div>
      </div>
    </div>
  );
}
