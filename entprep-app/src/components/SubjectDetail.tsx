import React, { useState, useEffect } from "react";
import { SUBS, ALL_PROFILES } from '../config/questionPools';
import { TOPIC_MAP, getTopicCount } from '../config/topics';
import { CARD_COMPACT, TYPE, COLORS, scoreColor } from '../constants/styles';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useNav } from '../contexts/NavigationContext';
import { useApp } from '../contexts/AppContext';
import { getPool } from '../utils/questionStore';
import { assembleProfileSection } from '../utils/questionAssembler';
import { PROFILE_BLOCKS } from '../config/ent';
import BackButton from './ui/BackButton';
import { ChevronRight, ChevronDown, Play, GraduationCap } from 'lucide-react';
import type { ProfileSubject, Question } from '../types';

interface SubjectDetailProps {
  sid: string;
}

export default function SubjectDetail({ sid }: SubjectDetailProps) {
  const { nav, goHome, setCustomQs, setCurSub, setScreen } = useNav();
  const { hist } = useApp();
  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';
  const sub = SUBS[sid] || ALL_PROFILES.find(p => p.id === sid);
  const profileSub = ALL_PROFILES.find(p => p.id === sid) as ProfileSubject | undefined;
  const hasExamMode = !!profileSub?.examCnt;
  const [examLoading, setExamLoading] = useState(false);
  const topics = TOPIC_MAP[sid];

  const [poolSize, setPoolSize] = useState(sub.pool);
  const [topicCounts, setTopicCounts] = useState<Record<string, number>>({});
  const [subtopicCounts, setSubtopicCounts] = useState<Record<string, number>>({});
  const [hasSubtopics, setHasSubtopics] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!topics) return;
    getPool(sid).then((pool: Question[]) => {
      setPoolSize(pool.length);
      const hasDbTopics = pool.some(q => q._topic);
      if (hasDbTopics) {
        const counts: Record<string, number> = {};
        for (const tp of topics) {
          counts[tp.id] = pool.filter(q => q._topic === tp.id).length;
        }
        setTopicCounts(counts);
      }
      // Subtopic counts — single pass
      const hasStp = pool.some(q => q._subtopic);
      setHasSubtopics(hasStp);
      if (hasStp) {
        const stCounts: Record<string, number> = {};
        for (const q of pool) {
          if (q._subtopic) {
            stCounts[q._subtopic] = (stCounts[q._subtopic] || 0) + 1;
          }
        }
        setSubtopicCounts(stCounts);
      }
    });
  }, [sid, topics]);

  const startExam = async () => {
    if (examLoading) return;
    setExamLoading(true);
    try {
      const qs = await assembleProfileSection(sid, PROFILE_BLOCKS, true);
      if (qs.length > 0) {
        setCustomQs(qs);
        setCurSub(sid);
        setScreen('test');
      }
    } finally {
      setExamLoading(false);
    }
  };

  if (!topics) { nav("test", sid); return null; }

  const subHist = hist.filter(t => t.su === sid);
  const lastFull = subHist.filter(t => !t.tp);
  const lastFullSc = lastFull.length ? lastFull[lastFull.length - 1].sc : null;

  const toggleSection = (tpId: string) => {
    setExpanded(prev => prev === tpId ? null : tpId);
  };

  const totalSubtopics = topics.reduce((sum, tp) => sum + (tp.subtopics?.length || 0), 0);

  return (
    <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
      <BackButton onClick={goHome} style={{ marginBottom: 14 }} />
      <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
        <div style={{ width: 50, height: 50, borderRadius: 15, background: sub.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{sub.icon}</div>
        <div style={{ marginLeft: 14 }}>
          <div style={{ ...TYPE.h2, fontSize: 18 }}>{sub.name}</div>
          <div style={{ ...TYPE.bodySmall }}>
            {poolSize} вопросов • {topics.length} разделов
            {hasSubtopics && totalSubtopics > topics.length && ` • ${totalSubtopics} тем`}
          </div>
        </div>
      </div>

      {/* Full test button */}
      <button onClick={() => nav("test", sid, null)} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", width: "100%", background: `linear-gradient(135deg,${sub.color}18,${sub.color}0a)`, border: `1px solid ${sub.color}33`, padding: "16px 14px", marginBottom: 18, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${sub.color}18` }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none" }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: sub.color + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Play size={18} color={sub.color} />
        </div>
        <div style={{ marginLeft: 12, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Полный тест</div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{sub.cnt} случайных вопросов из всех тем</div>
        </div>
        {lastFullSc !== null && <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", color: scoreColor(lastFullSc), marginRight: 8 }}>{lastFullSc}%</div>}
        <ChevronRight size={18} color={sub.color} />
      </button>

      {/* Exam mode button */}
      {hasExamMode && (
        <button onClick={startExam} disabled={examLoading} style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", width: "100%", background: "rgba(26,154,140,0.08)", border: "1px solid rgba(26,154,140,0.2)", padding: "16px 14px", marginBottom: 18, cursor: examLoading ? "wait" : "pointer", textAlign: "left", transition: "all 0.2s" }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(26,154,140,0.15)" }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: COLORS.teal, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <GraduationCap size={18} color="#fff" />
          </div>
          <div style={{ marginLeft: 12, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Экзамен ЕНТ</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>40 вопросов • 4 типа • 50 баллов</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, marginRight: 4 }}>
            <span style={{ fontSize: 9, color: COLORS.teal, fontWeight: 600 }}>25+5+5+5</span>
          </div>
          <ChevronRight size={18} color={COLORS.teal} />
        </button>
      )}

      {/* Topics / Sections */}
      <h3 style={{ ...TYPE.h3, margin: "0 0 12px" }}>
        {hasSubtopics ? 'Разделы' : 'Темы'}
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {topics.map(tp => {
          const cnt = topicCounts[tp.id] ?? getTopicCount(tp.ranges);
          const tpHist = subHist.filter(t => t.tp === tp.id);
          const lastSc = tpHist.length ? tpHist[tpHist.length - 1].sc : null;
          const subs = tp.subtopics || [];
          const isSingleSub = subs.length <= 1;
          const isExpanded = expanded === tp.id;
          const canExpand = hasSubtopics && !isSingleSub;

          return (
            <div key={tp.id} style={{ animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
              {/* Section row */}
              <div style={{ ...CARD_COMPACT, display: "flex", alignItems: "center", width: "100%", borderLeft: `3px solid ${sub.color}`, padding: "14px 14px", textAlign: "left", transition: "all 0.2s" }}>
                {/* Expand/collapse or icon area */}
                <div
                  onClick={canExpand ? () => toggleSection(tp.id) : () => nav("test", sid, tp.id)}
                  style={{ display: "flex", alignItems: "center", flex: 1, cursor: "pointer", gap: 11 }}
                >
                  <div style={{ width: 40, height: 40, borderRadius: 11, background: sub.color + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                    {tp.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{tp.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                      {cnt} вопросов
                      {canExpand && ` • ${subs.length} тем`}
                      {lastSc !== null && <span style={{ color: scoreColor(lastSc), fontWeight: 600 }}> • Посл: {lastSc}%</span>}
                    </div>
                  </div>
                </div>
                {/* Play button for section test */}
                {canExpand && (
                  <button
                    onClick={e => { e.stopPropagation(); nav("test", sid, tp.id); }}
                    style={{ width: 32, height: 32, borderRadius: 8, background: sub.color + "18", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, marginRight: 6, transition: "background 0.2s" }}
                    title={`Тест: ${tp.name}`}
                  >
                    <Play size={14} color={sub.color} />
                  </button>
                )}
                {/* Arrow */}
                <div
                  onClick={canExpand ? () => toggleSection(tp.id) : () => nav("test", sid, tp.id)}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", flexShrink: 0 }}
                >
                  {canExpand
                    ? <ChevronDown size={18} color={sub.color} style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }} />
                    : <ChevronRight size={16} color={sub.color} />
                  }
                </div>
              </div>

              {/* Subtopic rows (expanded) */}
              {canExpand && isExpanded && (
                <div style={{ marginLeft: 22, borderLeft: `2px solid ${sub.color}22`, marginTop: 2 }}>
                  {subs.map((st, idx) => {
                    const stCnt = subtopicCounts[st.id] || 0;
                    const stHist = subHist.filter(t => t.tp === st.id);
                    const stLastSc = stHist.length ? stHist[stHist.length - 1].sc : null;
                    const isLast = idx === subs.length - 1;
                    return (
                      <button
                        key={st.id}
                        onClick={() => nav("test", sid, st.id)}
                        style={{
                          display: "flex", alignItems: "center", width: "100%", padding: "10px 12px",
                          background: "var(--card-bg)", border: "none", borderBottom: isLast ? "none" : "1px solid var(--border)",
                          cursor: stCnt > 0 ? "pointer" : "default", textAlign: "left", transition: "background 0.15s",
                          opacity: stCnt > 0 ? 1 : 0.5, borderRadius: isLast ? "0 0 10px 10px" : 0,
                        }}
                        disabled={stCnt === 0}
                        onMouseEnter={e => { if (stCnt > 0) (e.currentTarget as HTMLElement).style.background = sub.color + "08"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--card-bg)"; }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: 3, background: sub.color + "55", marginRight: 10, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text)" }}>{st.name}</div>
                          <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                            {stCnt > 0 ? `${stCnt} вопросов` : 'нет вопросов'}
                            {stLastSc !== null && <span style={{ color: scoreColor(stLastSc), fontWeight: 600 }}> • {stLastSc}%</span>}
                          </div>
                        </div>
                        {stCnt > 0 && <ChevronRight size={14} color={sub.color + "88"} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
