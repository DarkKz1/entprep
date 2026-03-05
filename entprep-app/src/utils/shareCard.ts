// ==================== SHARE CARD GENERATOR ====================
// Canvas-based PNG generation for sharing test results

import QRCode from 'qrcode';

const W = 1080, H = 1350;
const BG = "#0C0C14";
const GRAD_L = "#FF6B35";
const GRAD_R = "#1A9A8C";
const QR_SIZE = 180;
import { APP_URL } from '../config/app';

// ── Param interfaces ─────────────────────────────────────────────

export interface TestCardParams {
  subjectName: string;
  subjectEmoji: string;
  topicName: string | null;
  score: number;
  total: number;
  pct: number;
  levelName?: string;
  levelColor?: string;
  qrUrl?: string;
}

export interface FullENTCardResult {
  icon: string;
  label: string;
  pts: number;
  maxPts: number;
  passed: boolean;
}

export interface FullENTCardParams {
  totalPts: number;
  maxPts: number;
  results: FullENTCardResult[];
  levelName?: string;
  levelColor?: string;
  qrUrl?: string;
}

// ── Internal helpers ─────────────────────────────────────────────

function createCanvas(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  return c;
}

function drawBase(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  const grd = ctx.createRadialGradient(W / 2, 200, 50, W / 2, 200, 500);
  grd.addColorStop(0, "rgba(26,154,140,0.08)");
  grd.addColorStop(1, "transparent");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  const stripe = ctx.createLinearGradient(0, 0, W, 0);
  stripe.addColorStop(0, GRAD_L);
  stripe.addColorStop(1, GRAD_R);
  ctx.fillStyle = stripe;
  ctx.fillRect(0, 0, W, 6);
}

function drawLogo(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.font = "bold 48px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = GRAD_L;
  ctx.fillText("ENT", W / 2 - 40, y);
  const m = ctx.measureText("ENT");
  ctx.fillStyle = GRAD_R;
  ctx.fillText("prep", W / 2 - 40 + m.width, y);
}

function drawLevelBadge(
  ctx: CanvasRenderingContext2D,
  name: string,
  color: string,
  centerX: number,
  y: number,
): void {
  ctx.font = "bold 26px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  const textW = ctx.measureText(name).width;
  const padX = 20;
  const badgeW = textW + padX * 2;
  const badgeH = 38;

  // Badge background
  ctx.fillStyle = color + "22";
  roundRect(ctx, centerX - badgeW / 2, y - badgeH / 2, badgeW, badgeH, badgeH / 2);
  ctx.fill();

  // Badge border
  ctx.strokeStyle = color + "66";
  ctx.lineWidth = 2;
  roundRect(ctx, centerX - badgeW / 2, y - badgeH / 2, badgeW, badgeH, badgeH / 2);
  ctx.stroke();

  // Badge text
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(name, centerX, y);
  ctx.textBaseline = "alphabetic";
}

function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pct: number,
  colorL: string,
  colorR: string,
): void {
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();

  if (pct > 0) {
    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    grad.addColorStop(0, colorL);
    grad.addColorStop(1, colorR);
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, Math.max(w * pct / 100, h), h, h / 2);
    ctx.fill();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
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

function drawCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.fillStyle = "rgba(30,30,50,0.7)";
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
}

async function drawQR(
  ctx: CanvasRenderingContext2D,
  url: string,
  centerX: number,
  y: number,
  size: number,
): Promise<void> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: size,
    margin: 1,
    color: { dark: '#ffffffFF', light: '#00000000' },
    errorCorrectionLevel: 'M',
  });

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });

  ctx.drawImage(img, centerX - size / 2, y, size, size);
}

async function drawFooterWithQR(
  ctx: CanvasRenderingContext2D,
  qrUrl?: string,
): Promise<void> {
  const url = qrUrl || APP_URL;
  try {
    const qrY = H - QR_SIZE - 100;
    await drawQR(ctx, url, W / 2, qrY, QR_SIZE);

    ctx.font = "600 28px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("\u0421\u043a\u0430\u0447\u0430\u0439 ENTprep", W / 2, H - 55);
  } catch {
    // Fallback: old text footer
    ctx.font = "600 32px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("entprep.netlify.app", W / 2, H - 60);
  }
}

function scoreColor(pct: number): string {
  if (pct >= 70) return "#22c55e";
  if (pct >= 50) return "#eab308";
  return "#ef4444";
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, "image/png"));
}

// ==================== TEST CARD ====================
async function generateTestCard({
  subjectName, subjectEmoji, topicName, score, total, pct,
  levelName, levelColor, qrUrl,
}: TestCardParams): Promise<Blob | null> {
  const c = createCanvas();
  const ctx = c.getContext("2d")!;
  drawBase(ctx);

  // Logo
  drawLogo(ctx, 80);

  // Level badge (below logo)
  let subtitleY = 155;
  if (levelName && levelColor) {
    drawLevelBadge(ctx, levelName, levelColor, W / 2, 120);
    subtitleY = 170;
  }

  // Subtitle
  ctx.font = "600 36px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("\u0420\u0435\u0437\u0443\u043b\u044c\u0442\u0430\u0442 \u0442\u0435\u0441\u0442\u0430", W / 2, subtitleY);

  // Emoji
  ctx.font = "120px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
  ctx.fillText(pct >= 70 ? "\uD83C\uDF89" : pct >= 50 ? "\uD83D\uDCAA" : "\uD83D\uDCDA", W / 2, 310);

  // Score
  ctx.font = "bold 150px 'Segoe UI', sans-serif";
  ctx.fillStyle = scoreColor(pct);
  ctx.fillText(`${pct}%`, W / 2, 470);

  // Correct count
  ctx.font = "500 40px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText(`${score} \u0438\u0437 ${total} \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u044b\u0445`, W / 2, 530);

  // Subject card
  const cardY = 580;
  drawCard(ctx, 80, cardY, W - 160, topicName ? 200 : 140, 24);
  ctx.font = "48px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(subjectEmoji || "\uD83D\uDCCB", W / 2, cardY + 65);
  ctx.font = "bold 42px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(subjectName, W / 2, cardY + 118);
  if (topicName) {
    ctx.font = "500 30px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(topicName, W / 2, cardY + 165);
  }

  // Progress bar
  const barY = cardY + (topicName ? 230 : 170);
  drawProgressBar(ctx, 100, barY, W - 200, 28, pct, GRAD_L, GRAD_R);

  // Message
  const msgY = barY + 70;
  ctx.font = "bold 38px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  const msg = pct >= 70 ? "\u041e\u0442\u043b\u0438\u0447\u043d\u043e! \u0412\u044b\u0448\u0435 \u043f\u043e\u0440\u043e\u0433\u0430!" : pct >= 50 ? "\u041d\u0435\u043f\u043b\u043e\u0445\u043e, \u043c\u043e\u0436\u043d\u043e \u043b\u0443\u0447\u0448\u0435!" : "\u0415\u0441\u0442\u044c \u043d\u0430\u0434 \u0447\u0435\u043c \u0440\u0430\u0431\u043e\u0442\u0430\u0442\u044c!";
  ctx.fillStyle = scoreColor(pct);
  ctx.fillText(msg, W / 2, msgY);

  // Challenge text
  ctx.font = "600 34px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("\u0421\u043c\u043e\u0436\u0435\u0448\u044c \u043b\u0443\u0447\u0448\u0435? \uD83D\uDD25", W / 2, msgY + 60);

  // QR footer
  await drawFooterWithQR(ctx, qrUrl);
  return toBlob(c);
}

// ==================== FULL ENT CARD ====================
async function generateFullENTCard({
  totalPts, maxPts, results,
  levelName, levelColor, qrUrl,
}: FullENTCardParams): Promise<Blob | null> {
  const c = createCanvas();
  const ctx = c.getContext("2d")!;
  drawBase(ctx);

  // Logo
  drawLogo(ctx, 80);

  // Level badge
  let titleY = 145;
  if (levelName && levelColor) {
    drawLevelBadge(ctx, levelName, levelColor, W / 2, 120);
    titleY = 160;
  }

  // Title
  ctx.font = "600 36px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("\u041f\u0440\u043e\u0431\u043d\u044b\u0439 \u0415\u041d\u0422", W / 2, titleY);

  // Score
  const allPassed = results.every(r => r.passed);
  ctx.font = "bold 140px 'Segoe UI', sans-serif";
  ctx.fillStyle = allPassed ? "#22c55e" : "#ef4444";
  ctx.fillText(`${totalPts}`, W / 2, 310);

  ctx.font = "500 44px 'Segoe UI', sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText(`\u0438\u0437 ${maxPts} \u0431\u0430\u043b\u043b\u043e\u0432`, W / 2, 370);

  // Status
  ctx.font = "bold 34px 'Segoe UI', sans-serif";
  ctx.fillStyle = allPassed ? "#22c55e" : "#ef4444";
  ctx.fillText(allPassed ? "\u0412\u0441\u0435 \u043f\u043e\u0440\u043e\u0433\u0438 \u043f\u0440\u043e\u0439\u0434\u0435\u043d\u044b!" : "\u0415\u0441\u0442\u044c \u043d\u0435\u043f\u0440\u043e\u0439\u0434\u0435\u043d\u043d\u044b\u0435 \u043f\u043e\u0440\u043e\u0433\u0438", W / 2, 430);

  // Subject bars
  const startY = 490;
  const rowH = 100;
  const padX = 90;
  const barW = W - padX * 2 - 280;

  results.forEach((r, i) => {
    const y = startY + i * rowH;

    ctx.font = "36px 'Segoe UI Emoji', 'Apple Color Emoji', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(r.icon || "\uD83D\uDCCB", padX, y + 40);

    ctx.font = "600 28px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#e2e8f0";
    const label = r.label.length > 14 ? r.label.slice(0, 13) + "." : r.label;
    ctx.fillText(label, padX + 52, y + 38);

    const barX = padX + 280;
    const pctVal = r.maxPts ? Math.round(r.pts / r.maxPts * 100) : 0;
    drawProgressBar(ctx, barX, y + 18, barW, 20, pctVal,
      r.passed ? "#22c55e" : "#ef4444",
      r.passed ? "#10b981" : "#dc2626"
    );

    ctx.font = "bold 26px 'JetBrains Mono', monospace, 'Segoe UI', sans-serif";
    ctx.textAlign = "right";
    ctx.fillStyle = r.passed ? "#22c55e" : "#ef4444";
    ctx.fillText(`${r.pts}/${r.maxPts}`, W - padX, y + 38);

    ctx.font = "500 22px 'Segoe UI', sans-serif";
    ctx.fillText(r.passed ? "\u2713" : "\u2717", W - padX, y + 66);
  });

  // Challenge text
  const challengeY = startY + results.length * rowH + 40;
  ctx.font = "bold 34px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "#64748b";
  ctx.fillText("\u0421\u043c\u043e\u0436\u0435\u0448\u044c \u043b\u0443\u0447\u0448\u0435? \uD83D\uDD25", W / 2, challengeY);

  // QR footer
  await drawFooterWithQR(ctx, qrUrl);
  return toBlob(c);
}

export { generateTestCard, generateFullENTCard };
