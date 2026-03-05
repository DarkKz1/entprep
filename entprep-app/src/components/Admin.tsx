import React, { useState, useMemo, useEffect, useCallback } from "react";
import { SUBS, ALL_PROFILES } from '../config/questionPools';
import { getPool } from '../utils/questionStore';
import { TOPIC_MAP, getTopicQuestions } from '../config/topics';
import { SUBJECT_META } from '../config/subjects';
import { supabase } from '../config/supabase';
import { CARD_COMPACT, TYPE } from '../constants/styles';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useAuth } from '../contexts/AuthContext';
import { useNav } from '../contexts/NavigationContext';
import { useToast } from '../contexts/ToastContext';
import BackButton from './ui/BackButton';
import BottomSheet from './ui/BottomSheet';
import LoadingSpinner from './ui/LoadingSpinner';
import { Lock, Bot, Check, X, RefreshCw, Flag, Trash2, Edit3, Save, XCircle, Crown } from 'lucide-react';
import type { Question } from '../types';

// All admin write operations go through Netlify function (service key, bypasses RLS)
async function adminAction(action: string, payload: Record<string, unknown> = {}): Promise<{ ok?: boolean; data?: unknown; error?: string }> {
  const session = await supabase?.auth.getSession();
  const token = session?.data.session?.access_token;
  if (!token) return { error: 'Не авторизован' };
  const res = await fetch('/api/admin-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

import { ADMIN_EMAILS } from '../config/app';

const REASON_LABELS: Record<string, string> = {
  wrong_answer: 'Неправильный ответ',
  bad_question: 'Плохой текст',
  bad_explanation: 'Плохое объяснение',
  other: 'Другое',
};

interface GeneratedQuestion {
  q: string;
  o: string[];
  c: number;
  e: string;
}

interface ReportedQuestion {
  id: number;
  subject: string;
  idx: number;
  topic: string | null;
  q: string;
  o: string[];
  c: number;
  e: string;
  report_count: number;
}

interface QuestionReport {
  id: number;
  reason: string;
  created_at: string;
  user_id: string;
}

interface EditingState {
  q: string;
  o: string[];
  c: number;
  e: string;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
}

function validateQuestion({ q, o, c, e }: { q: string; o: string[]; c: number | null | undefined; e: string }): string[] {
  const errors: string[] = [];
  if (!q || q.trim().length < 10) errors.push('Вопрос слишком короткий (мин. 10 символов)');
  if (!o || o.length !== 4) errors.push('Должно быть ровно 4 варианта');
  else {
    o.forEach((opt, i) => {
      if (!opt || opt.trim().length < 1) errors.push(`Вариант ${String.fromCharCode(65 + i)} пустой`);
    });
    const trimmed = o.map(x => x.trim().toLowerCase());
    const unique = new Set(trimmed);
    if (unique.size !== trimmed.length) errors.push('Варианты ответов не должны повторяться');
  }
  if (c === undefined || c === null || c < 0 || c > 3) errors.push('Не выбран правильный ответ');
  if (!e || e.trim().length < 10) errors.push('Объяснение слишком короткое (мин. 10 символов)');
  return errors;
}

export default function Admin() {
  const { user } = useAuth();
  const { goHome } = useNav();
  const toast = useToast();
  const bp = useBreakpoint();
  const [activeTab, setActiveTab] = useState("generator");

  // Generator state
  const [subject, setSubject] = useState("");
  const [topicId, setTopicId] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQuestion | null>(null);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(0);
  const [saving, setSaving] = useState(false);

  // Quality state
  const [reportedQs, setReportedQs] = useState<ReportedQuestion[]>([]);
  const [qualityLoading, setQualityLoading] = useState(false);
  const [selectedQ, setSelectedQ] = useState<ReportedQuestion | null>(null);
  const [qReports, setQReports] = useState<QuestionReport[]>([]);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const allSubjects = useMemo(() => {
    const mandatory = Object.entries(SUBS).map(([id, s]) => ({ id, name: s.name }));
    const profile = ALL_PROFILES.map(p => ({ id: p.id, name: p.name }));
    const ids = new Set<string>();
    const result: { id: string; name: string }[] = [];
    [...mandatory, ...profile].forEach(s => {
      if (!ids.has(s.id) && s.id !== "reading") {
        ids.add(s.id);
        result.push(s);
      }
    });
    return result;
  }, []);

  const topics = subject && TOPIC_MAP[subject] ? TOPIC_MAP[subject]! : [];
  const getSubjectName = (sid: string) => SUBJECT_META[sid]?.name || sid;

  // ── Generator handlers ─────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!subject) { setError("Выберите предмет"); return; }
    setError("");
    setLoading(true);
    setGenerated(null);
    try {
      const pool = await getPool(subject);
      if (!pool || pool.length === 0) { setError("Нет вопросов в пуле"); setLoading(false); return; }
      let sourceQs: (Question & { _idx: number })[] = pool.map((q, i) => ({ ...q, _idx: i }));
      let topicName = "";
      if (topicId && TOPIC_MAP[subject]) {
        const topic = TOPIC_MAP[subject]!.find(t => t.id === topicId);
        if (topic) { sourceQs = getTopicQuestions(sourceQs, topic.ranges) as (Question & { _idx: number })[]; topicName = topic.name; }
      }
      // Filter to single-type questions only (matching/multiple have different format)
      const singleQs = sourceQs.filter(q => !q.type || q.type === 'single');
      const exPool = singleQs.length >= 3 ? singleQs : sourceQs;
      const examples = pickRandom(exPool, 5).map(q => ({ q: q.q, o: q.o, c: typeof q.c === 'number' ? q.c : 0, e: q.e }));
      const session = await supabase!.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) { setError("Не авторизован"); setLoading(false); return; }
      const res = await fetch("/api/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, topic: topicName, examples }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setError((err as Record<string, string>).error || "Ошибка генерации"); setLoading(false); return; }
      const data = await res.json();
      setGenerated(data);
    } catch (err) {
      setError("Ошибка сети: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!generated) return;
    const vErrors = validateQuestion(generated);
    if (vErrors.length > 0) { setError(vErrors.join('; ')); return; }
    setSaving(true);
    try {
      const topicName = topicId && TOPIC_MAP[subject]
        ? TOPIC_MAP[subject]!.find(t => t.id === topicId)?.name || null
        : null;
      await adminAction('insert_question', {
        subject, topic: topicName, q: generated.q, o: generated.o, c: generated.c, e: generated.e,
      });
      setAccepted(a => a + 1);
      setGenerated(null);
      toast.success('Вопрос добавлен в базу');
    } catch (err) {
      setError("Ошибка: " + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => setGenerated(null);

  // ── Quality handlers ───────────────────────────────────────────────────────

  const loadReportedQuestions = async () => {
    setQualityLoading(true);
    try {
      const result = await adminAction('load_reports');
      setReportedQs((result.data as ReportedQuestion[]) || []);
    } catch (err) {
      console.error('Load reported questions error:', err);
      toast.error('Не удалось загрузить жалобы', { action: loadReportedQuestions, actionLabel: 'Повторить' });
    }
    setQualityLoading(false);
  };

  const openQuestion = async (q: ReportedQuestion) => {
    setSelectedQ(q);
    setEditing(null);
    try {
      const result = await adminAction('get_reports', { question_id: q.id });
      setQReports((result.data as QuestionReport[]) || []);
    } catch { setQReports([]); }
  };

  const startEditing = () => {
    if (!selectedQ) return;
    setEditing({
      q: selectedQ.q,
      o: [...selectedQ.o],
      c: selectedQ.c,
      e: selectedQ.e,
    });
  };

  // Premium activation state
  const [premiumEmail, setPremiumEmail] = useState('');
  const [premiumPlan, setPremiumPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [premiumLoading, setPremiumLoading] = useState(false);

  const [editError, setEditError] = useState("");

  const saveEdit = async () => {
    if (!editing || !selectedQ) return;
    const vErrors = validateQuestion(editing);
    if (vErrors.length > 0) { setEditError(vErrors.join('; ')); return; }
    setEditError("");
    setEditSaving(true);
    try {
      await adminAction('update_question', {
        id: selectedQ.id, q: editing.q, o: editing.o, c: editing.c, e: editing.e,
      });
      setSelectedQ(prev => prev ? { ...prev, ...editing } : prev);
      setReportedQs(prev => prev.map(r => r.id === selectedQ.id ? { ...r, ...editing } : r));
      setEditing(null);
      toast.success('Вопрос сохранён');
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Не удалось сохранить изменения');
    }
    setEditSaving(false);
  };

  const deleteQuestion = async () => {
    if (!selectedQ || !confirm('Удалить вопрос навсегда?')) return;
    try {
      await adminAction('delete_question', { id: selectedQ.id });
      setReportedQs(prev => prev.filter(r => r.id !== selectedQ.id));
      setSelectedQ(null);
      toast.success('Вопрос удалён');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Не удалось удалить вопрос');
    }
  };

  const dismissReports = async () => {
    if (!selectedQ) return;
    try {
      await adminAction('dismiss_reports', { question_id: selectedQ.id });
      setReportedQs(prev => prev.filter(r => r.id !== selectedQ.id));
      setSelectedQ(null);
      toast.info('Жалобы отклонены');
    } catch (err) {
      console.error('Dismiss error:', err);
      toast.error('Не удалось отклонить жалобы');
    }
  };

  const handleActivatePremium = async () => {
    const email = premiumEmail.trim();
    if (!email || !email.includes('@')) { toast.error('Введите корректный email'); return; }
    setPremiumLoading(true);
    try {
      const result = await adminAction('activate_premium', { email, plan: premiumPlan });
      const until = (result as Record<string, unknown>).premium_until as string;
      toast.success(`Premium активирован до ${new Date(until).toLocaleDateString('ru-RU')}`);
      setPremiumEmail('');
    } catch (err) {
      toast.error('Ошибка: ' + (err as Error).message);
    }
    setPremiumLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'quality') loadReportedQuestions();
  }, [activeTab]);

  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <Lock size={40} color="#ef4444" style={{ marginBottom: 14 }} />
        <div style={{ fontSize: 15, color: "#ef4444", fontWeight: 600 }}>Доступ запрещён</div>
        <BackButton onClick={goHome} style={{ marginTop: 18 }} />
      </div>
    );
  }

  // ── Tab styles ─────────────────────────────────────────────────────────────

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '11px', background: active ? 'rgba(255,107,53,0.12)' : 'transparent',
    border: active ? '1px solid rgba(255,107,53,0.25)' : '1px solid var(--border-light)',
    borderRadius: 10, color: active ? '#FF6B35' : 'var(--text-muted)', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'all 0.2s',
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: `0 var(--content-padding) 40px` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <BackButton onClick={goHome} label="" style={{ background: "none", border: "none", padding: 4 }} />
        <h2 style={{ ...TYPE.h2 }}>Админ-панель</h2>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => setActiveTab('generator')} style={tabStyle(activeTab === 'generator')}>
          <Bot size={14} />Генератор
        </button>
        <button onClick={() => setActiveTab('quality')} style={tabStyle(activeTab === 'quality')}>
          <Flag size={14} />Качество
        </button>
        <button onClick={() => setActiveTab('premium')} style={tabStyle(activeTab === 'premium')}>
          <Crown size={14} />Premium
        </button>
      </div>

      {/* ── Generator Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'generator' && <>
        {accepted > 0 && (
          <div style={{ ...CARD_COMPACT, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.18)", padding: "12px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <Check size={17} color="#10B981" />
            <span style={{ fontSize: 12, color: "#10B981", fontWeight: 600 }}>Добавлено за сессию: {accepted}</span>
          </div>
        )}

        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 5, display: "block" }}>Предмет</label>
          <select
            value={subject}
            onChange={e => { setSubject(e.target.value); setTopicId(""); setGenerated(null); setError(""); }}
            style={{ width: "100%", padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 13, appearance: "none", cursor: "pointer" }}
          >
            <option value="">Выберите предмет...</option>
            {allSubjects.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select>
        </div>

        {topics.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 5, display: "block" }}>Тема (необязательно)</label>
            <select
              value={topicId}
              onChange={e => { setTopicId(e.target.value); setGenerated(null); setError(""); }}
              style={{ width: "100%", padding: "12px 14px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text)", fontSize: 13, appearance: "none", cursor: "pointer" }}
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
            border: "none", borderRadius: 12, color: "var(--text)", fontSize: 14, fontWeight: 700,
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
              <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>{generated.q}</div>
            </div>
            <div style={{ padding: "0 16px 12px" }}>
              {generated.o.map((opt, i) => (
                <div key={i} style={{
                  padding: "11px 13px", marginBottom: 5, borderRadius: 10,
                  background: i === generated.c ? "rgba(16,185,129,0.1)" : "var(--bg-option)",
                  border: i === generated.c ? "1px solid rgba(16,185,129,0.25)" : "1px solid var(--bg-subtle)",
                  display: "flex", alignItems: "flex-start", gap: 8
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: i === generated.c ? "#10B981" : "var(--text-muted)", minWidth: 18 }}>
                    {String.fromCharCode(65 + i)})
                  </span>
                  <span style={{ fontSize: 13, color: i === generated.c ? "#10B981" : "var(--text-body)", lineHeight: 1.4, display: "flex", alignItems: "center", gap: 4 }}>
                    {opt} {i === generated.c && <Check size={12} />}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ ...CARD_COMPACT, background: "rgba(26,154,140,0.05)", border: "1px solid rgba(26,154,140,0.12)", padding: "11px 13px" }}>
                <div style={{ fontSize: 11, color: "#1A9A8C", fontWeight: 600, marginBottom: 4 }}>Объяснение</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{generated.e}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 7, padding: "0 16px 16px" }}>
              <button onClick={handleAccept} disabled={saving} style={{ flex: 1, padding: "12px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 10, color: "#10B981", fontSize: 12, fontWeight: 700, cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <Check size={14} />{saving ? "..." : "Принять"}
              </button>
              <button onClick={handleSkip} style={{ flex: 1, padding: "12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 10, color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <X size={14} />Пропустить
              </button>
              <button onClick={handleGenerate} disabled={loading} style={{ flex: 1, padding: "12px", background: "rgba(26,154,140,0.06)", border: "1px solid rgba(26,154,140,0.18)", borderRadius: 10, color: "#1A9A8C", fontSize: 12, fontWeight: 700, cursor: loading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <RefreshCw size={14} />{loading ? "..." : "Ещё"}
              </button>
            </div>
          </div>
        )}
      </>}

      {/* ── Quality Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'quality' && <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Вопросы с жалобами ({reportedQs.length})</span>
          <button onClick={loadReportedQuestions} disabled={qualityLoading}
            style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: 'var(--text-muted)' }}>
            <RefreshCw size={14} style={qualityLoading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
        </div>

        {qualityLoading && <LoadingSpinner text="Загрузка..." />}

        {!qualityLoading && reportedQs.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <Flag size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
            <div style={{ fontSize: 13 }}>Жалоб пока нет</div>
          </div>
        )}

        {!qualityLoading && reportedQs.map(q => (
          <button key={q.id} onClick={() => openQuestion(q)}
            style={{
              ...CARD_COMPACT, width: '100%', padding: '12px 14px', marginBottom: 6,
              textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 10,
              borderLeft: `3px solid ${q.report_count >= 3 ? '#ef4444' : q.report_count >= 2 ? '#eab308' : 'var(--text-muted)'}`,
            }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
                {getSubjectName(q.subject)} #{q.idx}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-body)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.q}
              </div>
            </div>
            <div style={{
              background: q.report_count >= 3 ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.1)',
              border: `1px solid ${q.report_count >= 3 ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.2)'}`,
              borderRadius: 8, padding: '4px 8px', fontSize: 11, fontWeight: 707, flexShrink: 0,
              color: q.report_count >= 3 ? '#ef4444' : '#eab308',
            }}>
              {q.report_count}
            </div>
          </button>
        ))}

        {/* Question Detail BottomSheet */}
        <BottomSheet visible={selectedQ !== null} onClose={() => { setSelectedQ(null); setEditing(null); }}>
          {selectedQ && !editing && <>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
              {getSubjectName(selectedQ.subject)} #{selectedQ.idx} {selectedQ.topic && `• ${selectedQ.topic}`}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, lineHeight: 1.5, marginBottom: 12 }}>
              {selectedQ.q}
            </div>

            {/* Options */}
            {selectedQ.o.map((opt, i) => (
              <div key={i} style={{
                padding: '9px 12px', marginBottom: 4, borderRadius: 8, fontSize: 12,
                background: i === selectedQ.c ? 'rgba(34,197,94,0.1)' : 'var(--bg-option)',
                border: i === selectedQ.c ? '1px solid rgba(34,197,94,0.25)' : '1px solid var(--bg-subtle)',
                color: i === selectedQ.c ? '#22c55e' : 'var(--text-body)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontWeight: 700, minWidth: 16, color: i === selectedQ.c ? '#22c55e' : 'var(--text-muted)' }}>
                  {String.fromCharCode(65 + i)})
                </span>
                {opt}
                {i === selectedQ.c && <Check size={12} style={{ marginLeft: 'auto' }} />}
              </div>
            ))}

            {/* Explanation */}
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: 10, padding: '8px 10px', background: 'rgba(26,154,140,0.05)', borderRadius: 8, border: '1px solid rgba(26,154,140,0.1)' }}>
              {selectedQ.e}
            </div>

            {/* Reports */}
            {qReports.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Жалобы ({qReports.length})
                </div>
                {qReports.map(r => (
                  <div key={r.id} style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '6px 0', borderBottom: '1px solid var(--bg-subtle)', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-body)' }}>{REASON_LABELS[r.reason] || r.reason}</span>
                    <span>{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={startEditing}
                style={{ flex: 1, padding: '12px', background: 'rgba(26,154,140,0.08)', border: '1px solid rgba(26,154,140,0.2)', borderRadius: 10, color: '#1A9A8C', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Edit3 size={13} />Редактировать
              </button>
              <button onClick={deleteQuestion}
                style={{ flex: 1, padding: '12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 10, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Trash2 size={13} />Удалить
              </button>
            </div>
            <button onClick={dismissReports}
              style={{ width: '100%', padding: '12px', marginTop: 8, background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', borderRadius: 10, color: '#eab308', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <XCircle size={13} />Отклонить жалобы
            </button>
          </>}

          {/* Editing mode */}
          {selectedQ && editing && <>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#1A9A8C', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Edit3 size={14} />Редактирование
            </div>

            <label style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3, display: 'block' }}>Вопрос</label>
            <textarea value={editing.q} onChange={e => { setEditing(p => p ? { ...p, q: e.target.value } : p); setEditError(""); }}
              style={{ width: '100%', padding: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-md)', borderRadius: 8, color: 'var(--text)', fontSize: 12, lineHeight: 1.5, resize: 'vertical', minHeight: 60, marginBottom: 8, fontFamily: 'inherit' }} />

            {editing.o.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <button onClick={() => setEditing(p => p ? { ...p, c: i } : p)}
                  style={{ width: 26, height: 26, borderRadius: 13, border: `2px solid ${i === editing.c ? '#22c55e' : 'var(--text-muted)'}`, background: i === editing.c ? 'rgba(34,197,94,0.15)' : 'transparent', color: i === editing.c ? '#22c55e' : 'var(--text-muted)', fontSize: 10, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {i === editing.c ? <Check size={12} /> : String.fromCharCode(65 + i)}
                </button>
                <input value={opt} onChange={e => { const o = [...editing.o]; o[i] = e.target.value; setEditing(p => p ? { ...p, o } : p); setEditError(""); }}
                  style={{ flex: 1, padding: '8px 10px', background: 'var(--bg-subtle)', border: `1px solid ${i === editing.c ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`, borderRadius: 8, color: 'var(--text)', fontSize: 12, fontFamily: 'inherit' }} />
              </div>
            ))}

            <label style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, marginBottom: 3, display: 'block' }}>Объяснение</label>
            <textarea value={editing.e} onChange={e => { setEditing(p => p ? { ...p, e: e.target.value } : p); setEditError(""); }}
              style={{ width: '100%', padding: '10px', background: 'var(--bg-subtle)', border: '1px solid var(--border-md)', borderRadius: 8, color: 'var(--text)', fontSize: 12, lineHeight: 1.5, resize: 'vertical', minHeight: 50, marginBottom: 10, fontFamily: 'inherit' }} />

            {editError && (
              <div style={{ ...CARD_COMPACT, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)', padding: '9px 12px', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: '#ef4444' }}>{editError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveEdit} disabled={editSaving}
                style={{ flex: 1, padding: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10, color: '#22c55e', fontSize: 12, fontWeight: 700, cursor: editSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <Save size={13} />{editSaving ? '...' : 'Сохранить'}
              </button>
              <button onClick={() => setEditing(null)}
                style={{ flex: 1, padding: '12px', background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                <X size={13} />Отмена
              </button>
            </div>
          </>}
        </BottomSheet>
      </>}

      {/* ── Premium Tab ────────────────────────────────────────────────── */}
      {activeTab === 'premium' && <>
        <div style={{ ...CARD_COMPACT, padding: '16px', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Crown size={16} color="#FF6B35" />Активировать Premium
          </div>

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 5, display: 'block' }}>Email пользователя</label>
            <input
              type="email"
              value={premiumEmail}
              onChange={e => setPremiumEmail(e.target.value)}
              placeholder="user@example.com"
              style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 13, fontFamily: "'JetBrains Mono',monospace", boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 5, display: 'block' }}>Тариф</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['monthly', 'yearly'] as const).map(p => (
                <button key={p} onClick={() => setPremiumPlan(p)} style={{
                  flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
                  background: premiumPlan === p ? 'rgba(255,107,53,0.1)' : 'transparent',
                  border: premiumPlan === p ? '1.5px solid rgba(255,107,53,0.3)' : '1px solid var(--border)',
                  color: premiumPlan === p ? '#FF6B35' : 'var(--text-secondary)',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                }}>
                  {p === 'monthly' ? '1990₸/мес' : '4990₸/год'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleActivatePremium}
            disabled={premiumLoading || !premiumEmail.trim()}
            style={{
              width: '100%', padding: '13px',
              background: premiumEmail.trim() ? 'linear-gradient(135deg,#FF6B35,#e55a2b)' : 'rgba(255,107,53,0.2)',
              border: 'none', borderRadius: 12, color: 'var(--text)', fontSize: 13, fontWeight: 700,
              cursor: premiumLoading ? 'wait' : 'pointer', opacity: !premiumEmail.trim() ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.2s',
            }}
          >
            <Crown size={15} />{premiumLoading ? 'Активация...' : 'Активировать'}
          </button>
        </div>
      </>}

    </div>
  );
}
