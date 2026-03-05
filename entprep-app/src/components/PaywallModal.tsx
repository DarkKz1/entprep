import React from 'react';
import BottomSheet from './ui/BottomSheet';
import { Crown, Sparkles, Bot, GraduationCap, Infinity } from 'lucide-react';
import { COLORS } from '../constants/styles';
import { useT } from '../locales';
import type { PaywallReason } from '../types';

interface PaywallModalProps {
  open: boolean;
  reason: PaywallReason;
  onClose: () => void;
}

const BENEFIT_ICONS = [Infinity, Bot, Sparkles, GraduationCap];
const BENEFIT_COLORS = [COLORS.accent, COLORS.teal, COLORS.cyan, COLORS.teal];

export default function PaywallModal({ open, reason, onClose }: PaywallModalProps) {
  const t = useT();
  if (!reason) return null;

  const titles: Record<string, string> = {
    daily_limit: t.paywall.dailyLimit,
    fullent: t.paywall.fullent,
    ai: t.paywall.ai,
  };

  const descs: Record<string, string> = {
    daily_limit: t.paywall.dailyLimitDesc,
    fullent: t.paywall.fullentDesc,
    ai: t.paywall.aiDesc,
  };

  const benefitLabels = [
    t.paywall.unlimitedTests,
    t.paywall.aiErrors,
    t.paywall.aiPlan,
    t.paywall.fullEntSim,
  ];

  return (
    <BottomSheet visible={open} onClose={onClose}>
      <div style={{ textAlign: 'center', padding: '4px 0' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <Crown size={28} color="#fff" />
        </div>

        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          {titles[reason] || 'Premium'}
        </div>

        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
          {descs[reason] || ''}
        </div>

        <div style={{
          background: 'var(--bg-subtle)',
          border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 16px',
          marginBottom: 16, textAlign: 'left',
        }}>
          {benefitLabels.map((label, i) => {
            const Icon = BENEFIT_ICONS[i];
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0',
                borderBottom: i < benefitLabels.length - 1 ? '1px solid var(--border-light)' : 'none',
              }}>
                <Icon size={18} color={BENEFIT_COLORS[i]} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--text-body)', fontWeight: 500 }}>{label}</span>
              </div>
            );
          })}
        </div>

        <div style={{
          fontSize: 22, fontWeight: 800, color: COLORS.accent,
          fontFamily: "'Unbounded', sans-serif", marginBottom: 4,
        }}>
          {t.paywall.price}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
          {t.paywall.cancelAnytime}
        </div>

        <button
          onClick={() => window.open('https://kaspi.kz/pay/entprep', '_blank')}
          style={{
            width: '100%', padding: '15px',
            background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
            color: '#fff', border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(255,107,53,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Crown size={18} />{t.paywall.getPremium}
        </button>

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '12px', marginTop: 8,
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 12, color: 'var(--text-secondary)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {t.paywall.alreadyPaid}
        </button>
      </div>
    </BottomSheet>
  );
}
