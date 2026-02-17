import React, { useState } from "react";
import { UNIS } from '../data/universities.js';
import { CARD_COMPACT, TYPE } from '../constants/styles.js';
import { useNav } from '../contexts/NavigationContext.jsx';
import BackButton from './ui/BackButton.jsx';
import { Calculator, MapPin } from 'lucide-react';

export default function Calc() {
  const { goHome } = useNav();
  const [sc, setSc] = useState(80); const [city, setCity] = useState("all");
  const filtered = UNIS.filter(u => city === "all" || u.c === city).map(u => {
    const gap = sc - u.min;
    const chance = gap >= 15 ? "high" : gap >= 1 ? "mid" : "low";
    return { ...u, gap, chance };
  }).sort((a, b) => {
    const ord = { high: 0, mid: 1, low: 2 };
    if (ord[a.chance] !== ord[b.chance]) return ord[a.chance] - ord[b.chance];
    return a.min - b.min;
  });
  const high = filtered.filter(u => u.chance === "high").length;
  const mid = filtered.filter(u => u.chance === "mid").length;
  const low = filtered.filter(u => u.chance === "low").length;
  const pct = Math.round((sc - 50) / 90 * 100);
  const sliderColor = pct < 33 ? "#ef4444" : pct < 66 ? "#eab308" : "#22c55e";
  const chanceColor = { high: "#22c55e", mid: "#eab308", low: "#ef4444" };
  const chanceTxt = { high: "Высокий шанс", mid: "Средний шанс", low: "Не хватает" };
  return (<div style={{ padding: "0 20px 100px" }}>
    <BackButton onClick={goHome} style={{ marginBottom: 14 }} />
    <div style={{ ...CARD_COMPACT, position: "relative", background: "linear-gradient(135deg,rgba(14,165,233,0.1),rgba(139,92,246,0.1))", padding: "20px 16px", marginBottom: 16, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(14,165,233,0.08)", filter: "blur(20px)" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>
          <Calculator size={15} />Калькулятор грантов
        </div>
        <div style={{ ...TYPE.h2 }}>Узнай свои шансы</div>
      </div>
    </div>
    <div style={{ ...CARD_COMPACT, padding: "18px 16px", marginBottom: 14 }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 3 }}>Ваш балл ЕНТ</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: sliderColor, fontFamily: "'Unbounded',sans-serif", lineHeight: 1 }}>{sc}</div>
        <div style={{ fontSize: 10, color: "#64748b", marginTop: 3 }}>из 140</div>
      </div>
      <input type="range" min={50} max={140} value={sc} onChange={e => setSc(+e.target.value)} style={{ width: "100%", height: 6, borderRadius: 3, background: `linear-gradient(90deg,${sliderColor} ${pct}%,rgba(255,255,255,0.08) 0)`, appearance: "none", outline: "none", cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748b", marginTop: 5 }}><span>50</span><span>100</span><span>140</span></div>
    </div>
    <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
      {["all", "Алматы", "Астана"].map(c => {
        const active = city === c;
        return (<button key={c} onClick={() => setCity(c)} style={{ flex: 1, padding: "10px 0", background: active ? "linear-gradient(135deg,#0EA5E9,#8B5CF6)" : "rgba(30,30,50,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: active ? "none" : "1px solid rgba(255,255,255,0.08)", borderRadius: 22, color: active ? "#fff" : "#94a3b8", fontSize: 11, fontWeight: active ? 700 : 600, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
          {c === "all" ? <MapPin size={12} /> : null}{c === "all" ? "Все города" : c}
        </button>);
      })}
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
      <div style={{ ...CARD_COMPACT, padding: "12px 8px", textAlign: "center", border: "1px solid rgba(34,197,94,0.12)" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e", fontFamily: "'Unbounded',sans-serif" }}>{high}</div>
        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>Высокий шанс</div>
      </div>
      <div style={{ ...CARD_COMPACT, padding: "12px 8px", textAlign: "center", border: "1px solid rgba(234,179,8,0.12)" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#eab308", fontFamily: "'Unbounded',sans-serif" }}>{mid}</div>
        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>Средний шанс</div>
      </div>
      <div style={{ ...CARD_COMPACT, padding: "12px 8px", textAlign: "center", border: "1px solid rgba(239,68,68,0.12)" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444", fontFamily: "'Unbounded',sans-serif" }}>{low}</div>
        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>Не хватает</div>
      </div>
    </div>
    {filtered.map((u, i) => {
      const clr = chanceColor[u.chance];
      const prog = Math.min(100, Math.round(sc / u.min * 100));
      const isLow = u.chance === "low";
      return (<div key={i} style={{ ...CARD_COMPACT, background: isLow ? "rgba(30,30,46,0.35)" : "rgba(30,30,50,0.55)", padding: "14px 14px 14px 16px", marginBottom: 8, borderLeft: `3px solid ${clr}`, opacity: isLow ? 0.7 : 1, transition: "all 0.2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
          <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <span style={{ fontSize: 22, marginRight: 9 }}>{u.i}</span>
            <div><div style={{ fontSize: 12, fontWeight: 600, color: isLow ? "#94a3b8" : "#fff" }}>{u.n}</div><div style={{ fontSize: 10, color: "#64748b" }}>{u.c} • Мин. балл: {u.min}</div></div>
          </div>
          <div style={{ background: `${clr}12`, border: `1px solid ${clr}25`, borderRadius: 9, padding: "4px 9px", flexShrink: 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: clr, whiteSpace: "nowrap" }}>{isLow ? `\u2212${Math.abs(u.gap)} б.` : chanceTxt[u.chance]}</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 4, marginBottom: 7, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 4, width: `${prog}%`, background: clr, transition: "width 0.3s" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 10, color: "#94a3b8", flex: 1 }}>{u.sp}</div>
          <div style={{ fontSize: 9, color: "#64748b", fontFamily: "'JetBrains Mono',monospace" }}>{sc}/{u.min}</div>
        </div>
        <div style={{ fontSize: 9, color: "#4a5568", marginTop: 4 }}>{u.inf}</div>
      </div>);
    })}
  </div>);
}
