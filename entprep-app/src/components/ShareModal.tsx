import React, { useState, useEffect, useMemo } from 'react';
import { generateTestCard, generateFullENTCard } from '../utils/shareCard';
import type { TestCardParams, FullENTCardParams } from '../utils/shareCard';
import { shareWithImage, shareToWhatsApp, shareToTelegram, copyText, downloadImage, buildChallengeUrl } from '../utils/shareHelpers';
import { X, MessageCircle, Send, Copy, Download, Swords, Check, Share2 } from 'lucide-react';
import { COLORS } from '../constants/styles';
import { trackEvent } from '../utils/analytics';
import { useApp } from '../contexts/AppContext';
import { calcTotalXP, getLevel } from '../utils/xpHelpers';
import { useT } from '../locales';

interface TestShareData extends TestCardParams {
  subjectId: string;
  topicId?: string | null;
}

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  type: 'fullent' | 'test';
  data: FullENTCardParams | TestShareData;
}

export default function ShareModal({ visible, onClose, type, data }: ShareModalProps) {
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardBlob, setCardBlob] = useState<Blob | null>(null);
  const [copied, setCopied] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);

  const { hist } = useApp();
  const t = useT();
  const levelInfo = useMemo(() => getLevel(calcTotalXP(hist)), [hist]);

  const test = type !== "fullent" ? data as TestShareData : null;
  const challengeUrl = test
    ? buildChallengeUrl(test.subjectId, test.pct, test.topicId)
    : null;

  useEffect(() => {
    if (!visible) { setCardUrl(null); setCardBlob(null); setShowChallenge(false); return; }
    let cancelled = false;
    (async () => {
      const levelData = {
        levelName: levelInfo.name,
        levelColor: levelInfo.color,
      };
      let blob;
      if (type === "fullent") {
        blob = await generateFullENTCard({ ...(data as FullENTCardParams), ...levelData });
      } else {
        blob = await generateTestCard({
          ...(data as TestCardParams),
          ...levelData,
          qrUrl: challengeUrl || undefined,
        });
      }
      if (cancelled) return;
      setCardBlob(blob);
      if (blob) setCardUrl(URL.createObjectURL(blob));
    })();
    return () => { cancelled = true; };
  }, [visible, type, data, levelInfo.name, levelInfo.color, challengeUrl]);

  useEffect(() => {
    return () => { if (cardUrl) URL.revokeObjectURL(cardUrl); };
  }, [cardUrl]);

  if (!visible) return null;

  const fullent = type === "fullent" ? data as FullENTCardParams : null;

  const shareText = fullent
    ? `ENTprep - ${t.share.trialEnt}: ${fullent.totalPts}/${fullent.maxPts} ${t.share.points}!\n${t.share.tryYourself}`
    : `ENTprep - ${test!.subjectName}: ${test!.pct}% (${test!.score}/${test!.total})\n${t.share.tryYourself}`;

  const challengeText = challengeUrl && test
    ? `${t.share.iScored} ${test.pct}% — ${test.subjectName} ${t.share.inApp}\n${challengeUrl}`
    : null;

  const handleShare = async () => {
    trackEvent('Result Shared');
    await shareWithImage(cardBlob, shareText);
  };

  const handleCopy = async () => {
    const ok = await copyText(shareText);
    if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const handleChallengeCopy = async () => {
    if (!challengeText) return;
    const ok = await copyText(challengeText);
    if (ok) { setChallengeCopied(true); setTimeout(() => setChallengeCopied(false), 2000); }
  };

  const btnBase: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "14px 18px", border: "none", borderRadius: 14,
    fontSize: 13, fontWeight: 700, cursor: "pointer", flex: 1, minWidth: 0,
    transition: "all 0.2s",
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "var(--bg-overlay)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      animation: "overlayIn 0.3s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480,
        background: "var(--bg-modal)",
        borderRadius: "22px 22px 0 0",
        padding: "20px 20px 32px",
        animation: "sheetUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        willChange: "opacity,transform",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", fontFamily: "'Unbounded',sans-serif" }}>
            {t.share.title}
          </div>
          <button onClick={onClose} style={{
            background: "var(--bg-subtle-2)", border: "1px solid var(--border)",
            borderRadius: 10, padding: 8, cursor: "pointer", color: "var(--text-secondary)",
            display: "flex", alignItems: "center",
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Card preview */}
        <div style={{
          borderRadius: 16, overflow: "hidden", marginBottom: 16,
          border: "1px solid var(--border)",
          background: "var(--bg)", minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {cardUrl
            ? <img src={cardUrl} alt="Share card" style={{ width: "100%", display: "block" }} />
            : <div style={{ color: "var(--text-muted)", fontSize: 12, padding: 40 }}>{t.share.generatingCard}</div>
          }
        </div>

        {/* Share buttons row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <button onClick={() => shareToWhatsApp(shareText)} style={{
            ...btnBase, background: "#25D366", color: "#fff",
          }}>
            <MessageCircle size={18} />WA
          </button>
          <button onClick={() => shareToTelegram(shareText)} style={{
            ...btnBase, background: "#2AABEE", color: "#fff",
          }}>
            <Send size={18} />TG
          </button>
          <button onClick={handleCopy} style={{
            ...btnBase, background: "var(--bg-subtle-2)", color: copied ? COLORS.green : "var(--text-body)",
            border: "1px solid var(--border)",
          }}>
            {copied ? <><Check size={16} />OK</> : <><Copy size={16} />Copy</>}
          </button>
          <button onClick={() => downloadImage(cardBlob, `entprep-${type}-result.png`)} style={{
            ...btnBase, background: "var(--bg-subtle-2)", color: "var(--text-body)",
            border: "1px solid var(--border)",
          }}>
            <Download size={16} />
          </button>
        </div>

        {/* Native share */}
        {'share' in navigator && (
          <button onClick={handleShare} style={{
            ...btnBase, width: "100%", flex: "none",
            background: `linear-gradient(135deg,${COLORS.teal},${COLORS.tealLight})`, color: "#fff",
            marginBottom: 10, boxShadow: "0 4px 20px rgba(26,154,140,0.25)",
          }}>
            <Share2 size={16} />{t.share.title}
          </button>
        )}

        {/* Challenge section */}
        {challengeUrl && !showChallenge && (
          <button onClick={() => setShowChallenge(true)} style={{
            ...btnBase, width: "100%", flex: "none",
            background: `linear-gradient(135deg,${COLORS.accent},${COLORS.accentDark})`, color: "#fff",
            boxShadow: "0 4px 20px rgba(255,107,53,0.25)",
          }}>
            <Swords size={16} />{t.share.challengeFriend}
          </button>
        )}

        {showChallenge && challengeText && (
          <div style={{
            background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.2)",
            borderRadius: 14, padding: 14, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.accent, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Swords size={14} />{t.share.challengeTitle}
            </div>
            <div style={{
              background: "var(--bg-overlay-light)", borderRadius: 10, padding: "10px 12px",
              fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 10, wordBreak: "break-all",
            }}>
              {challengeText}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => shareToWhatsApp(challengeText)} style={{
                ...btnBase, background: "#25D366", color: "#fff", padding: "10px 14px", fontSize: 12,
              }}>
                <MessageCircle size={15} />WA
              </button>
              <button onClick={() => shareToTelegram(challengeText)} style={{
                ...btnBase, background: "#2AABEE", color: "#fff", padding: "10px 14px", fontSize: 12,
              }}>
                <Send size={15} />TG
              </button>
              <button onClick={handleChallengeCopy} style={{
                ...btnBase, background: "var(--bg-subtle-2)", padding: "10px 14px", fontSize: 12,
                color: challengeCopied ? COLORS.green : "var(--text-body)", border: "1px solid var(--border)",
              }}>
                {challengeCopied ? <><Check size={14} />OK</> : <><Copy size={14} />Copy</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
