import React from "react";
import { SUBS, ALL_PROFILES } from "../config/questionPools.js";
import { CARD, TYPE } from "../constants/styles.js";
import { useNav } from '../contexts/NavigationContext.jsx';
import BackButton from './ui/BackButton.jsx';
import { Swords, Play } from "lucide-react";

export default function Challenge({ data }) {
  const { nav } = useNav();
  if (!data) return null;

  const { subjectId, score, topicId } = data;
  const sub = SUBS[subjectId] || ALL_PROFILES.find(p => p.id === subjectId);
  const subName = sub?.name || subjectId;
  const subIcon = sub?.icon || "\uD83D\uDCCB";
  const subColor = sub?.color || "#0EA5E9";

  const accept = () => {
    sessionStorage.setItem("entprep_challenge", JSON.stringify({ subjectId, score, topicId }));
    window.history.replaceState({}, "", window.location.pathname);
    nav("test", subjectId, topicId);
  };

  const decline = () => {
    window.history.replaceState({}, "", window.location.pathname);
    nav("home");
  };

  return (
    <div style={{ padding: "0 20px 100px" }}>
      <BackButton onClick={decline} label="На главную" style={{ marginBottom: 20 }} />

      <div style={{
        ...CARD,
        background: "linear-gradient(135deg,rgba(255,107,53,0.08),rgba(14,165,233,0.08))",
        border: "2px solid rgba(255,107,53,0.25)",
        borderRadius: 22, padding: "40px 24px", textAlign: "center",
        animation: "slideUp 0.5s cubic-bezier(0.16,1,0.3,1)",
      }}>
        <Swords size={56} color="#FF6B35" style={{ marginBottom: 16 }} />

        <div style={{ ...TYPE.h2, fontSize: 20, marginBottom: 12 }}>
          Тебя вызвали!
        </div>

        <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, marginBottom: 24 }}>
          Твой друг набрал <span style={{ color: "#FF6B35", fontWeight: 700, fontSize: 16 }}>{score}%</span> по предмету
        </div>

        <div style={{
          background: "rgba(30,30,50,0.6)", borderRadius: 16,
          border: `1px solid ${subColor}30`, padding: "18px 16px", marginBottom: 24,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
        }}>
          <span style={{ fontSize: 32 }}>{subIcon}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{subName}</span>
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 28 }}>
          Сможешь лучше?
        </div>

        <button onClick={accept} style={{
          width: "100%", padding: "16px",
          background: "linear-gradient(135deg,#FF6B35,#e85d26)", color: "#fff",
          border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer",
          boxShadow: "0 4px 24px rgba(255,107,53,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          marginBottom: 10,
        }}>
          <Play size={18} />Принять вызов
        </button>

        <button onClick={decline} style={{
          width: "100%", padding: "14px",
          background: "rgba(255,255,255,0.04)", color: "#64748b",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          Не сейчас
        </button>
      </div>
    </div>
  );
}
