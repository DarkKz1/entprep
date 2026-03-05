import React, { useState, useEffect } from 'react';
import { Bell, Flame, BookOpen, BarChart2 } from 'lucide-react';
import { COLORS } from '../constants/styles';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { useT } from '../locales';
import { isPushSupported, getPushPermission, subscribeToPush } from '../utils/pushHelpers';
import BottomSheet from './ui/BottomSheet';

const DISMISS_KEY = 'entprep_push_dismissed';
const PROMPTED_KEY = 'entprep_push_prompted';

export default function PushPrompt() {
  const { hist, st, updSt } = useApp();
  const { user } = useAuth();
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (getPushPermission() !== 'default') return; // already granted or denied
    if (!user) return; // push requires auth
    if (st.pushEnabled) return; // already enabled
    if (localStorage.getItem(PROMPTED_KEY)) return; // already accepted

    // Check dismiss — re-ask after 7 days
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const daysSince = (Date.now() - new Date(dismissedAt).getTime()) / 86400000;
      if (daysSince < 7) return;
    }

    // Check 3+ unique study days
    const uniqueDates = new Set(hist.map(h => h.dt));
    if (uniqueDates.size < 3) return;

    // Show after a short delay
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [hist, user, st.pushEnabled]);

  const handleEnable = async () => {
    const ok = await subscribeToPush();
    if (ok) {
      updSt({ ...st, pushEnabled: true, pushStreak: true, pushErrors: true, pushWeekly: true });
      localStorage.setItem(PROMPTED_KEY, 'true');
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
    setVisible(false);
  };

  return (
    <BottomSheet visible={visible} onClose={handleDismiss}>
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Bell size={28} color="#fff" />
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          {t.push?.promptTitle || 'Не забывай заниматься!'}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
          {t.push?.promptDesc || 'Включи уведомления, чтобы мы напомнили о серии и ошибках'}
        </div>

        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 14, padding: '10px 16px',
          marginBottom: 16, textAlign: 'left',
        }}>
          {[
            { Icon: Flame, color: COLORS.accent, text: t.push?.streakToggle || 'Напоминание о серии' },
            { Icon: BookOpen, color: COLORS.teal, text: t.push?.errorsToggle || 'Повтори ошибки' },
            { Icon: BarChart2, color: COLORS.cyan, text: t.push?.weeklyToggle || 'Еженедельный отчёт' },
          ].map((b, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 0',
              borderBottom: i < 2 ? '1px solid var(--border-light)' : 'none',
            }}>
              <b.Icon size={16} color={b.color} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--text-body)', fontWeight: 500 }}>{b.text}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleEnable}
          style={{
            width: '100%', padding: '15px',
            background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.tealDark})`,
            color: '#fff', border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Bell size={18} />{t.push?.promptEnable || 'Включить'}
        </button>

        <button
          onClick={handleDismiss}
          style={{
            width: '100%', padding: '12px', marginTop: 8,
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 12, color: 'var(--text-secondary)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {t.push?.later || 'Позже'}
        </button>
      </div>
    </BottomSheet>
  );
}
