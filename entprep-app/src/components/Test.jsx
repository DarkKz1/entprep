import React, { useState, useEffect, useRef } from "react";
import { SUBS, ALL_PROFILES } from '../config/questionPools.js';
import { getQs } from '../utils/questionHelpers.js';
import { supabase } from '../config/supabase.js';
import { CARD, CARD_COMPACT, TYPE } from '../constants/styles.js';
import { useApp } from '../contexts/AppContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNav } from '../contexts/NavigationContext.jsx';
import { formatTime } from '../utils/formatters.js';
import { isNewRecord, completeDailyChallenge, loadDaily } from '../utils/competitionHelpers.js';
import LoadingSpinner from './ui/LoadingSpinner.jsx';
import BackButton from './ui/BackButton.jsx';
import ProgressBar from './ui/ProgressBar.jsx';
import { Lightbulb, Bot, Share2, Check, X, ChevronDown, ChevronUp, Swords, Trophy } from 'lucide-react';
import ShareModal from './ShareModal.jsx';

export default function Test({ sid, tid, customQs = null, finish }) {
  const { st, hist } = useApp();
  const { user } = useAuth();
  const { goHome, setCustomQs: setNavCustomQs, setScreen } = useNav();
  const { exp: showExp = true, tmr: useTmr = true, shf: useShuffle = true } = st;
  const sub = SUBS[sid] || ALL_PROFILES.find(p => p.id === sid);
  const [qs, setQs] = useState(null);
  const [loading, setLoading] = useState(true);
  const baseTime = sid === "history" ? 30 * 60 : 20 * 60;
  const [cur, setCur] = useState(0); const [ans, setAns] = useState({}); const [show, setShow] = useState(false);
  const [tl, setTl] = useState(baseTime); const [fin, setFin] = useState(false); const tr = useRef(null); const autoFinished = useRef(false);
  const [aiText, setAiText] = useState({});
  const [aiLoad, setAiLoad] = useState({});
  const [aiExpanded, setAiExpanded] = useState({});
  const [showShare, setShowShare] = useState(false);
  const [challenge] = useState(() => { try { const c = sessionStorage.getItem("entprep_challenge"); return c ? JSON.parse(c) : null; } catch { return null; } });
  const dailyMarkedRef = useRef(false);

  const handleBack = () => {
    if (customQs) { setNavCustomQs(null); setScreen('errors'); }
    else if (sid === "reading") { goHome(); }
    else { setScreen('topics'); }
  };

  useEffect(() => { let cancelled = false; (async () => { const questions = customQs ? customQs.map(q => ({ ...q, o: [...q.o] })) : await getQs(sid, sub.cnt, useShuffle, tid); if (cancelled) return; const tot = questions.length; const timerSec = tid ? Math.max(5 * 60, Math.round(baseTime * (tot / sub.cnt))) : baseTime; setQs(questions); setTl(timerSec); setLoading(false); })(); return () => { cancelled = true } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (loading || !useTmr) return; tr.current = setInterval(() => setTl(p => { if (p <= 1) { clearInterval(tr.current); autoFinished.current = true; setFin(true); return 0; } return p - 1; }), 1000); return () => { if (tr.current) clearInterval(tr.current); }; }, [loading]);
  useEffect(() => { if (!fin || !autoFinished.current || !qs) return; autoFinished.current = false; const tot = qs.length; const timerSec = tid ? Math.max(5 * 60, Math.round(baseTime * (tot / sub.cnt))) : baseTime; const cc = Object.entries(ans).filter(([i, a]) => qs[+i].c === a).length; const qd = qs.map((q, i) => ({ oi: q._oi, ok: ans[i] === q.c })); finish({ su: sid, tp: tid || null, co: cc, to: tot, sc: tot ? Math.round(cc / tot * 100) : 0, dt: new Date().toLocaleDateString("ru-RU"), tm: timerSec, qd }); }, [fin]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!fin || dailyMarkedRef.current || customQs || !qs) return;
    const tot = qs.length;
    const cc = Object.entries(ans).filter(([i, a]) => qs[+i].c === a).length;
    const pctVal = tot ? Math.round(cc / tot * 100) : 0;
    const daily = loadDaily();
    if (daily && daily.subjectId === sid && !daily.completed) {
      completeDailyChallenge(pctVal);
      dailyMarkedRef.current = true;
    }
  }, [fin]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !qs) return <LoadingSpinner text="Загрузка вопросов..." />;

  const tot = qs.length; const timerSec = tid ? Math.max(5 * 60, Math.round(baseTime * (tot / sub.cnt))) : baseTime;
  const q = qs[cur]; const cc = Object.entries(ans).filter(([i, a]) => qs[+i].c === a).length;
  const sel = idx => { if (show) return; setAns(p => ({ ...p, [cur]: idx })); if (showExp) { setShow(true); } else { setTimeout(() => { if (cur < tot - 1) { setCur(c => c + 1); } else { if (tr.current) clearInterval(tr.current); setFin(true); } }, 300); } };
  const nxt = () => { setShow(false); if (cur < tot - 1) { setCur(cur + 1); } else { if (tr.current) clearInterval(tr.current); setFin(true); } };
  const fm = formatTime;
  const askAI = async (index) => {
    if (aiText[index] || aiLoad[index]) return;
    setAiLoad(p => ({ ...p, [index]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setAiLoad(p => ({ ...p, [index]: false })); return; }
      const qItem = qs[index];
      const res = await fetch("/api/ai-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ question: qItem.q, options: qItem.o, userAnswer: ans[index], correctAnswer: qItem.c, explanation: qItem.e })
      });
      const data = await res.json();
      if (data.short) setAiText(p => ({ ...p, [index]: { short: data.short, detailed: data.detailed || data.short } }));
      else if (data.explanation) setAiText(p => ({ ...p, [index]: { short: data.explanation, detailed: data.explanation } }));
      else setAiText(p => ({ ...p, [index]: { short: "Не удалось получить объяснение.", detailed: "Не удалось получить объяснение." } }));
    } catch { setAiText(p => ({ ...p, [index]: { short: "Ошибка соединения.", detailed: "Ошибка соединения. Попробуйте позже." } })); }
    setAiLoad(p => ({ ...p, [index]: false }));
  };
  const pct = tot ? Math.round(cc / tot * 100) : 0;
  const record = fin && !customQs ? isNewRecord(hist, { su: sid, sc: pct }) : { isRecord: false };
  const aiBtn = (index) => (
    <div style={{ marginTop: 8 }}>
      {user ? <>
        {!aiText[index] && <button onClick={() => askAI(index)} disabled={aiLoad[index]} style={{ ...CARD_COMPACT, background: "linear-gradient(135deg,rgba(139,92,246,0.1),rgba(14,165,233,0.1))", border: "1px solid rgba(139,92,246,0.25)", padding: "9px 14px", cursor: aiLoad[index] ? "wait" : "pointer", color: "#a78bfa", fontSize: 11, fontWeight: 600, transition: "all 0.2s", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Bot size={14} />{aiLoad[index] ? "Думаю..." : "Объясни подробнее"}
        </button>}
        {aiText[index] && <div style={{ ...CARD_COMPACT, fontSize: 11, color: "#c4b5fd", lineHeight: 1.7, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.18)", padding: "10px 12px", marginTop: 4, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
          <Bot size={13} color="#a78bfa" style={{ display: "inline", verticalAlign: "-2px", marginRight: 4 }} /><span style={{ color: "#a78bfa", fontWeight: 700 }}>AI: </span>{aiExpanded[index] ? aiText[index].detailed : aiText[index].short}
          {aiText[index].short !== aiText[index].detailed && <button onClick={() => setAiExpanded(p => ({ ...p, [index]: !p[index] }))} style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 6, background: "none", border: "none", padding: 0, cursor: "pointer", color: "#8B5CF6", fontSize: 10, fontWeight: 600 }}>
            {aiExpanded[index] ? <><ChevronUp size={12} />Кратко</> : <><ChevronDown size={12} />Подробнее</>}
          </button>}
        </div>}
      </> : <div style={{ fontSize: 10, color: "#64748b", marginTop: 6, display: "flex", alignItems: "center", gap: 5 }}>
        <Bot size={13} style={{ opacity: 0.6 }} /> Войдите через Google для AI-разбора
      </div>}
    </div>
  );

  // ===== RESULTS =====
  if (fin) return (<div style={{ padding: "0 20px 100px" }}>
    <div style={{ ...CARD, background: "linear-gradient(135deg,rgba(26,26,50,0.8),rgba(22,33,62,0.8),rgba(15,52,96,0.6))", borderRadius: 22, padding: "36px 20px", textAlign: "center", marginBottom: 18, border: `2px solid ${pct >= 70 ? "rgba(34,197,94,0.25)" : pct >= 50 ? "rgba(234,179,8,0.25)" : "rgba(239,68,68,0.25)"}`, boxShadow: `0 8px 40px ${pct >= 70 ? "rgba(34,197,94,0.1)" : pct >= 50 ? "rgba(234,179,8,0.1)" : "rgba(239,68,68,0.1)"}`, animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)" }}>
      <div style={{ fontSize: 56, marginBottom: 8, animation: "countUp 0.6s cubic-bezier(0.16,1,0.3,1)" }}>{pct >= 70 ? "\uD83C\uDF89" : pct >= 50 ? "\uD83D\uDCAA" : "\uD83D\uDCDA"}</div>
      <div style={{ fontSize: 44, fontWeight: 800, fontFamily: "'Unbounded',sans-serif", color: pct >= 70 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444", animation: "countUp 0.7s cubic-bezier(0.16,1,0.3,1)" }}>{pct}%</div>
      <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>{cc} из {tot} • {fm(timerSec - tl)}</div>
      <div style={{ fontSize: 12, color: pct >= 70 ? "#22c55e" : pct >= 50 ? "#eab308" : "#ef4444", marginTop: 4, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
        {pct >= 70 ? <><Check size={14} />Отлично! Выше порога</> : pct >= 50 ? "Неплохо, но нужно повторить" : "Нужно больше подготовки"}
      </div>
      {record.isRecord && <div style={{ marginTop: 12, padding: "10px 16px", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, animation: "confetti 0.6s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Trophy size={18} color="#f59e0b" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "#f59e0b" }}>Новый рекорд!</span>
        </div>
        {record.prevBest > 0 && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
          Было {record.prevBest}% → стало {pct}% (+{record.improvement}%)
        </div>}
      </div>}
    </div>
    <h3 style={{ ...TYPE.h3, margin: "0 0 10px" }}>Разбор ответов</h3>
    {qs.map((q, i) => { const ua = ans[i]; const ok = ua === q.c; return (
      <div key={i} style={{ ...CARD_COMPACT, padding: "12px 13px", marginBottom: 6, borderLeft: `3px solid ${ok ? "#22c55e" : ua !== undefined ? "#ef4444" : "#64748b"}` }}>
        <div style={{ fontSize: 12, color: "#e2e8f0", marginBottom: 3, fontWeight: 500 }}>{i + 1}. {q.q}</div>
        {ua !== undefined ? (<div style={{ fontSize: 11, color: ok ? "#22c55e" : "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
          {ok ? <Check size={13} /> : <X size={13} />} {q.o[ua]}{!ok && <span style={{ color: "#22c55e" }}> → {q.o[q.c]}</span>}
        </div>) : (<div style={{ fontSize: 11, color: "#64748b" }}>Пропущен → {q.o[q.c]}</div>)}
        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4, lineHeight: 1.7, background: "rgba(14,165,233,0.04)", padding: "6px 8px", borderRadius: 8 }}>
          <span style={{ color: "#0EA5E9", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}><Lightbulb size={12} /></span> {q.e}
        </div>
        {!ok && aiBtn(i)}
      </div>
    ); })}
    {challenge && challenge.subjectId === sid && (<div style={{ ...CARD_COMPACT, background: "linear-gradient(135deg,rgba(255,107,53,0.06),rgba(14,165,233,0.06))", border: "1px solid rgba(255,107,53,0.2)", padding: "16px", marginTop: 14, textAlign: "center", animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 8 }}><Swords size={18} color="#FF6B35" /><span style={{ fontSize: 14, fontWeight: 700, color: "#FF6B35" }}>Результат вызова</span></div>
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 6 }}>
        <div><div style={{ fontSize: 11, color: "#94a3b8" }}>Друг</div><div style={{ fontSize: 24, fontWeight: 800, color: "#64748b" }}>{challenge.score}%</div></div>
        <div style={{ fontSize: 20, color: "#64748b", alignSelf: "center" }}>vs</div>
        <div><div style={{ fontSize: 11, color: "#94a3b8" }}>Ты</div><div style={{ fontSize: 24, fontWeight: 800, color: pct > challenge.score ? "#22c55e" : pct === challenge.score ? "#eab308" : "#ef4444" }}>{pct}%</div></div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: pct > challenge.score ? "#22c55e" : pct === challenge.score ? "#eab308" : "#ef4444" }}>{pct > challenge.score ? "Ты победил!" : pct === challenge.score ? "Ничья!" : "Друг победил!"}</div>
    </div>)}
    <button onClick={() => setShowShare(true)} style={{ width: "100%", padding: "15px", marginTop: 14, background: "linear-gradient(135deg,#0EA5E9,#38bdf8)", color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(14,165,233,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
      <Share2 size={16} />Поделиться
    </button>
    <button onClick={() => { if (challenge) sessionStorage.removeItem("entprep_challenge"); const qd = qs.map((q, i) => ({ oi: q._oi, ok: ans[i] === q.c })); finish({ su: sid, tp: tid || null, co: cc, to: tot, sc: pct, dt: new Date().toLocaleDateString("ru-RU"), tm: timerSec - tl, qd }); }} style={{ width: "100%", padding: "15px", marginTop: 8, background: sub.color, color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>На главную</button>
    <ShareModal visible={showShare} onClose={() => setShowShare(false)} type="test" data={{ subjectName: sub.name, subjectEmoji: sub.icon, subjectId: sid, topicId: tid, score: cc, total: tot, pct }} />
  </div>);

  // ===== QUIZ =====
  const isR = sid === "reading" && q.px;
  return (<div style={{ padding: "0 20px 100px" }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <BackButton onClick={handleBack} label="Выйти" />
      {useTmr && <div style={{ ...CARD_COMPACT, background: tl < 120 ? "rgba(239,68,68,0.12)" : "rgba(30,30,50,0.55)", border: `1px solid ${tl < 120 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"}`, padding: "8px 12px", fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 700, color: tl < 120 ? "#ef4444" : "#fff" }}>{fm(tl)}</div>}
    </div>
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>Вопрос {cur + 1} из {tot}</span>
        <span style={{ fontSize: 11, color: "#22c55e", fontFamily: "'JetBrains Mono',monospace" }}>{cc} верных</span>
      </div>
      <ProgressBar value={cur + 1} max={tot} />
    </div>
    {isR && <div style={{ ...CARD_COMPACT, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.18)", padding: "12px 14px", marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#8B5CF6", marginBottom: 4 }}>{"\uD83D\uDCD6"} {q.pt}</div>
      <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.7 }}>{q.px}</div>
    </div>}
    <div style={{ ...CARD, padding: "20px 16px", marginBottom: 12, animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#fff", lineHeight: 1.6 }}>{q.q}</div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      {q.o.map((opt, idx) => {
        const picked = ans[cur] === idx; const correct = q.c === idx;
        let bg = "rgba(30,30,50,0.55)", bd = "1px solid rgba(255,255,255,0.08)", tc = "#e2e8f0";
        if (show && correct) { bg = "rgba(34,197,94,0.1)"; bd = "1px solid rgba(34,197,94,0.35)"; tc = "#22c55e"; }
        else if (show && picked && !correct) { bg = "rgba(239,68,68,0.1)"; bd = "1px solid rgba(239,68,68,0.35)"; tc = "#ef4444"; }
        else if (picked) { bg = "rgba(255,107,53,0.1)"; bd = "1px solid rgba(255,107,53,0.35)"; tc = "#FF6B35"; }
        return (<button key={`${cur}-${idx}`} onClick={() => sel(idx)} style={{ display: "flex", alignItems: "center", background: bg, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: bd, borderRadius: 13, padding: "13px 14px", cursor: show ? "default" : "pointer", textAlign: "left", transition: "all 0.2s", position: "relative", overflow: "hidden" }}>
          <div style={{ width: 26, height: 26, borderRadius: 13, border: `2px solid ${tc}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: tc, flexShrink: 0, marginRight: 11 }}>
            {show && correct ? <Check size={14} /> : show && picked && !correct ? <X size={14} /> : String.fromCharCode(65 + idx)}
          </div>
          <span style={{ fontSize: 14, color: tc, fontWeight: picked ? 600 : 400 }}>{opt}</span>
        </button>);
      })}
    </div>
    {show && <div style={{ ...CARD_COMPACT, background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.12)", padding: "12px 14px", marginTop: 12, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
      <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7, display: "flex", gap: 6 }}>
        <Lightbulb size={15} color="#0EA5E9" style={{ flexShrink: 0, marginTop: 2 }} /><span>{q.e}</span>
      </div>
      {aiBtn(cur)}
    </div>}
    {show && <button onClick={nxt} style={{ width: "100%", padding: "15px", marginTop: 12, background: "linear-gradient(135deg,#FF6B35,#e85d26)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 4px 20px rgba(255,107,53,0.25)" }}>{cur < tot - 1 ? "Следующий →" : "Завершить тест"}</button>}
  </div>);
}
