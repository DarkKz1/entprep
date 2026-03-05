import React, { useState, useMemo } from 'react';
import { UNIS } from '../data/universities';
import { CARD_COMPACT, TYPE, COLORS } from '../constants/styles';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { useNav } from '../contexts/NavigationContext';
import BackButton from './ui/BackButton';
import Chip from './ui/Chip';
import EmptyState from './ui/EmptyState';
import { Calculator, MapPin, Filter, Search } from 'lucide-react';
import { useT } from '../locales';
import type { University } from '../types';

type Chance = 'high' | 'mid' | 'low';
type UniType = University['tp'] | 'all';

const CITIES = useMemoHelper();

function useMemoHelper(): string[] {
  const set = new Set<string>();
  UNIS.forEach(u => set.add(u.c));
  return Array.from(set);
}

export default function Calc() {
  const { goHome } = useNav();
  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';
  const t = useT();
  const [sc, setSc] = useState(80);
  const [city, setCity] = useState("all");
  const [tp, setTp] = useState<UniType>("all");

  const typeLabels: Record<UniType, string> = {
    all: t.calc.filterAll, national: t.calc.filterNational, medical: t.calc.filterMedical,
    pedagogical: t.calc.filterPedagogical, technical: t.calc.filterTechnical, it: t.calc.filterIT,
    agro: t.calc.filterAgro, other: t.calc.filterOther,
  };

  const filtered = useMemo(() =>
    UNIS
      .filter(u => (city === "all" || u.c === city) && (tp === "all" || u.tp === tp))
      .map(u => {
        const gap = sc - u.min;
        const chance: Chance = gap >= 10 ? 'high' : gap >= 0 ? 'mid' : 'low';
        return { ...u, gap, chance };
      })
      .sort((a, b) => {
        const ord = { high: 0, mid: 1, low: 2 };
        if (ord[a.chance] !== ord[b.chance]) return ord[a.chance] - ord[b.chance];
        return a.min - b.min;
      }),
    [sc, city, tp]
  );

  const high = filtered.filter(u => u.chance === "high").length;
  const mid = filtered.filter(u => u.chance === "mid").length;
  const low = filtered.filter(u => u.chance === "low").length;
  const pct = Math.round((sc - 50) / 90 * 100);
  const sliderColor = pct < 33 ? COLORS.red : pct < 66 ? COLORS.yellow : COLORS.green;
  const chanceColor: Record<Chance, string> = { high: COLORS.green, mid: COLORS.yellow, low: COLORS.red };
  const chanceTxt: Record<Chance, string> = { high: t.calc.highChance, mid: t.calc.midChance, low: t.calc.lowChance };


  return (
    <div style={{ padding: `0 var(--content-padding) ${isDesktop ? 40 : 100}px` }}>
      <BackButton onClick={goHome} style={{ marginBottom: 14 }} />

      {/* Hero */}
      <div style={{ ...CARD_COMPACT, position: "relative", background: "linear-gradient(135deg,rgba(26,154,140,0.1),rgba(26,154,140,0.06))", padding: "20px 16px", marginBottom: 28, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(26,154,140,0.08)", filter: "blur(20px)" }} />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", marginBottom: 5 }}>
            <Calculator size={15} />{t.calc.title}
          </div>
          <div style={{ ...TYPE.h2 }}>{t.calc.subtitle}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{UNIS.length} {t.calc.unisAcross}</div>
        </div>
      </div>

      {/* Score slider */}
      <div style={{ ...CARD_COMPACT, padding: "18px 16px", marginBottom: 20 }}>
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 3 }}>{t.calc.yourScore}</div>
          <div style={{ fontSize: 36, fontWeight: 800, color: sliderColor, fontFamily: "'Unbounded',sans-serif", lineHeight: 1 }}>{sc}</div>
          <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{t.calc.outOf}</div>
        </div>
        <input type="range" min={50} max={140} value={sc} onChange={e => setSc(+e.target.value)} style={{ width: "100%", height: 6, borderRadius: 3, background: `linear-gradient(90deg,${sliderColor} ${pct}%,var(--border) 0)`, appearance: "none", outline: "none", cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 5 }}><span>50</span><span>100</span><span>140</span></div>
      </div>

      {/* City filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: bp === 'mobile' ? "auto" : undefined, flexWrap: bp === 'mobile' ? undefined : "wrap", paddingBottom: 4 }}>
        <Chip active={city === "all"} onClick={() => setCity("all")}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {t.calc.filterAll}</span>
        </Chip>
        {CITIES.map(c => (
          <Chip key={c} active={city === c} onClick={() => setCity(c)}>{c}</Chip>
        ))}
      </div>

      {/* Type filter */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: bp === 'mobile' ? "auto" : undefined, flexWrap: bp === 'mobile' ? undefined : "wrap", paddingBottom: 4 }}>
        {(Object.keys(typeLabels) as UniType[]).map(k => (
          <Chip key={k} active={tp === k} onClick={() => setTp(k)}>
            {k === "all" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Filter size={12} /> {t.calc.filterAll}</span> : typeLabels[k]}
          </Chip>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
        <div style={{ ...CARD_COMPACT, padding: "12px 8px", textAlign: "center", border: "1px solid rgba(34,197,94,0.12)" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.green, fontFamily: "'Unbounded',sans-serif" }}>{high}</div>
          <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 2 }}>{t.calc.highChance}</div>
        </div>
        <div style={{ ...CARD_COMPACT, padding: "12px 8px", textAlign: "center", border: "1px solid rgba(234,179,8,0.12)" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.yellow, fontFamily: "'Unbounded',sans-serif" }}>{mid}</div>
          <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 2 }}>{t.calc.midChance}</div>
        </div>
        <div style={{ ...CARD_COMPACT, padding: "12px 8px", textAlign: "center", border: "1px solid rgba(239,68,68,0.12)" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.red, fontFamily: "'Unbounded',sans-serif" }}>{low}</div>
          <div style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 2 }}>{t.calc.lowChance}</div>
        </div>
      </div>

      {/* Results count */}
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
        {t.calc.found} {filtered.length} {filtered.length === 1 ? t.calc.uni1 : filtered.length < 5 ? t.calc.uni2 : t.calc.uni5}
      </div>

      {/* University list */}
      <div style={{ display: "grid", gridTemplateColumns: bp === 'mobile' ? '1fr' : bp === 'tablet' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 8 }}>
      {filtered.map((u, i) => {
        const clr = chanceColor[u.chance];
        const prog = Math.min(100, Math.round(sc / u.min * 100));
        const isLow = u.chance === "low";
        return (
          <div key={i} style={{ ...CARD_COMPACT, padding: "14px 14px 14px 16px", borderLeft: `3px solid ${clr}`, opacity: isLow ? 0.7 : 1, transition: "all 0.2s" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
              <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <span style={{ fontSize: 22, marginRight: 9 }}>{u.i}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isLow ? "var(--text-secondary)" : "var(--text)" }}>{u.n}</div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{u.c} • {t.calc.minScore} {u.min}</div>
                </div>
              </div>
              <div style={{ background: `${clr}12`, border: `1px solid ${clr}25`, borderRadius: 9, padding: "4px 9px", flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: clr, whiteSpace: "nowrap" }}>{isLow ? `\u2212${Math.abs(u.gap)} ${t.home.pointsShort}` : chanceTxt[u.chance]}</div>
              </div>
            </div>
            <div style={{ background: "var(--bg-subtle-2)", borderRadius: 4, height: 4, marginBottom: 7, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 4, width: `${prog}%`, background: clr, transition: "width 0.3s" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", flex: 1 }}>{u.sp}</div>
              <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'JetBrains Mono',monospace" }}>{sc}/{u.min}</div>
            </div>
            <div style={{ fontSize: 9, color: "var(--text-dim)", marginTop: 4 }}>{u.inf}</div>
          </div>
        );
      })}
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={Search} title={t.calc.noResults} />
      )}
    </div>
  );
}
