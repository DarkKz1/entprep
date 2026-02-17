// ==================== SHARE CARD GENERATOR ====================
// Canvas-based PNG generation for sharing test results

const W = 1080, H = 1350;
const BG = "#0f0f1a";
const GRAD_L = "#FF6B35";
const GRAD_R = "#0EA5E9";

function createCanvas() {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  return c;
}

function drawBase(ctx) {
  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow top-center
  const grd = ctx.createRadialGradient(W / 2, 200, 50, W / 2, 200, 500);
  grd.addColorStop(0, "rgba(14,165,233,0.08)");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // Top gradient stripe
  const stripe = ctx.createLinearGradient(0, 0, W, 0);
  stripe.addColorStop(0, GRAD_L);
  stripe.addColorStop(1, GRAD_R);
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 0, W, 6);
}

function drawLogo(ctx, y) {
  ctx.font = "bold 48px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = GRAD_L;
  ctx.fillText("ENT", W / 2 - 40, y);
  const m = ctx.measureText("ENT");
  ctx.fillStyle = GRAD_R;
  ctx.fillText("prep", W / 2 - 40 + m.width, y);
}

function drawProgressBar(ctx, x, y, w, h, pct, colorL, colorR) {
  // Track
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();

  // Fill
  if (pct > 0) {
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, colorL);
    grad.addColorStop(1, colorR);
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, Math.max(w * pct / 100, h), h, h / 2);
    ctx.fill();
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function drawCard(ctx, x, y, w, h, r) {
  ctx.fillStyle = "rgba(30,30,50,0.7)";
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
}

function drawFooter(ctx) {
  ctx.font = "600 32px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("entprep.netlify.app", W / 2, H - 60);
}

function scoreColor(pct) {
  if (pct >= 70) return "#22c55e";
  if (pct >= 50) return "#eab308";
  return "#ef4444";
}

function toBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

// ==================== TEST CARD ====================
async function generateTestCard({ subjectName, subjectEmoji, topicName, score, total, pct }) {
  const c = createCanvas();
  const ctx = c.getContext("2d");
  drawBase(ctx);

  // Logo
  drawLogo(ctx, 100);

  // Subject chip
  ctx.font = "600 36px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Результат теста", W / 2, 170);

  // Emoji
  ctx.font = "120px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
  ctx.fillText(pct >= 70 ? "\uD83C\uDF89" : pct >= 50 ? "\uD83D\uDCAA" : "\uD83D\uDCDA", W / 2, 340);

  // Score
  ctx.font = "bold 160px 'Segoe UI', sans-serif";
  ctx.fillStyle = scoreColor(pct);
  ctx.fillText(`${pct}%`, W / 2, 510);

  // Correct count
  ctx.font = "500 40px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`${score} из ${total} правильных`, W / 2, 570);

  // Subject card
  drawCard(ctx, 80, 630, W - 160, topicName ? 200 : 140, 24);
  ctx.font = "48px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(subjectEmoji || "\uD83D\uDCCB", W / 2, 700);
  ctx.font = "bold 42px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(subjectName, W / 2, 755);
  if (topicName) {
    ctx.font = "500 30px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(topicName, W / 2, 800);
  }

  // Progress bar
  const barY = topicName ? 870 : 810;
  drawProgressBar(ctx, 100, barY, W - 200, 28, pct, GRAD_L, GRAD_R);

  // Message
  const msgY = barY + 80;
  ctx.font = "bold 38px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  const msg = pct >= 70 ? "Отлично! Выше порога!" : pct >= 50 ? "Неплохо, можно лучше!" : "Есть над чем работать!";
  ctx.fillStyle = scoreColor(pct);
  ctx.fillText(msg, W / 2, msgY);

  // Challenge text
  ctx.font = "600 34px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Сможешь лучше? \uD83D\uDD25", W / 2, msgY + 70);

  drawFooter(ctx);
  return toBlob(c);
}

// ==================== FULL ENT CARD ====================
async function generateFullENTCard({ totalPts, maxPts, results }) {
  const c = createCanvas();
  const ctx = c.getContext("2d");
  drawBase(ctx);

  // Logo
  drawLogo(ctx, 90);

  // Title
  ctx.font = "600 36px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Пробный ЕНТ", W / 2, 155);

  // Score
  const allPassed = results.every(r => r.passed);
  ctx.font = "bold 140px 'Segoe UI', sans-serif";
  ctx.fillStyle = allPassed ? "#22c55e" : "#ef4444";
  ctx.fillText(`${totalPts}`, W / 2, 310);

  ctx.font = "500 44px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(`из ${maxPts} баллов`, W / 2, 370);

  // Status
  ctx.font = "bold 34px 'Segoe UI', sans-serif";
  ctx.fillStyle = allPassed ? "#22c55e" : "#ef4444";
  ctx.fillText(allPassed ? "Все пороги пройдены!" : "Есть непройденные пороги", W / 2, 430);

  // Subject bars
  const startY = 490;
  const rowH = 100;
  const padX = 90;
  const barW = W - padX * 2 - 280;

  results.forEach((r, i) => {
    const y = startY + i * rowH;

    // Icon
    ctx.font = "36px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(r.icon || "\uD83D\uDCCB", padX, y + 40);

    // Label (truncate)
    ctx.font = "600 28px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#e2e8f0";
    const label = r.label.length > 14 ? r.label.slice(0, 13) + "." : r.label;
    ctx.fillText(label, padX + 52, y + 38);

    // Bar
    const barX = padX + 280;
    const pctVal = r.maxPts ? Math.round(r.pts / r.maxPts * 100) : 0;
    drawProgressBar(ctx, barX, y + 18, barW, 20, pctVal,
      r.passed ? "#22c55e" : "#ef4444",
      r.passed ? "#10b981" : "#dc2626"
    );

    // Score
    ctx.font = "bold 26px 'JetBrains Mono', monospace, 'Segoe UI', sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = r.passed ? "#22c55e" : "#ef4444";
    ctx.fillText(`${r.pts}/${r.maxPts}`, W - padX, y + 38);

    // Pass indicator
    ctx.font = "500 22px 'Segoe UI', sans-serif";
    ctx.fillText(r.passed ? "\u2713" : "\u2717", W - padX, y + 66);
  });

  // Challenge text
  const challengeY = startY + results.length * rowH + 40;
  ctx.font = "bold 34px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Сможешь лучше? \uD83D\uDD25", W / 2, challengeY);

  drawFooter(ctx);
  return toBlob(c);
}

export { generateTestCard, generateFullENTCard };
