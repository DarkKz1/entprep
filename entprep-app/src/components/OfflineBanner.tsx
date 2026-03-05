import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useT } from '../locales';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const t = useT();

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, zIndex: 10000,
      background: 'linear-gradient(90deg, #b45309, #d97706)',
      padding: '9px 16px', textAlign: 'center',
      fontSize: 12, fontWeight: 600, color: '#fff',
      animation: 'slideDown 0.4s cubic-bezier(0.16,1,0.3,1)',
      willChange: 'opacity,transform',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      <WifiOff size={14} />{t.pwa.offline}
    </div>
  );
}
