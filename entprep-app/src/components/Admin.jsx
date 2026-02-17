import React, { useState, useMemo } from "react";
import { SUBS, ALL_PROFILES } from '../config/questionPools.js';
import { getPool } from '../utils/questionStore.js';
import { TOPIC_MAP, getTopicQuestions } from '../config/topics.js';
import { SUBJECT_META } from '../config/subjects.js';
import { supabase } from '../config/supabase.js';
import { CARD_COMPACT, TYPE } from '../constants/styles.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useNav } from '../contexts/NavigationContext.jsx';
import BackButton from './ui/BackButton.jsx';
import { Lock, Bot, Check, X, RefreshCw } from 'lucide-react';

const ADMIN_EMAILS = ["dzakpelov@gmail.com", "monabekova2@gmail.com"];

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

export default function Admin() {
  const { user } = useAuth();
  const { goHome } = useNav();
  const [subject, setSubject] = useState("");
  const [topicId, setTopicId] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(0);
  const [saving, setSaving] = useState(false);

  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <Lock size={40} color="#ef4444" style={{ marginBottom: 14 }} />
        <div style={{ fontSize: 15, color: "#ef4444", fontWeight: 600 }}>Доступ запрещён</div>
        <BackButton onClick={goHome} style={{ marginTop: 18 }} />
      </div>
    );
  }

  const allSubjects = useMemo(() => {
    const mandatory = Object.entries(SUBS).map(([id, s]) => ({ id, name: s.name }));
    const profile = ALL_PROFILES.map(p => ({ id: p.id, name: p.name }));
    const ids = new Set();
    const result = [];
    [...mandatory, ...profile].forEach(s => {
      if (!ids.has(s.id) && s.id !== "reading") {
        ids.add(s.id);
        result.push(s);
      }
    });
    return result;
  }, []);

  const topics = subject && TOPIC_MAP[subject] ? TOPIC_MAP[subject] : [];

  const getSubjectName = (sid) => SUBJECT_META[sid]?.name || sid;

  const handleGenerate = async () => {
    if (!subject) { setError("Выберите предмет"); return; }
    setError("");
    setLoading(true);
    setGenerated(null);
    try {
      const pool = await getPool(subject);
      if (!pool || pool.length === 0) { setError("Нет вопросов в пуле"); setLoading(false); return; }
      let sourceQs = pool.map((q, i) => ({ ...q, _idx: i }));
      let topicName = "";
      if (topicId && TOPIC_MAP[subject]) {
        const topic = TOPIC_MAP[subject].find(t => t.id === topicId);
        if (topic) { sourceQs = getTopicQuestions(sourceQs, topic.ranges); topicName = topic.name; }
      }
      const examples = pickRandom(sourceQs, 5).map(q => ({ q: q.q, o: q.o, c: q.c, e: q.e }));
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) { setError("Не авторизован"); setLoading(false); return; }
      const res = await fetch("/api/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject: getSubjectName(subject), topic: topicName, examples }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Ошибка генерации"); setLoading(false); return; }
      setGenerated(data);
    } catch (err) {
      setError("Ошибка сети: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!generated || !supabase) return;
    setSaving(true);
    try {
      const topicName = topicId && TOPIC_MAP[subject]
        ? TOPIC_MAP[subject].find(t => t.id === topicId)?.name || null
        : null;
      const { error: dbErr } = await supabase.from("questions").insert({
        subject, topic: topicName, q: generated.q, o: generated.o, c: generated.c, e: generated.e,
      });
      if (dbErr) { setError("Ошибка сохранения: " + dbErr.message); setSaving(false); return; }
      setAccepted(a => a + 1);
      setGenerated(null);
    } catch (err) {
      setError("Ошибка: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => setGenerated(null);

  return (
    <div style={{ padding: "0 20px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <BackButton onClick={goHome} label="" style={{ background: "none", border: "none", padding: 4 }} />
        <h2 style={{ ...TYPE.h2 }}>Генератор вопросов</h2>
      </div>

      {accepted > 0 && (
        <div style={{ ...CARD_COMPACT, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Check size={17} color="#10B981" />
          <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>Добавлено за сессию: {accepted}</span>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 5, display: "block" }}>Предмет</label>
        <select
          value={subject}
          onChange={e => { setSubject(e.target.value); setTopicId(""); setGenerated(null); setError(""); }}
          style={{ width: "100%", padding: "12px 14px", background: "rgba(30,30,50,0.55)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 13, appearance: "none", cursor: "pointer" }}
        >
          <option value="">Выберите предмет...</option>
          {allSubjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
        </select>
      </div>

      {topics.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, marginBottom: 5, display: "block" }}>Тема (необязательно)</label>
          <select
            value={topicId}
            onChange={e => { setTopicId(e.target.value); setGenerated(null); setError(""); }}
            style={{ width: "100%", padding: "12px 14px", background: "rgba(30,30,50,0.55)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#fff", fontSize: 13, appearance: "none", cursor: "pointer" }}
          >
            <option value="">Все темы</option>
            {topics.map(t => (<option key={t.id} value={t.id}>{t.icon} {t.name}</option>))}
          </select>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={loading || !subject}
        style={{
          width: "100%", padding: "14px", marginTop: 6, marginBottom: 14,
          background: loading ? "rgba(255,107,53,0.3)" : "linear-gradient(135deg,#FF6B35,#e55a2b)",
          border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 700,
          cursor: loading ? "wait" : "pointer", opacity: !subject ? 0.4 : 1, transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <Bot size={17} />{loading ? "Генерация..." : "Сгенерировать вопрос"}
      </button>

      {error && (
        <div style={{ ...CARD_COMPACT, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", padding: "11px 14px", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span>
        </div>
      )}

      {generated && (
        <div style={{ ...CARD_COMPACT, padding: 0, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ padding: "16px 16px 12px" }}>
            <div style={{ ...TYPE.label, fontSize: 9, marginBottom: 8 }}>Сгенерированный вопрос</div>
            <div style={{ fontSize: 14, color: "#fff", lineHeight: 1.5 }}>{generated.q}</div>
          </div>
          <div style={{ padding: "0 16px 12px" }}>
            {generated.o.map((opt, i) => (
              <div key={i} style={{
                padding: "11px 13px", marginBottom: 5, borderRadius: 10,
                background: i === generated.c ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)",
                border: i === generated.c ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.05)",
                display: "flex", alignItems: "flex-start", gap: 8
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: i === generated.c ? "#10B981" : "#64748b", minWidth: 18 }}>
                  {String.fromCharCode(65 + i)})
                </span>
                <span style={{ fontSize: 13, color: i === generated.c ? "#10B981" : "#e2e8f0", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 4 }}>
                  {opt} {i === generated.c && <Check size={12} />}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: "0 16px 16px" }}>
            <div style={{ ...CARD_COMPACT, background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.12)", padding: "11px 13px" }}>
              <div style={{ fontSize: 11, color: "#0EA5E9", fontWeight: 600, marginBottom: 4 }}>Объяснение</div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5 }}>{generated.e}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, padding: "0 16px 16px" }}>
            <button onClick={handleAccept} disabled={saving} style={{ flex: 1, padding: "12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, color: "#10B981", fontSize: 12, fontWeight: 700, cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <Check size={14} />{saving ? "..." : "Принять"}
            </button>
            <button onClick={handleSkip} style={{ flex: 1, padding: "12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 10, color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <X size={14} />Пропустить
            </button>
            <button onClick={handleGenerate} disabled={loading} style={{ flex: 1, padding: "12px", background: "rgba(14,165,233,0.06)", border: "1px solid rgba(14,165,233,0.18)", borderRadius: 10, color: "#0EA5E9", fontSize: 12, fontWeight: 700, cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <RefreshCw size={14} />{loading ? "..." : "Ещё"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
