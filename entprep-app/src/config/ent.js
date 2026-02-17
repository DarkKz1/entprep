// ==================== ENT EXAM CONFIG ====================
const ENT_CONFIG = {
  totalTime: 240 * 60,
  sections: [
    { sid: "history", label: "История РК", icon: "🏛️", cnt: 20, maxPts: 20, threshold: 5, ptsPerQ: 1 },
    { sid: "math", label: "Мат. грамотность", icon: "📐", cnt: 10, maxPts: 10, threshold: 3, ptsPerQ: 1 },
    { sid: "reading", label: "Грамотность чтения", icon: "📖", cnt: 10, maxPts: 10, threshold: 3, ptsPerQ: 1 },
  ],
  profileCnt: 40,
  profileMaxPts: 50,
  profileThreshold: 5,
  profilePtsPerQ: 1.25,
};

export { ENT_CONFIG };
