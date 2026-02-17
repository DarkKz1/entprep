import React, { useState, useEffect, useRef } from "react";
import { RefreshCw } from 'lucide-react';

export default function UpdatePrompt() {
  const [show, setShow] = useState(false);
  const updateSW = useRef(null);

  useEffect(() => {
    let cancelled = false;
    import("virtual:pwa-register").then(({ registerSW }) => {
      if (cancelled) return;
      updateSW.current = registerSW({
        onNeedRefresh() { setTimeout(() => { if (!cancelled) setShow(true); }, 800); },
        onOfflineReady() {},
      });
    });
    return () => { cancelled = true; };
  }, []);

  const handleUpdate = () => {
    if (updateSW.current) updateSW.current(true);
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", bottom: 74, left: 16, right: 16,
      maxWidth: 448, margin: "0 auto", zIndex: 9998,
      background: "rgba(30,30,56,0.9)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      border: "1px solid rgba(14,165,233,0.25)",
      borderRadius: 18, padding: "18px 20px",
      boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      animation: "slideUp 0.45s cubic-bezier(0.16,1,0.3,1)",
      willChange: "opacity,transform",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(14,165,233,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <RefreshCw size={20} color="#0EA5E9" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 3 }}>
            Доступно обновление
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Новая версия ENTprep готова
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleUpdate} style={{
          background: "linear-gradient(135deg, #0EA5E9, #38bdf8)",
          border: "none", color: "#fff", borderRadius: 12,
          padding: "9px 22px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <RefreshCw size={14} />Обновить
        </button>
      </div>
    </div>
  );
}
