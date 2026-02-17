import React, { useState, useEffect, useRef } from "react";
import { CARD_COMPACT } from '../constants/styles.js';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef(null);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    if (standalone) return;

    if (ios) {
      const dismissed = sessionStorage.getItem("entprep_install_dismissed");
      if (dismissed) return;
      const timer = setTimeout(() => { setIsIOS(true); setShow(true); }, 30000);
      return () => clearTimeout(timer);
    }

    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      const dismissed = sessionStorage.getItem("entprep_install_dismissed");
      if (!dismissed) {
        setTimeout(() => setShow(true), 30000);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const result = await deferredPrompt.current.userChoice;
    if (result.outcome === "accepted") setShow(false);
    deferredPrompt.current = null;
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem("entprep_install_dismissed", "1");
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 74, left: "50%", transform: "translateX(-50%)",
      width: "calc(100% - 32px)", maxWidth: 448, zIndex: 9999,
      background: "rgba(30,30,56,0.9)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(255,107,53,0.25)",
      borderRadius: 18, padding: "18px 20px",
      boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      animation: "slideUp 0.45s cubic-bezier(0.16,1,0.3,1)",
      willChange: "opacity,transform",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(255,107,53,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Download size={20} color="#FF6B35" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            {isIOS ? "Добавить ENTprep на экран" : "Установить ENTprep?"}
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 14 }}>
            {isIOS
              ? 'Нажмите "Поделиться" → "На экран «Домой»"'
              : "Быстрый доступ без браузера"}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={handleDismiss} style={{
          background: "none", border: "1px solid rgba(255,255,255,0.1)",
          color: "#94a3b8", borderRadius: 12, padding: "9px 18px",
          fontSize: 12, fontWeight: 600, cursor: "pointer"
        }}>Позже</button>
        {!isIOS && (
          <button onClick={handleInstall} style={{
            background: "linear-gradient(135deg, #FF6B35, #FF8C5A)",
            border: "none", color: "#fff", borderRadius: 12,
            padding: "9px 22px", fontSize: 12, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <Download size={14} />Установить
          </button>
        )}
      </div>
    </div>
  );
}
