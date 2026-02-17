const COLORS = {
  bg: "#0f0f1a",
  card: "rgba(30,30,50,0.6)",
  cardBorder: "rgba(255,255,255,0.08)",
  accent: "#FF6B35",
  accentHover: "#ff7d4d",
  blue: "#0EA5E9",
  purple: "#8B5CF6",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  text: "#fff",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  textDim: "#4a5568",
};

const CARD = {
  background: "rgba(30,30,50,0.55)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "18px 16px",
};

const CARD_COMPACT = {
  background: "rgba(30,30,50,0.55)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "14px 14px",
};

const CARD_HERO = {
  background: "linear-gradient(135deg,rgba(26,26,50,0.8),rgba(22,33,62,0.8),rgba(15,52,96,0.6))",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "28px 20px",
  position: "relative",
  overflow: "hidden",
};

const TYPE = {
  h1: { fontSize: 24, fontWeight: 800, color: "#fff", fontFamily: "'Unbounded',sans-serif", margin: 0, lineHeight: 1.2 },
  h2: { fontSize: 17, fontWeight: 700, color: "#fff", fontFamily: "'Unbounded',sans-serif", margin: 0 },
  h3: { fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "'Unbounded',sans-serif", margin: 0 },
  body: { fontSize: 14, color: "#e2e8f0", lineHeight: 1.6 },
  bodySmall: { fontSize: 12, color: "#94a3b8", lineHeight: 1.5 },
  caption: { fontSize: 10, color: "#64748b" },
  mono: { fontFamily: "'JetBrains Mono',monospace" },
  label: { fontSize: 10, color: "#94a3b8", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'JetBrains Mono',monospace" },
};

const EASE_OUT = "cubic-bezier(0.16,1,0.3,1)";
const EASE_STD = "cubic-bezier(0.4,0,0.2,1)";

const GLOBAL_STYLES = `@import url('https://fonts.googleapis.com/css2?family=Unbounded:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:24px;height:24px;border-radius:50%;background:#FF6B35;cursor:pointer;border:3px solid #fff;box-shadow:0 0 8px rgba(255,107,53,0.4)}input[type="range"]::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#FF6B35;cursor:pointer;border:3px solid #fff}button{font-family:inherit;transition:transform 0.15s ${EASE_STD}}button:active{transform:scale(0.97)!important}@keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}@keyframes pulse{0%{transform:scale(1)}50%{transform:scale(1.03)}100%{transform:scale(1)}}@keyframes countUp{from{opacity:0;transform:scale(0.7)}to{opacity:1;transform:scale(1)}}@keyframes fadeInExplain{from{opacity:0;max-height:0}to{opacity:1;max-height:300px}}@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-100%)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes screenIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}@keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}@keyframes ripple{0%{transform:scale(0);opacity:0.5}100%{transform:scale(4);opacity:0}}@keyframes overlayIn{from{opacity:0}to{opacity:1}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes sheetUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}@keyframes confetti{0%{transform:scale(0) rotate(0deg);opacity:0}50%{transform:scale(1.3) rotate(180deg);opacity:1}100%{transform:scale(1) rotate(360deg);opacity:1}}@keyframes firePulse{0%{box-shadow:0 0 0 0 rgba(245,158,11,0.3)}50%{box-shadow:0 0 12px 4px rgba(245,158,11,0.15)}100%{box-shadow:0 0 0 0 rgba(245,158,11,0)}}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}`;

export { GLOBAL_STYLES, CARD, CARD_COMPACT, CARD_HERO, TYPE, COLORS };
