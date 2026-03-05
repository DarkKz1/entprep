import React, { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { COLORS } from '../constants/styles';
import { useT } from '../locales';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface Navigator {
    standalone?: boolean;
  }
  interface Window {
    MSStream?: unknown;
  }
}

export default function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const t = useT();

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if (standalone) return;

    if (ios) {
      const dismissed = sessionStorage.getItem('entprep_install_dismissed');
      if (dismissed) return;
      const timer = setTimeout(() => { setIsIOS(true); setShow(true); }, 30000);
      return () => clearTimeout(timer);
    }

    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      deferredPrompt.current = e;
      const dismissed = sessionStorage.getItem('entprep_install_dismissed');
      if (!dismissed) {
        setTimeout(() => setShow(true), 30000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt.current) return;
    deferredPrompt.current.prompt();
    const result = await deferredPrompt.current.userChoice;
    if (result.outcome === 'accepted') setShow(false);
    deferredPrompt.current = null;
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('entprep_install_dismissed', '1');
  };

  if (!show) return null;

  return (
    <div role="alert" aria-label={t.pwa.installApp} style={{
      position: 'fixed', bottom: 74, left: '50%', transform: 'translateX(-50%)',
      width: 'calc(100% - 32px)', maxWidth: 448, zIndex: 9999,
      background: 'var(--bg-prompt)',
      border: '1px solid rgba(255,107,53,0.25)',
      borderRadius: 18, padding: '18px 20px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
      animation: 'slideUp 0.45s cubic-bezier(0.16,1,0.3,1)',
      willChange: 'opacity,transform',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,107,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Download size={20} color={COLORS.accent} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            {isIOS ? t.pwa.addToHome : t.pwa.installApp}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14 }}>
            {isIOS ? t.pwa.iosHint : t.pwa.quickAccess}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={handleDismiss} style={{
          background: 'none', border: '1px solid var(--border-md)',
          color: 'var(--text-secondary)', borderRadius: 12, padding: '9px 18px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer'
        }}>{t.pwa.later}</button>
        {!isIOS && (
          <button onClick={handleInstall} style={{
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentHover})`,
            border: 'none', color: '#fff', borderRadius: 12,
            padding: '9px 22px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Download size={14} />{t.pwa.install}
          </button>
        )}
      </div>
    </div>
  );
}
