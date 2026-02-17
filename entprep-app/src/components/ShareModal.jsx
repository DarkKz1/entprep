import React, { useState, useEffect } from "react";
import { generateTestCard, generateFullENTCard } from "../utils/shareCard.js";
import { shareWithImage, shareToWhatsApp, shareToTelegram, copyText, downloadImage, buildChallengeUrl } from "../utils/shareHelpers.js";
import { X, MessageCircle, Send, Copy, Download, Swords, Check, Share2 } from "lucide-react";

export default function ShareModal({ visible, onClose, type, data }) {
  const [cardUrl, setCardUrl] = useState(null);
  const [cardBlob, setCardBlob] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showChallenge, setShowChallenge] = useState(false);
  const [challengeCopied, setChallengeCopied] = useState(false);

  useEffect(() => {
    if (!visible) { setCardUrl(null); setCardBlob(null); setShowChallenge(false); return; }
    let cancelled = false;
    (async () => {
      let blob;
      if (type === "fullent") {
        blob = await generateFullENTCard(data);
      } else {
        blob = await generateTestCard(data);
      }
      if (cancelled) return;
      setCardBlob(blob);
      if (blob) setCardUrl(URL.createObjectURL(blob));
    })();
    return () => { cancelled = true; };
  }, [visible, type, data]);

  useEffect(() => {
    return () => { if (cardUrl) URL.revokeObjectURL(cardUrl); };
  }, [cardUrl]);

  if (!visible) return null;

  const shareText = type === "fullent"
    ? `ENTprep - Пробный ЕНТ: ${data.totalPts}/${data.maxPts} баллов!\nПопробуй свои силы: entprep.netlify.app`
    : `ENTprep - ${data.subjectName}: ${data.pct}% (${data.score}/${data.total})\nПопробуй свои силы: entprep.netlify.app`;

  const challengeUrl = type !== "fullent" && data.subjectId
    ? buildChallengeUrl(data.subjectId, data.pct, data.topicId)
    : null;

  const challengeText = challengeUrl
    ? `Я набрал ${data.pct}% по "${data.subjectName}" в ENTprep! Сможешь лучше?\n${challengeUrl}`
    : null;

  const handleShare = async () => {
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

  const btnBase = {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "14px 18px", border: "none", borderRadius: 14,
    fontSize: 13, fontWeight: 700, cursor: "pointer", flex: 1, minWidth: 0,
    transition: "all 0.2s",
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      animation: "overlayIn 0.3s cubic-bezier(0.4,0,0.2,1)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 480,
        background: "linear-gradient(180deg,#1a1a32,#0f0f1a)",
        borderRadius: "22px 22px 0 0",
        padding: "20px 20px 32px",
        animation: "sheetUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        willChange: "opacity,transform",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", fontFamily: "'Unbounded',sans-serif" }}>
            Поделиться
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, padding: 8, cursor: "pointer", color: "#94a3b8",
            display: "flex", alignItems: "center",
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Card preview */}
        <div style={{
          borderRadius: 16, overflow: "hidden", marginBottom: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "#0f0f1a", minHeight: 180, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {cardUrl
            ? <img src={cardUrl} alt="Share card" style={{ width: "100%", display: "block" }} />
            : <div style={{ color: "#64748b", fontSize: 12, padding: 40 }}>Генерация карточки...</div>
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
            ...btnBase, background: "rgba(255,255,255,0.06)", color: copied ? "#22c55e" : "#e2e8f0",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            {copied ? <><Check size={16} />OK</> : <><Copy size={16} />Copy</>}
          </button>
          <button onClick={() => downloadImage(cardBlob, `entprep-${type}-result.png`)} style={{
            ...btnBase, background: "rgba(255,255,255,0.06)", color: "#e2e8f0",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            <Download size={16} />
          </button>
        </div>

        {/* Native share */}
        {navigator.share && (
          <button onClick={handleShare} style={{
            ...btnBase, width: "100%", flex: "none",
            background: "linear-gradient(135deg,#0EA5E9,#38bdf8)", color: "#fff",
            marginBottom: 10, boxShadow: "0 4px 20px rgba(14,165,233,0.25)",
          }}>
            <Share2 size={16} />Поделиться
          </button>
        )}

        {/* Challenge section */}
        {challengeUrl && !showChallenge && (
          <button onClick={() => setShowChallenge(true)} style={{
            ...btnBase, width: "100%", flex: "none",
            background: "linear-gradient(135deg,#FF6B35,#e85d26)", color: "#fff",
            boxShadow: "0 4px 20px rgba(255,107,53,0.25)",
          }}>
            <Swords size={16} />Бросить вызов другу
          </button>
        )}

        {showChallenge && challengeUrl && (
          <div style={{
            background: "rgba(255,107,53,0.06)", border: "1px solid rgba(255,107,53,0.2)",
            borderRadius: 14, padding: 14, animation: "slideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#FF6B35", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Swords size={14} />Вызов другу
            </div>
            <div style={{
              background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "10px 12px",
              fontSize: 11, color: "#94a3b8", lineHeight: 1.6, marginBottom: 10, wordBreak: "break-all",
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
                ...btnBase, background: "rgba(255,255,255,0.06)", padding: "10px 14px", fontSize: 12,
                color: challengeCopied ? "#22c55e" : "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)",
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
