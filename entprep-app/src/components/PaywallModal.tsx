import React, { useState, useEffect, useCallback } from 'react';
import BottomSheet from './ui/BottomSheet';
import { Crown, Sparkles, Bot, GraduationCap, Headphones, RotateCcw, Loader2 } from 'lucide-react';
import { COLORS } from '../constants/styles';
import { useT } from '../locales';
import type { PaywallReason } from '../types';
import type { PlanType } from '../config/payment';
import {
  isNativePlatform,
  getOfferings,
  purchasePackage,
  restorePurchases,
  type RCPackage,
} from '../config/purchases';

interface PaywallModalProps {
  open: boolean;
  reason: PaywallReason;
  onClose: () => void;
}

const BENEFIT_ICONS = [Bot, Sparkles, GraduationCap, Headphones];
const BENEFIT_COLORS = [COLORS.teal, COLORS.cyan, COLORS.teal, COLORS.accent];

const STORE_LINKS = {
  android: 'https://play.google.com/store/apps/details?id=kz.entprep.app',
  ios: 'https://apps.apple.com/app/entprep/id6760261689',
};

export default function PaywallModal({ open, reason, onClose }: PaywallModalProps) {
  const t = useT();
  const [plan, setPlan] = useState<PlanType>('yearly');
  const [packages, setPackages] = useState<{ monthly?: RCPackage; yearly?: RCPackage }>({});
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState('');
  const isNative = isNativePlatform();

  // Fetch offerings on open (native only)
  useEffect(() => {
    if (!open || !isNative) return;
    setLoading(true);
    setError('');
    getOfferings()
      .then(offering => {
        if (!offering) return;
        const pkgs: typeof packages = {};
        for (const pkg of offering.availablePackages) {
          if (pkg.identifier === '$rc_monthly') pkgs.monthly = pkg;
          else if (pkg.identifier === '$rc_annual') pkgs.yearly = pkg;
        }
        setPackages(pkgs);
      })
      .catch(() => setError(t.error))
      .finally(() => setLoading(false));
  }, [open, isNative, t.error]);

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

  const monthlyPrice = packages.monthly?.product?.priceString || '1 990 \u20B8/мес';
  const yearlyPrice = packages.yearly?.product?.priceString || '4 990 \u20B8/год';

  const handlePay = useCallback(async () => {
    if (!isNative) {
      // Web: direct to app store
      const ua = navigator.userAgent.toLowerCase();
      const link = /iphone|ipad|mac/.test(ua) ? STORE_LINKS.ios : STORE_LINKS.android;
      window.open(link, '_blank');
      return;
    }

    const pkg = plan === 'monthly' ? packages.monthly : packages.yearly;
    if (!pkg) return;

    setPurchasing(true);
    setError('');
    try {
      const success = await purchasePackage(pkg);
      if (success) {
        onClose();
        window.location.reload(); // refresh premium state
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      // User cancelled — not an error
      if (code !== 'PURCHASE_CANCELLED' && code !== '1') {
        setError(t.error);
      }
    } finally {
      setPurchasing(false);
    }
  }, [isNative, plan, packages, onClose, t.error]);

  const handleRestore = useCallback(async () => {
    if (!isNative) return;
    setPurchasing(true);
    setError('');
    try {
      const success = await restorePurchases();
      if (success) {
        onClose();
        window.location.reload();
      } else {
        setError(t.paywall.noPurchaseFound);
      }
    } catch {
      setError(t.error);
    } finally {
      setPurchasing(false);
    }
  }, [isNative, onClose, t.paywall.noPurchaseFound, t.error]);

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
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
            <Loader2 size={24} color={COLORS.accent} style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
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
                {monthlyPrice}
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
                {yearlyPrice}
              </div>
            </button>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handlePay}
          disabled={purchasing}
          style={{
            width: '100%', padding: '15px',
            background: purchasing ? 'var(--bg-muted)' : `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.accentDark})`,
            color: '#fff', border: 'none', borderRadius: 14,
            fontSize: 15, fontWeight: 700, cursor: purchasing ? 'default' : 'pointer',
            boxShadow: purchasing ? 'none' : '0 4px 20px rgba(255,107,53,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: purchasing ? 0.7 : 1,
          }}
        >
          {purchasing ? (
            <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />{t.paywall.purchasing}</>
          ) : (
            <><Crown size={18} />{isNative ? t.paywall.getPremium : t.paywall.webOnly}</>
          )}
        </button>

        <button
          onClick={isNative ? handleRestore : onClose}
          disabled={purchasing}
          style={{
            width: '100%', padding: '12px', marginTop: 8,
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 12, color: 'var(--text-secondary)',
            fontSize: 12, fontWeight: 500, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          {isNative && <RotateCcw size={14} />}
          {t.paywall.alreadyPaid}
        </button>
      </div>
    </BottomSheet>
  );
}
