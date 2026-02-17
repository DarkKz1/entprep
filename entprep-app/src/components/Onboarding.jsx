import React, { useState } from "react";
import { BookOpen, Brain, Trophy, ChevronRight, ChevronLeft } from 'lucide-react';
import { CARD_HERO, TYPE } from '../constants/styles.js';

const SLIDES = [
  {
    Icon: BookOpen,
    color: "#0EA5E9",
    title: "1,950 вопросов",
    sub: "Все 13 предметов ЕНТ с подробными объяснениями к каждому вопросу",
  },
  {
    Icon: Brain,
    color: "#8B5CF6",
    title: "Умная подготовка",
    sub: "AI-анализ ошибок, персональные рекомендации и отслеживание прогресса",
  },
  {
    Icon: Trophy,
    color: "#FF6B35",
    title: "Готов к ЕНТ!",
    sub: "Полная симуляция экзамена: 120 заданий, 5 предметов, 4 часа, 140 баллов",
  },
];

export default function Onboarding({ onFinish }) {
  const [idx, setIdx] = useState(0);
  const slide = SLIDES[idx];
  const isLast = idx === SLIDES.length - 1;

  return (
    <div style={{ padding: "0 20px", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Unbounded',sans-serif", marginBottom: 40 }}>
          <span style={{ color: "#FF6B35" }}>ENT</span><span style={{ color: "#0EA5E9" }}>prep</span>
        </div>
      </div>

      <div key={idx} style={{ ...CARD_HERO, textAlign: "center", padding: "40px 24px", marginBottom: 32, animation: "screenIn 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24, margin: "0 auto 24px",
          background: `${slide.color}18`,
          border: `2px solid ${slide.color}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <slide.Icon size={38} color={slide.color} strokeWidth={1.8} />
        </div>
        <h2 style={{ ...TYPE.h1, fontSize: 22, marginBottom: 12 }}>{slide.title}</h2>
        <p style={{ ...TYPE.bodySmall, fontSize: 13, maxWidth: 280, margin: "0 auto", lineHeight: 1.6 }}>{slide.sub}</p>
      </div>

      {/* Dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 32 }}>
        {SLIDES.map((_, i) => (
          <div key={i} style={{
            width: i === idx ? 24 : 8, height: 8, borderRadius: 4,
            background: i === idx ? slide.color : "rgba(255,255,255,0.12)",
            transition: "all 0.3s",
          }} />
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {idx > 0 && (
          <button onClick={() => setIdx(idx - 1)} style={{
            width: 48, height: 48, borderRadius: 14,
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", flexShrink: 0,
          }}>
            <ChevronLeft size={20} color="#94a3b8" />
          </button>
        )}
        <button onClick={() => isLast ? onFinish() : setIdx(idx + 1)} style={{
          flex: 1, padding: "15px 20px",
          background: isLast ? "linear-gradient(135deg,#FF6B35,#e85d26)" : "rgba(255,255,255,0.06)",
          border: isLast ? "none" : "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 700,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          boxShadow: isLast ? "0 4px 20px rgba(255,107,53,0.3)" : "none",
          transition: "all 0.3s",
        }}>
          {isLast ? "Начать" : "Далее"}
          <ChevronRight size={18} />
        </button>
      </div>

      <button onClick={onFinish} style={{
        background: "none", border: "none", color: "#64748b",
        fontSize: 12, cursor: "pointer", marginTop: 20, padding: 8,
        alignSelf: "center",
      }}>
        Пропустить
      </button>
    </div>
  );
}
