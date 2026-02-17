import React, { useState, useEffect, useRef } from "react";
import { ALL_PROFILES } from '../config/questionPools.js';
import { ENT_CONFIG } from '../config/ent.js';
import { getQs } from '../utils/questionHelpers.js';
import { CARD, CARD_COMPACT, TYPE } from '../constants/styles.js';
import { useApp } from '../contexts/AppContext.jsx';
import { useNav } from '../contexts/NavigationContext.jsx';
import { formatTimeHMS } from '../utils/formatters.js';
import LoadingSpinner from './ui/LoadingSpinner.jsx';
import BackButton from './ui/BackButton.jsx';
import ProgressBar from './ui/ProgressBar.jsx';
import { GraduationCap, AlertTriangle, Share2, Check, X, ChevronLeft, ChevronRight, Lightbulb, Grid3X3, Play } from 'lucide-react';
import ShareModal from './ShareModal.jsx';

export default function FullENT({ finish }) {
  const { prof } = useApp();
  const { goHome } = useNav();
  const fm = formatTimeHMS;

  const [phase, setPhase] = useState("intro");
  const [sections, setSections] = useState(null);
  const [sectionsLoading, setSectionsLoading] = useState(true);

  useEffect(() => { let cancelled = false; (async () => {
    const p1 = ALL_PROFILES.find(p => p.id === prof[0]);
    const p2 = ALL_PROFILES.find(p => p.id === prof[1]);
    const [mandatoryQs, prof0Qs, prof1Qs] = await Promise.all([
      Promise.all(ENT_CONFIG.sections.map(s => getQs(s.sid, s.cnt))),
      getQs(prof[0], ENT_CONFIG.profileCnt),
      getQs(prof[1], ENT_CONFIG.profileCnt),
    ]);
    if (cancelled) return;
    const secs = [
      ...ENT_CONFIG.sections.map((s, i) => ({ ...s, qs: mandatoryQs[i] })),
      { sid: prof[0], label: p1?.name || prof[0], icon: p1?.icon || "\uD83D\uDD2C", cnt: ENT_CONFIG.profileCnt, maxPts: ENT_CONFIG.profileMaxPts, threshold: ENT_CONFIG.profileThreshold, ptsPerQ: ENT_CONFIG.profilePtsPerQ, qs: prof0Qs },
      { sid: prof[1], label: p2?.name || prof[1], icon: p2?.icon || "\uD83D\uDCBB", cnt: ENT_CONFIG.profileCnt, maxPts: ENT_CONFIG.profileMaxPts, threshold: ENT_CONFIG.profileThreshold, ptsPerQ: ENT_CONFIG.profilePtsPerQ, qs: prof1Qs },
    ];
    setSections(secs); setSectionsLoading(false);
  })(); return () => { cancelled = true } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [curSec, setCurSec] = useState(0);
  const [curQ, setCurQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showExpl, setShowExpl] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ENT_CONFIG.totalTime);
  const [showGrid, setShowGrid] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase !== "test") return;
    timerRef.current = setInterval(() => setTimeLeft(p => { if (p <= 1) { clearInterval(timerRef.current); setPhase("results"); return 0; } return p - 1; }), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  const sec = sections?.[curSec];
  const q = sec?.qs[curQ];
  const secAnswers = answers[curSec] || {};
  const answered = Object.keys(secAnswers).length;

  const sel = idx => { if (showExpl) return; setAnswers(p => ({ ...p, [curSec]: { ...(p[curSec] || {}), [curQ]: idx } })); setShowExpl(true); };
  const nxt = () => { setShowExpl(false); if (curQ < sec.qs.length - 1) setCurQ(curQ + 1); else if (curSec < sections.length - 1) { setCurSec(curSec + 1); setCurQ(0); } else { finishENT(); } };
  const prev = () => { setShowExpl(false); if (curQ > 0) setCurQ(curQ - 1); };
  const goSec = i => { setShowExpl(false); setCurSec(i); setCurQ(0); setShowGrid(false); };
  const goQ = i => { setShowExpl(false); setCurQ(i); setShowGrid(false); };

  const finishENT = () => { if (timerRef.current) clearInterval(timerRef.current); setPhase("results"); };

  const calcResults = () => {
    return sections.map((s, si) => {
      const sa = answers[si] || {};
      const correct = Object.entries(sa).filter(([qi, ai]) => s.qs[+qi].c === ai).length;
      const pts = Math.round(correct * s.ptsPerQ * 10) / 10;
      return { ...s, correct, pts, passed: pts >= s.threshold, total: s.qs.length };
    });
  };

  const totalAnswered = Object.values(answers).reduce((s, a) => s + Object.keys(a).length, 0);

  // ===== LOADING =====
  if (sectionsLoading || !sections) return <LoadingSpinner text="Загрузка вопросов ЕНТ..." color="#0EA5E9" />;

  // ===== INTRO =====
  if (phase === "intro") return (
    <div style={{ padding: "0 20px 100px" }}>
      <BackButton onClick={goHome} style={{ marginBottom: 14 }} />
      <div style={{ background: "linear-gradient(135deg,#0EA5E9,#8B5CF6)", borderRadius: 22, padding: "32px 20px", textAlign: "center", marginBottom: 20 }}>
        <GraduationCap size={44} color="#fff" style={{ marginBottom: 10 }} />
        <h1 style={{ ...TYPE.h1, fontSize: 22, marginBottom: 8 }}>Полный ЕНТ</h1>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", margin: 0 }}>120 заданий • 5 предметов • 4 часа • 140 баллов</p>
      </div>
      <div style={{ marginBottom: 18 }}>
        {sections.map((s, i) => (
          <div key={i} style={{ ...CARD_COMPACT, padding: "14px", marginBottom: 6, display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 24, marginRight: 11 }}>{s.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{s.label}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.cnt} заданий • Макс. {s.maxPts} б. • Порог: {s.threshold} б.</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ ...CARD_COMPACT, background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.15)", padding: "12px 14px", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#eab308", fontWeight: 600, marginBottom: 4 }}>
          <AlertTriangle size={14} />Важно
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7 }}>Таймер начнётся сразу после нажатия «Начать». Можно переключаться между секциями и возвращаться к вопросам.</div>
      </div>
      <button onClick={() => setPhase("test")} style={{ width: "100%", padding: "16px", background: "linear-gradient(135deg,#0EA5E9,#8B5CF6)", color: "#fff", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 24px rgba(14,165,233,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Play size={18} />Начать ЕНТ
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
      <div style={{ padding: "0 20px 100px" }}>
        <div style={{ ...CARD, background: "linear-gradient(135deg,rgba(26,26,50,0.8),rgba(22,33,62,0.8),rgba(15,52,96,0.6))", borderRadius: 22, padding: "32px 20px", textAlign: "center", marginBottom: 18, border: `2px solid ${allPassed ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`, boxShadow: `0 8px 40px ${allPassed ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)"}`, animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)" }}>
          <div style={{ fontSize: 56, marginBottom: 8, animation: "countUp 0.6s cubic-bezier(0.16,1,0.3,1)" }}>{allPassed ? "\uD83C\uDF89" : "\uD83D\uDCDA"}</div>
          <div style={{ fontSize: 42, fontWeight: 800, fontFamily: "'Unbounded',sans-serif", color: allPassed ? "#22c55e" : "#ef4444", animation: "countUp 0.7s cubic-bezier(0.16,1,0.3,1)" }}>{totalPts}/140</div>
          <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>{totalCorrect} из 120 верных • {fm(elapsed)}</div>
          <div style={{ fontSize: 13, color: allPassed ? "#22c55e" : "#ef4444", marginTop: 4, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
            {allPassed ? <><Check size={15} />Все пороги пройдены!</> : <><X size={15} />Есть непройденные пороги</>}
          </div>
        </div>
        <h3 style={{ ...TYPE.h3, margin: "0 0 12px" }}>Результаты по предметам</h3>
        {res.map((r, i) => (
          <div key={i} style={{ ...CARD_COMPACT, padding: "14px", marginBottom: 7, border: `1px solid ${r.passed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`, borderLeft: `3px solid ${r.passed ? "#22c55e" : "#ef4444"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 20 }}>{r.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{r.correct}/{r.total} верных</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 17, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", color: r.passed ? "#22c55e" : "#ef4444" }}>{r.pts}/{r.maxPts}</div>
                <div style={{ fontSize: 10, color: r.passed ? "#22c55e" : "#ef4444", display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                  {r.passed ? <><Check size={11} />Порог</> : `Порог \u2717 (мин. ${r.threshold})`}
                </div>
              </div>
            </div>
          </div>
        ))}
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 13, fontWeight: 600, color: "#0EA5E9", cursor: "pointer", marginBottom: 10 }}>Разбор всех ответов</summary>
          {sections.map((s, si) => (
            <div key={si} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{s.icon} {s.label}</div>
              {s.qs.map((qq, qi) => { const ua = (answers[si] || {})[qi]; const ok = ua === qq.c; return (
                <div key={qi} style={{ ...CARD_COMPACT, padding: "10px 12px", marginBottom: 4, borderLeft: `3px solid ${ok ? "#22c55e" : ua !== undefined ? "#ef4444" : "#64748b"}` }}>
                  <div style={{ fontSize: 11, color: "#e2e8f0", marginBottom: 3, fontWeight: 500 }}>{qi + 1}. {qq.q}</div>
                  {ua !== undefined ? (<div style={{ fontSize: 10, color: ok ? "#22c55e" : "#ef4444", display: "flex", alignItems: "center", gap: 3 }}>
                    {ok ? <Check size={11} /> : <X size={11} />} {qq.o[ua]}{!ok && <span style={{ color: "#22c55e" }}> → {qq.o[qq.c]}</span>}
                  </div>) : (<div style={{ fontSize: 10, color: "#64748b" }}>Пропущен → {qq.o[qq.c]}</div>)}
                  <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3, lineHeight: 1.6, background: "rgba(14,165,233,0.04)", padding: "5px 7px", borderRadius: 6, display: "flex", gap: 4 }}>
                    <Lightbulb size={11} color="#0EA5E9" style={{ flexShrink: 0, marginTop: 1 }} /><span>{qq.e}</span>
                  </div>
                </div>
              ); })}
            </div>
          ))}
        </details>
        <button onClick={() => setShowShare(true)} style={{ width: "100%", padding: "15px", marginTop: 14, background: "linear-gradient(135deg,#0EA5E9,#38bdf8)", color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(14,165,233,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Share2 size={16} />Поделиться
        </button>
        <button onClick={() => { const res2 = calcResults(); const totalPts2 = Math.round(res2.reduce((s, r) => s + r.pts, 0) * 10) / 10; finish({ type: "fullent", score: totalPts2, maxScore: 140, sections: res2.map(r => ({ sid: r.sid, label: r.label, icon: r.icon, pts: r.pts, maxPts: r.maxPts, passed: r.passed, correct: r.correct, total: r.total })), dt: new Date().toLocaleDateString("ru-RU"), tm: ENT_CONFIG.totalTime - timeLeft }); }} style={{ width: "100%", padding: "15px", marginTop: 8, background: "linear-gradient(135deg,#0EA5E9,#8B5CF6)", color: "#fff", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>На главную</button>
        <ShareModal visible={showShare} onClose={() => setShowShare(false)} type="fullent" data={{ totalPts, maxPts: 140, results: res }} />
      </div>
    );
  }

  // ===== TEST =====
  const isR = sec.sid === "reading" && q?.px;
  return (
    <div style={{ padding: "0 20px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <BackButton onClick={goHome} label="Выйти" style={{ padding: "7px 11px" }} />
        <div style={{ fontSize: 11, color: "#94a3b8" }}>{totalAnswered}/120</div>
        <div style={{ ...CARD_COMPACT, background: timeLeft < 600 ? "rgba(239,68,68,0.12)" : "rgba(30,30,50,0.55)", border: `1px solid ${timeLeft < 600 ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)"}`, padding: "7px 11px", fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 700, color: timeLeft < 600 ? "#ef4444" : "#fff" }}>{fm(timeLeft)}</div>
      </div>
      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto" }}>
        {sections.map((s, i) => { const sa = answers[i] || {}; const cnt = Object.keys(sa).length; const active = i === curSec; return (
          <button key={i} onClick={() => goSec(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: active ? "rgba(14,165,233,0.12)" : "rgba(30,30,50,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: active ? "1px solid rgba(14,165,233,0.3)" : "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "7px 9px", cursor: "pointer", minWidth: 56, flexShrink: 0 }}>
            <span style={{ fontSize: 15 }}>{s.icon}</span>
            <span style={{ fontSize: 9, color: active ? "#0EA5E9" : "#64748b", fontWeight: 600, marginTop: 3 }}>{cnt}/{s.cnt}</span>
          </button>
        ); })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{sec.icon} {sec.label}</span>
        <button onClick={() => setShowGrid(!showGrid)} style={{ ...CARD_COMPACT, background: "rgba(30,30,50,0.55)", padding: "5px 10px", cursor: "pointer", color: "#94a3b8", fontSize: 10, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <Grid3X3 size={13} />#{curQ + 1}/{sec.cnt}
        </button>
      </div>
      {showGrid && <div style={{ display: "grid", gridTemplateColumns: "repeat(10,1fr)", gap: 4, marginBottom: 12 }}>
        {sec.qs.map((_, i) => { const a = (answers[curSec] || {})[i]; const isCorrect = a !== undefined && sec.qs[i].c === a; const isWrong = a !== undefined && sec.qs[i].c !== a; return (
          <button key={i} onClick={() => goQ(i)} style={{ background: i === curQ ? "rgba(14,165,233,0.15)" : isCorrect ? "rgba(34,197,94,0.12)" : isWrong ? "rgba(239,68,68,0.12)" : a !== undefined ? "rgba(255,107,53,0.08)" : "rgba(30,30,50,0.55)", border: `1px solid ${i === curQ ? "rgba(14,165,233,0.35)" : "rgba(255,255,255,0.06)"}`, borderRadius: 6, padding: "5px 0", cursor: "pointer", fontSize: 10, color: isCorrect ? "#22c55e" : isWrong ? "#ef4444" : a !== undefined ? "#FF6B35" : "#64748b", fontWeight: 600 }}>{i + 1}</button>
        ); })}
      </div>}
      <ProgressBar value={curQ + 1} max={sec.qs.length} gradient="linear-gradient(90deg,#0EA5E9,#8B5CF6)" style={{ marginBottom: 12 }} />
      {isR && <div style={{ ...CARD_COMPACT, background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.18)", padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#8B5CF6", marginBottom: 4 }}>{"\uD83D\uDCD6"} {q.pt}</div>
        <div style={{ fontSize: 11, color: "#cbd5e1", lineHeight: 1.7 }}>{q.px}</div>
      </div>}
      <div style={{ ...CARD, padding: "18px 14px", marginBottom: 12, animation: "slideUp 0.35s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", lineHeight: 1.6 }}>{q?.q}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {q?.o.map((opt, idx) => {
          const picked = secAnswers[curQ] === idx; const correct = q.c === idx;
          let bg = "rgba(30,30,50,0.55)", bd = "1px solid rgba(255,255,255,0.08)", tc = "#e2e8f0";
          if (showExpl && correct) { bg = "rgba(34,197,94,0.1)"; bd = "1px solid rgba(34,197,94,0.35)"; tc = "#22c55e"; }
          else if (showExpl && picked && !correct) { bg = "rgba(239,68,68,0.1)"; bd = "1px solid rgba(239,68,68,0.35)"; tc = "#ef4444"; }
          else if (picked) { bg = "rgba(255,107,53,0.1)"; bd = "1px solid rgba(255,107,53,0.35)"; tc = "#FF6B35"; }
          return (<button key={`${curSec}-${curQ}-${idx}`} onClick={() => sel(idx)} style={{ display: "flex", alignItems: "center", background: bg, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: bd, borderRadius: 12, padding: "12px 13px", cursor: showExpl ? "default" : "pointer", textAlign: "left", transition: "all 0.2s" }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, border: `2px solid ${tc}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: tc, flexShrink: 0, marginRight: 10 }}>
              {showExpl && correct ? <Check size={12} /> : showExpl && picked && !correct ? <X size={12} /> : String.fromCharCode(65 + idx)}
            </div>
            <span style={{ fontSize: 13, color: tc, fontWeight: picked ? 600 : 400 }}>{opt}</span>
          </button>);
        })}
      </div>
      {showExpl && <div style={{ ...CARD_COMPACT, background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.12)", padding: "11px 13px", marginTop: 10, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7, display: "flex", gap: 6 }}>
          <Lightbulb size={14} color="#0EA5E9" style={{ flexShrink: 0, marginTop: 2 }} /><span>{q.e}</span>
        </div>
      </div>}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {curQ > 0 && <button onClick={prev} style={{ flex: 1, padding: "13px", background: "rgba(30,30,50,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          <ChevronLeft size={16} />Пред
        </button>}
        {showExpl && <button onClick={nxt} style={{ flex: 2, padding: "13px", background: "linear-gradient(135deg,#0EA5E9,#8B5CF6)", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(14,165,233,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {curQ < sec.qs.length - 1 ? "След" : curSec < sections.length - 1 ? "Следующий предмет" : "Завершить"}<ChevronRight size={16} />
        </button>}
        {!showExpl && secAnswers[curQ] === undefined && <button onClick={() => { if (curQ < sec.qs.length - 1) setCurQ(curQ + 1); else if (curSec < sections.length - 1) { setCurSec(curSec + 1); setCurQ(0); } }} style={{ flex: 2, padding: "13px", background: "rgba(30,30,50,0.55)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#94a3b8", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          Пропустить<ChevronRight size={16} />
        </button>}
      </div>
      <button onClick={finishENT} style={{ width: "100%", padding: "13px", marginTop: 10, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 12, color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Завершить ЕНТ досрочно</button>
    </div>
  );
}
