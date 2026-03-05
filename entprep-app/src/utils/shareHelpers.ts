const BASE_URL = 'https://entprep.netlify.app';

async function shareWithImage(blob: Blob | null, text: string): Promise<boolean> {
  if (navigator.canShare && blob) {
    const file = new File([blob], 'entprep-result.png', { type: 'image/png' });
    const data = { files: [file], text };
    if (navigator.canShare(data)) {
      try { await navigator.share(data); return true; } catch { /* cancelled */ }
    }
  }
  if (navigator.share) {
    try { await navigator.share({ text }); return true; } catch { /* cancelled */ }
  }
  return false;
}

function shareToWhatsApp(text: string): void {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function shareToTelegram(text: string): void {
  window.open(`https://t.me/share/url?url=${encodeURIComponent(BASE_URL)}&text=${encodeURIComponent(text)}`, '_blank');
}

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard) {
    try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
  }
  return false;
}

function downloadImage(blob: Blob | null, filename?: string): void {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'entprep-result.png';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildChallengeUrl(subjectId: string, score: number, topicId?: string | null): string {
  let url = `${BASE_URL}?ch=${subjectId}&sc=${score}`;
  if (topicId) url += `&tp=${topicId}`;
  return url;
}

interface ChallengeUrlParams {
  subjectId: string;
  score: number;
  topicId: string | null;
}

function parseChallengeUrl(): ChallengeUrlParams | null {
  const p = new URLSearchParams(window.location.search);
  const ch = p.get('ch');
  const sc = p.get('sc');
  if (!ch || !sc) return null;
  return { subjectId: ch, score: parseInt(sc, 10), topicId: p.get('tp') || null };
}

export { shareWithImage, shareToWhatsApp, shareToTelegram, copyText, downloadImage, buildChallengeUrl, parseChallengeUrl };
