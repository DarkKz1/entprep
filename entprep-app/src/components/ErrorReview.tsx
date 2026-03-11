import React, { useState, useEffect, useMemo } from "react";
import { SUBS, ALL_PROFILES } from '../config/questionPools';
import { resolveQuestion } from '../utils/questionStore';
import { getWrongQuestions } from '../utils/adaptiveHelpers';
import { shuffleOptions } from '../utils/questionHelpers';
import { CARD_COMPACT, CARD_HERO, TYPE, COLORS } from '../constants/styles';
import { useApp } from '../contexts/AppContext';
import { useNav } from '../contexts/NavigationContext';
import SkeletonCard from './ui/SkeletonCard';
import BackButton from './ui/BackButton';
import { ChevronDown, Check, Lightbulb, RotateCcw, ArrowUpDown } from 'lucide-react';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useT } from '../locales';
import Chip from './ui/Chip';
import Button from './ui/Button';
import type { Question, SubjectConfig } from '../types';
import { getSingleCorrect, getQType } from '../types';

function getMeta(sid: string): SubjectConfig {
  const s = SUBS[sid];
  if (s) return s;
  const p = ALL_PROFILES.find(x => x.id === sid);
  return p || { id: sid, name: sid, icon: "\ud83d\udcdd", color: "var(--text-secondary)", cnt: 0 };
}

interface WrongItem {
  su: string;
  oi: number;
}

interface ResolvedWrong extends WrongItem {
  q: Question;
}

interface GroupedSubject {
  su: string;
  meta: SubjectConfig;
  items: ResolvedWrong[];
}


export default function ErrorReview() {
  const bp = useBreakpoint(); const isDesktop = bp === 'desktop';
  const { hist, st } = useApp();
  const { navToErrorTest, setScreen, setTab } = useNav();
  const t = useT();
  const wrongs = useMemo(() => getWrongQuestions(hist), [hist]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [grouped, setGrouped] = useState<GroupedSubject[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortErrors, setSortErrors] = useState<"count" | "alpha">("count");

  const subjectName = (sid: string) => t.subjects[sid as keyof typeof t.subjects] || getMeta(sid).name;

  const handleBack = () => { setScreen('adaptive'); setTab('adaptive'); };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const m: Record<string, WrongItem[]> = {};
      for (const w of wrongs) {
        if (!m[w.su]) m[w.su] = [];
        m[w.su].push(w);
      }
      const groups: GroupedSubject[] = [];
      for (const [su, items] of Object.entries(m)) {
        const resolved = await Promise.all(
          items.map(async w => {
            const q = await resolveQuestion(w.su, w.oi, st.lang);
            return { ...w, q };
          })
        );
        const valid = resolved.filter((w): w is ResolvedWrong => w.q != null);
        if (valid.length > 0) {
          groups.push({ su, meta: getMeta(su), items: valid });
        }
      }
      if (!cancelled) { setGrouped(groups); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [wrongs]);

  if (loading) return (
    <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
      <div style={{ height: 18, width: 80, borderRadius: 9, background: 'var(--skeleton-bg)', marginBottom: 18 }} />
      {[0, 1, 2, 3].map(i => <SkeletonCard key={i} style={{ animationDelay: `${i * 0.1}s` }} />)}
    </div>
  );

  const totalErrors = grouped!.reduce((s, g) => s + g.items.length, 0);
  const errPlural = (n: number) => n === 1 ? t.errorReview.error1 : n < 5 ? t.errorReview.error2 : t.errorReview.error5;

  const toggle = (su: string) => setExpanded(p => ({ ...p, [su]: !p[su] }));

  const startRetry = () => {
    const questions: Question[] = [];
    for (const g of grouped!) {
      for (const w of g.items) {
        questions.push({ ...w.q, _oi: w.oi });
      }
    }
    const shuffled = questions.map(q => shuffleOptions(q));
    navToErrorTest(shuffled);
  };

  if (totalErrors === 0) {
    return (
      <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <BackButton onClick={handleBack} />
        </div>
        <div style={{ ...CARD_HERO, textAlign: "center", padding: "44px 20px", border: "1px solid rgba(34,197,94,0.18)" }}>
          <div style={{ fontSize: 52, marginBottom: 14 }}>{"\uD83C\uDF89"}</div>
          <div style={{ ...TYPE.h1, fontSize: 20, color: COLORS.green, marginBottom: 10 }}>{t.errorReview.noErrors}</div>
          <div style={{ ...TYPE.bodySmall }}>{t.errorReview.noErrorsDesc}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <BackButton onClick={handleBack} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{totalErrors} {errPlural(totalErrors)}</span>
      </div>

      <h1 style={{ ...TYPE.h1, fontSize: 20, margin: "0 0 12px" }}>{t.errorReview.title}</h1>

      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <Chip active={sortErrors === "count"} onClick={() => setSortErrors("count")} mode="subtle">
          <ArrowUpDown size={10} style={{ verticalAlign: "-1px", marginRight: 3 }} />{t.errorReview.byErrors}
        </Chip>
        <Chip active={sortErrors === "alpha"} onClick={() => setSortErrors("alpha")} mode="subtle">
          <ArrowUpDown size={10} style={{ verticalAlign: "-1px", marginRight: 3 }} />{t.errorReview.byAlphabet}
        </Chip>
      </div>

      {(sortErrors === "count" ? [...grouped!].sort((a, b) => b.items.length - a.items.length) : [...grouped!].sort((a, b) => subjectName(a.su).localeCompare(subjectName(b.su)))).map(g => {
        const isOpen = expanded[g.su];
        return (
          <div key={g.su} style={{ ...CARD_COMPACT, padding: 0, marginBottom: 10, overflow: "hidden" }}>
            <div
              onClick={() => toggle(g.su)}
              style={{ display: "flex", alignItems: "center", padding: "14px 14px", cursor: "pointer" }}
            >
              <span style={{ fontSize: 20, marginRight: 11 }}>{g.meta.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{subjectName(g.su)}</div>
                <div style={{ fontSize: 12, color: COLORS.red }}>{g.items.length} {errPlural(g.items.length)}</div>
              </div>
              <ChevronDown size={16} color="var(--text-muted)" style={{ transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }} />
            </div>
            {isOpen && (
              <div style={{ padding: "0 14px 14px" }}>
                {g.items.map((w, i) => (
                  <div key={i} style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "12px 12px", marginBottom: 6, borderLeft: `3px solid ${COLORS.red}` }}>
                    <div style={{ fontSize: 12, color: "var(--text-body)", fontWeight: 500, marginBottom: 5 }}>{w.q.q}</div>
                    <div style={{ fontSize: 11, color: COLORS.green, marginBottom: 4, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      <Check size={12} />
                      {getQType(w.q) === 'matching' && w.q.pairs
                        ? w.q.pairs.map(p => `${p[0]} → ${p[1]}`).join('; ')
                        : getQType(w.q) === 'multiple' && Array.isArray(w.q.c)
                          ? (w.q.c as number[]).map(idx => w.q.o[idx]).join(', ')
                          : w.q.o[getSingleCorrect(w.q)]}
                    </div>
                    {w.q.e && <div style={{ fontSize: 10, color: "var(--text-secondary)", lineHeight: 1.7, background: "rgba(26,154,140,0.04)", padding: "6px 8px", borderRadius: 7, display: "flex", gap: 5 }}>
                      <Lightbulb size={12} color={COLORS.teal} style={{ flexShrink: 0, marginTop: 2 }} /><span>{w.q.e}</span>
                    </div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Button variant="danger" size="lg" fullWidth Icon={RotateCcw} onClick={startRetry} style={{ marginTop: 28 }}>
        {t.errorReview.retryErrors} ({totalErrors})
      </Button>
    </div>
  );
}
