import React, { useState, useEffect, useMemo } from "react";
import { SUBS, ALL_PROFILES } from '../config/questionPools.js';
import { resolveQuestion } from '../utils/questionStore.js';
import { getWrongQuestions } from '../utils/adaptiveHelpers.js';
import { shuffleOptions } from '../utils/questionHelpers.js';
import { CARD_COMPACT, CARD_HERO, TYPE } from '../constants/styles.js';
import { useApp } from '../contexts/AppContext.jsx';
import { useNav } from '../contexts/NavigationContext.jsx';
import LoadingSpinner from './ui/LoadingSpinner.jsx';
import BackButton from './ui/BackButton.jsx';
import EmptyState from './ui/EmptyState.jsx';
import { ChevronDown, Check, Lightbulb, RotateCcw } from 'lucide-react';

function getMeta(sid) {
  const s = SUBS[sid];
  if (s) return s;
  const p = ALL_PROFILES.find(x => x.id === sid);
  return p || { name: sid, icon: "\ud83d\udcdd", color: "#94a3b8" };
}

export default function ErrorReview() {
  const { hist } = useApp();
  const { nav, setScreen, setTab } = useNav();
  const wrongs = useMemo(() => getWrongQuestions(hist), [hist]);
  const [expanded, setExpanded] = useState({});
  const [grouped, setGrouped] = useState(null);
  const [loading, setLoading] = useState(true);

  const handleBack = () => { setScreen('adaptive'); setTab('adaptive'); };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m = {};
      for (const w of wrongs) {
        if (!m[w.su]) m[w.su] = [];
        m[w.su].push(w);
      }
      const groups = [];
      for (const [su, items] of Object.entries(m)) {
        const resolved = await Promise.all(
          items.map(async w => {
            const q = await resolveQuestion(w.su, w.oi);
            return { ...w, q };
          })
        );
        const valid = resolved.filter(w => w.q);
        if (valid.length > 0) {
          groups.push({ su, meta: getMeta(su), items: valid });
        }
      }
      if (!cancelled) { setGrouped(groups); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [wrongs]);

  if (loading) return <LoadingSpinner text="Загрузка ошибок..." color="#ef4444" />;

  const totalErrors = grouped.reduce((s, g) => s + g.items.length, 0);

  const toggle = (su) => setExpanded(p => ({ ...p, [su]: !p[su] }));

  const startRetry = () => {
    const questions = [];
    for (const g of grouped) {
      for (const w of g.items) {
        questions.push({ ...w.q, _oi: w.oi, _su: g.su });
      }
    }
    const shuffled = questions.map(q => shuffleOptions(q));
    nav("errors_test", shuffled);
  };

  if (totalErrors === 0) {
    return (
      <div style={{ padding: "0 20px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <BackButton onClick={handleBack} />
        </div>
        <div style={{ ...CARD_HERO, textAlign: "center", padding: "44px 20px", border: "1px solid rgba(34,197,94,0.18)" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>{"\uD83C\uDF89"}</div>
          <div style={{ ...TYPE.h1, fontSize: 20, color: "#22c55e", marginBottom: 10 }}>Ошибок нет!</div>
          <div style={{ ...TYPE.bodySmall }}>Все вопросы отвечены правильно. Так держать!</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px 100px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <BackButton onClick={handleBack} />
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{totalErrors} {totalErrors === 1 ? "ошибка" : totalErrors < 5 ? "ошибки" : "ошибок"}</span>
      </div>

      <h1 style={{ ...TYPE.h1, fontSize: 20, margin: "0 0 18px" }}>Работа над ошибками</h1>

      {grouped.map(g => {
        const isOpen = expanded[g.su];
        return (
          <div key={g.su} style={{ ...CARD_COMPACT, padding: 0, marginBottom: 10, overflow: "hidden" }}>
            <div
              onClick={() => toggle(g.su)}
              style={{ display: "flex", alignItems: "center", padding: "14px 14px", cursor: "pointer" }}
            >
              <span style={{ fontSize: 20, marginRight: 11 }}>{g.meta.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{g.meta.name}</div>
                <div style={{ fontSize: 12, color: "#ef4444" }}>{g.items.length} {g.items.length === 1 ? "ошибка" : g.items.length < 5 ? "ошибки" : "ошибок"}</div>
              </div>
              <ChevronDown size={16} color="#64748b" style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }} />
            </div>
            {isOpen && (
              <div style={{ padding: "0 14px 14px" }}>
                {g.items.map((w, i) => (
                  <div key={i} style={{ background: "rgba(15,15,26,0.6)", borderRadius: 10, padding: "12px 12px", marginBottom: 6, borderLeft: "3px solid #ef4444" }}>
                    <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500, marginBottom: 5 }}>{w.q.q}</div>
                    <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <Check size={12} />{w.q.o[w.q.c]}
                    </div>
                    {w.q.e && <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.7, background: "rgba(14,165,233,0.04)", padding: "6px 8px", borderRadius: 7, display: "flex", gap: 5 }}>
                      <Lightbulb size={12} color="#0EA5E9" style={{ flexShrink: 0, marginTop: 2 }} /><span>{w.q.e}</span>
                    </div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={startRetry}
        style={{ width: "100%", padding: "15px", marginTop: 14, background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "#fff", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(239,68,68,0.25)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        <RotateCcw size={17} />Повторить ошибки ({totalErrors})
      </button>
    </div>
  );
}
