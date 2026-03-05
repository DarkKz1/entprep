import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { COLORS } from '../constants/styles';
import { useT } from '../locales';

export default function UpdatePrompt() {
  const [show, setShow] = useState(false);
  const updateSW = useRef<((reloadPage?: boolean) => void) | null>(null);
  const t = useT();

  useEffect(() => {
    let cancelled = false;
    import('virtual:pwa-register').then(({ registerSW }) => {
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
    <div role="alert" aria-label={t.pwa.updateAvailable} style={{
      position: 'fixed', bottom: 74, left: 16, right: 16,
      maxWidth: 448, margin: '0 auto', zIndex: 9998,
      background: 'var(--bg-prompt)',
      border: '1px solid rgba(26,154,140,0.25)',
      borderRadius: 18, padding: '18px 20px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.45s cubic-bezier(0.16,1,0.3,1)',
      willChange: 'opacity,transform',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(26,154,140,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <RefreshCw size={20} color={COLORS.teal} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            {t.pwa.updateAvailable}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t.pwa.newVersion}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => setShow(false)} style={{
          background: 'none', border: '1px solid var(--border-md)',
          color: 'var(--text-secondary)', borderRadius: 12, padding: '9px 18px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer'
        }}>{t.pwa.later}</button>
        <button onClick={handleUpdate} style={{
          background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealLight})`,
          border: 'none', color: '#fff', borderRadius: 12,
          padding: '9px 22px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <RefreshCw size={14} />{t.pwa.update}
        </button>
      </div>
    </div>
  );
}
