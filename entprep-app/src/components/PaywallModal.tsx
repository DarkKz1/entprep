import React, { useState } from 'react';
import BottomSheet from './ui/BottomSheet';
import { Crown, Sparkles, Bot, GraduationCap, Headphones } from 'lucide-react';
import { COLORS } from '../constants/styles';
import { useT } from '../locales';
import { getKaspiPayUrl } from '../config/payment';
import type { PaywallReason } from '../types';
import type { PlanType } from '../config/payment';

interface PaywallModalProps {
  open: boolean;
  reason: PaywallReason;
  onClose: () => void;
}

const BENEFIT_ICONS = [Bot, Sparkles, GraduationCap, Headphones];
const BENEFIT_COLORS = [COLORS.teal, COLORS.cyan, COLORS.teal, COLORS.accent];

export default function PaywallModal({ open, reason, onClose }: PaywallModalProps) {
  const t = useT();
  const [plan, setPlan] = useState<PlanType>('yearly');
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
    t.paywall.unlimitedAI,
    t.paywall.aiErrors,
    t.paywall.aiPlan,
    t.paywall.fullEntSim,
  ];

  const handlePay = () => {
    const url = getKaspiPayUrl(plan);
    if (url) window.open(url, '_blank');
  };

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

        {/* Benefits list */}
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

        {/* Plan selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setPlan('monthly')}
            style={{
              flex: 1, padding: '14px 10px', borderRadius: 12, cursor: 'pointer',
              background: plan === 'monthly' ? 'rgba(255,107,53,0.08)' : 'var(--bg-subtle)',
              border: plan === 'monthly' ? `2px solid ${COLORS.accent}` : '2px solid var(--border)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t.paywall.monthlyLabel}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: plan === 'monthly' ? COLORS.accent : 'var(--text)', fontFamily: "'Unbounded', sans-serif" }}>
              {t.paywall.monthlyPlan}
            </div>
          </button>

          <button
            onClick={() => setPlan('yearly')}
            style={{
              flex: 1, padding: '14px 10px', borderRadius: 12, cursor: 'pointer', position: 'relative',
              background: plan === 'yearly' ? 'rgba(255,107,53,0.08)' : 'var(--bg-subtle)',
              border: plan === 'yearly' ? `2px solid ${COLORS.accent}` : '2px solid var(--border)',
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: -8, right: 10,
              background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
              color: '#fff', fontSize: 9, fontWeight: 700,
              padding: '2px 8px', borderRadius: 6,
            }}>
              {t.paywall.yearlyBadge}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t.paywall.yearlyLabel}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: plan === 'yearly' ? COLORS.accent : 'var(--text)', fontFamily: "'Unbounded', sans-serif" }}>
              {t.paywall.yearlyPlan}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
              {t.paywall.yearlyPlanDesc}
            </div>
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={handlePay}
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
