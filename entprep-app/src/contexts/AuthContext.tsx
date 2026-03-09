import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { setUser as setSentryUser } from '../config/sentry';
import { getMyProfile } from '../utils/socialHelpers';
import type { AuthUser, Profile } from '../types/index';
import { trackEvent } from '../utils/analytics';
import { ADMIN_EMAILS } from '../config/app';
import { initPurchases, loginPurchases, logoutPurchases, checkPremiumStatus } from '../config/purchases';

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  isPremium: boolean;
  isAdmin: boolean;
  needsNickname: boolean;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [nativePremium, setNativePremium] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!supabase) return;
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch {
      // Profile fetch failed — will retry on next auth change
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    setUser((session?.user as AuthUser) ?? null);
  }, []);

  // Initialize RevenueCat on mount
  useEffect(() => {
    initPurchases().catch(() => {});
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = (session?.user as AuthUser) ?? null;
      setUser(u);
      setSentryUser(session?.user?.id ?? null);
      if (u) {
        refreshProfile();
        // Link RevenueCat user and check entitlements
        try {
          await loginPurchases(u.id, u.email ?? undefined);
          const hasPremium = await checkPremiumStatus();
          setNativePremium(hasPremium);
        } catch {
          // RC not available (web) — nativePremium stays false
        }
      } else {
        setProfile(null);
        setNativePremium(false);
        logoutPurchases().catch(() => {});
      }
      if (event === 'SIGNED_IN') trackEvent('Login');
    });
    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  const isAdmin = useMemo(() => !!user?.email && ADMIN_EMAILS.includes(user.email), [user]);
  const needsNickname = useMemo(() => !!profile && profile.nickname.startsWith('user_'), [profile]);

  // TODO: set to false when RevenueCat is fully configured
  const FREE_PREMIUM = true as boolean;
  const isPremium = useMemo(() => {
    if (FREE_PREMIUM || isAdmin || nativePremium) return true;
    const meta = user?.user_metadata;
    if (!meta || !meta.is_premium) return false;
    const until = meta.premium_until;
    if (typeof until !== 'string') return false;
    return new Date(until) > new Date();
  }, [FREE_PREMIUM, user, isAdmin, nativePremium]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, isPremium, isAdmin, needsNickname, refreshUser, refreshProfile }),
    [user, profile, isPremium, isAdmin, needsNickname, refreshUser, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
