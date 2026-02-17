import React from "react";
import { SUBS, ALL_PROFILES } from '../config/questionPools.js';
import { TOPIC_MAP, getTopicCount } from '../config/topics.js';
import { CARD_COMPACT, TYPE } from '../constants/styles.js';
import { useNav } from '../contexts/NavigationContext.jsx';
import { useApp } from '../contexts/AppContext.jsx';
import BackButton from './ui/BackButton.jsx';
import { ChevronRight, Play } from 'lucide-react';

export default function SubjectDetail({ sid }) {
  const { nav, goHome } = useNav();
  const { hist } = useApp();
  const sub = SUBS[sid] || ALL_PROFILES.find(p => p.id === sid);
  const topics = TOPIC_MAP[sid];
  if (!topics) { nav("test", sid); return null; }
  const subHist = hist.filter(t => t.su === sid);
  const lastFull = subHist.filter(t => !t.tp);
  const lastFullSc = lastFull.length ? lastFull[lastFull.length - 1].sc : null;
  return (
    <div style={{ padding: "0 20px 100px" }}>
      <BackButton onClick={goHome} style={{ marginBottom: 14 }} />
      <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
        <div style={{ width: 50, height: 50, borderRadius: 15, background: sub.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{sub.icon}</div>
        <div style={{ marginLeft: 14 }}>
          <div style={{ ...TYPE.h2, fontSize: 18 }}>{sub.name}</div>
          <div style={{ ...TYPE.bodySmall }}>{sub.pool} вопросов • {topics.length} тем</div>
        </div>
      </div>
      <button onClick={() => nav("test", sid, null)} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", width: "100%", background: `linear-gradient(135deg,${sub.color}18,${sub.color}0a)`, border: `1px solid ${sub.color}33`, padding: "16px 14px", marginBottom: 18, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }} onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 20px ${sub.color}18` }} onMouseLeave={e => { e.currentTarget.style.boxShadow = "none" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: sub.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Play size={18} color={sub.color} />
        </div>
        <div style={{ marginLeft: 12, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>Полный тест</div>
          <div style={{ fontSize: 11, color: "#94a3b8" }}>{sub.cnt} случайных вопросов из всех тем</div>
        </div>
        {lastFullSc !== null && <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: lastFullSc >= 70 ? "#22c55e" : lastFullSc >= 50 ? "#eab308" : "#ef4444", marginRight: 8 }}>{lastFullSc}%</div>}
        <ChevronRight size={18} color={sub.color} />
      </button>
      <h3 style={{ ...TYPE.h3, margin: "0 0 12px" }}>Темы</h3>
      {topics.map(tp => {
        const cnt = getTopicCount(tp.ranges);
        const tpHist = subHist.filter(t => t.tp === tp.id);
        const lastSc = tpHist.length ? tpHist[tpHist.length - 1].sc : null;
        return (
          <button key={tp.id} onClick={() => nav("test", sid, tp.id)} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", width: "100%", borderLeft: `3px solid ${sub.color}`, padding: "14px 14px", marginBottom: 8, cursor: "pointer", textAlign: "left", transition: "all 0.2s", animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }} onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 20px ${sub.color}18`; e.currentTarget.style.borderColor = sub.color + "44" }} onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)" }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: sub.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{tp.icon}</div>
            <div style={{ marginLeft: 11, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{tp.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>{cnt} вопросов{lastSc !== null && <span style={{ color: lastSc >= 70 ? "#22c55e" : lastSc >= 50 ? "#eab308" : "#ef4444", fontWeight: 600 }}> • Посл: {lastSc}%</span>}</div>
            </div>
            <ChevronRight size={16} color={sub.color} />
          </button>
        );
      })}
    </div>
  );
}
