import React, { useState } from "react";
import { TOTAL_Q } from '../config/questionPools.js';
import { getPoolSize } from '../utils/questionStore.js';
import { UNIS } from '../data/universities.js';
import { supabase } from '../config/supabase.js';
import Auth from './Auth.jsx';
import { CARD_COMPACT, TYPE } from '../constants/styles.js';
import { useApp } from '../contexts/AppContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNav } from '../contexts/NavigationContext.jsx';
import { getGoalProgress } from '../utils/competitionHelpers.js';
import Toggle from './ui/Toggle.jsx';
import ProgressBar from './ui/ProgressBar.jsx';
import { Settings as SettingsIcon, BarChart2, Trash2, Target, Wrench, Trophy } from 'lucide-react';

export default function Settings() {
  const { st, updSt, hist, clearHist, resetProfile } = useApp();
  const { user } = useAuth();
  const { nav, setScreen, setTab } = useNav();
  const [cf, setCf] = useState(false);
  const [editGoal, setEditGoal] = useState(false);
  const [goalTarget, setGoalTarget] = useState(() => st.goal?.target || 100);
  const [goalDate, setGoalDate] = useState(() => st.goal?.date || '');
  const goalProg = getGoalProgress(hist, st.goal);
  const handleSignOut = async () => { if (supabase) await supabase.auth.signOut() };
  const handleResetProfile = () => { resetProfile(); setScreen('profile'); setTab('home'); };
  return (<div style={{ padding: "0 20px 100px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 16px" }}>
      <SettingsIcon size={22} color="#94a3b8" />
      <h2 style={{ ...TYPE.h2 }}>Настройки</h2>
    </div>
    <Auth user={user} onSignOut={handleSignOut} />
    {[
      { l: "Объяснения", d: "Показывать разбор после ответа", k: "exp" },
      { l: "Таймер", d: "Обратный отсчёт как на реальном ЕНТ", k: "tmr" },
      { l: "Перемешивание", d: "Случайный порядок вопросов из банка", k: "shf" }
    ].map(item => (
      <div key={item.k} style={{ ...CARD_COMPACT, padding: "16px 14px", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{item.l}</div><div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{item.d}</div></div>
        <Toggle value={st[item.k]} onChange={(v) => updSt({ ...st, [item.k]: v })} />
      </div>
    ))}
    <div style={{ ...CARD_COMPACT, padding: "16px 14px", marginTop: 8, marginBottom: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#fff" }}>
          <Trophy size={15} color="#f59e0b" />Моя цель ЕНТ
        </div>
        <button onClick={() => { setEditGoal(!editGoal); if (!editGoal) { setGoalTarget(st.goal?.target || 100); setGoalDate(st.goal?.date || ''); } }} style={{ background: "none", border: "none", color: "#0EA5E9", fontSize: 11, fontWeight: 600, cursor: "pointer", padding: "2px 6px" }}>
          {editGoal ? "Отмена" : st.goal ? "Изменить" : "Установить"}
        </button>
      </div>
      {editGoal ? (<div style={{ minWidth: 0 }}>
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
            <span>Целевой балл</span>
            <span style={{ color: "#fff", fontWeight: 700, fontFamily: "'JetBrains Mono',monospace" }}>{goalTarget}/140</span>
          </div>
          <input type="range" min={50} max={140} value={goalTarget} onChange={e => setGoalTarget(+e.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, outline: "none", WebkitAppearance: "none", appearance: "none", margin: 0, padding: 0 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Дата ЕНТ</div>
          <input type="date" value={goalDate} onChange={e => setGoalDate(e.target.value)} style={{ display: "block", width: "100%", boxSizing: "border-box", padding: "8px 10px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit", colorScheme: "dark", margin: 0, WebkitAppearance: "none", appearance: "none" }} />
        </div>
        <button onClick={() => { updSt({ ...st, goal: { target: goalTarget, date: goalDate } }); setEditGoal(false); }} disabled={!goalDate} style={{ width: "100%", padding: "10px", background: goalDate ? "linear-gradient(135deg,#f59e0b,#d97706)" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, color: goalDate ? "#fff" : "#64748b", fontSize: 12, fontWeight: 700, cursor: goalDate ? "pointer" : "default" }}>
          Сохранить цель
        </button>
      </div>) : goalProg ? (<div>
        <ProgressBar value={goalProg.pct} max={100} gradient={goalProg.onTrack ? "linear-gradient(90deg,#22c55e,#10B981)" : "linear-gradient(90deg,#eab308,#f59e0b)"} height={6} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10, color: "#94a3b8" }}>~{goalProg.approxScore}/{goalProg.target} баллов</span>
          <span style={{ fontSize: 10, color: goalProg.onTrack ? "#22c55e" : "#eab308", fontWeight: 600 }}>
            {goalProg.daysLeft > 0 ? `${goalProg.daysLeft} дн. до ЕНТ` : "ЕНТ сегодня!"}
          </span>
        </div>
      </div>) : (<div style={{ fontSize: 11, color: "#64748b" }}>Установите цель, чтобы отслеживать прогресс</div>)}
    </div>
    <button onClick={handleResetProfile} style={{ ...CARD_COMPACT, width: "100%", padding: "13px", marginTop: 4, background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.15)", color: "#0EA5E9", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <Target size={15} />Изменить профильные предметы
    </button>
    {(user?.email === "dzakpelov@gmail.com" || user?.email === "monabekova2@gmail.com") && <button onClick={() => nav("admin")} style={{ ...CARD_COMPACT, width: "100%", padding: "13px", marginTop: 4, background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)", color: "#a855f7", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <Wrench size={15} />Админ-панель (генерация вопросов)
    </button>}
    <div style={{ ...CARD_COMPACT, padding: "16px 14px", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
        <BarChart2 size={15} />Статистика
      </div>
      {(() => {
        const regular = hist.filter(t => t.type !== "fullent");
        const totalQ = regular.reduce((s, t) => s + (t.to || 0), 0);
        const totalC = regular.reduce((s, t) => s + (t.co || 0), 0);
        return [
          ["Тестов пройдено", hist.length],
          ["Вопросов решено", totalQ],
          ["Правильных ответов", totalC],
          ["Процент верных", totalQ > 0 ? Math.round(totalC / totalQ * 100) + "%" : "\u2014"]
        ];
      })().map(([l, v], i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>{l}</span>
          <span style={{ fontSize: 11, color: "#fff", fontWeight: 600, fontFamily: "'JetBrains Mono',monospace" }}>{v}</span>
        </div>
      ))}
    </div>
    {hist.length > 0 && !cf && <button onClick={() => setCf(true)} style={{ ...CARD_COMPACT, width: "100%", padding: "13px", marginTop: 4, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <Trash2 size={15} />Очистить историю
    </button>}
    {cf && <div style={{ ...CARD_COMPACT, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", padding: "14px", marginTop: 4 }}>
      <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 600, marginBottom: 6 }}>Удалить всю историю?</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { clearHist(); setCf(false); }} style={{ flex: 1, padding: "10px", background: "#ef4444", border: "none", borderRadius: 9, color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Да, удалить</button>
        <button onClick={() => setCf(false)} style={{ flex: 1, padding: "10px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, color: "#94a3b8", fontSize: 11, cursor: "pointer" }}>Отмена</button>
      </div>
    </div>}
    <div style={{ textAlign: "center", marginTop: 28 }}>
      <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Unbounded',sans-serif" }}><span style={{ color: "#FF6B35" }}>ENT</span><span style={{ color: "#0EA5E9" }}>prep</span></div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>v5.0 • {TOTAL_Q} вопросов • {Math.floor(getPoolSize('reading') / 5)} текстов</div>
      <div style={{ fontSize: 10, color: "#4a5568", marginTop: 2 }}>{UNIS.length} вузов • Формат ЕНТ 2025/2026 • 140 баллов макс.</div>
    </div>
  </div>);
}
