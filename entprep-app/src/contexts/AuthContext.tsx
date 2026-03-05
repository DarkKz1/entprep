import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../config/supabase';
import { setUser as setSentryUser } from '../config/sentry';
import { getMyProfile } from '../utils/socialHelpers';
import type { AuthUser, Profile } from '../types/index';
import { trackEvent } from '../utils/analytics';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || "dzakpelov@gmail.com,monabekova2@gmail.com").split(",").map((e: string) => e.trim());

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

  useEffect(() => {
    if (!supabase) return;
    // Use onAuthStateChange as single source of truth (receives INITIAL_SESSION on mount)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = (session?.user as AuthUser) ?? null;
      setUser(u);
      setSentryUser(session?.user?.id ?? null);
      if (u) refreshProfile();
      else setProfile(null);
      if (event === 'SIGNED_IN') trackEvent('Login');
    });
    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  const isAdmin = useMemo(() => !!user?.email && ADMIN_EMAILS.includes(user.email), [user]);
  const needsNickname = useMemo(() => !!profile && profile.nickname.startsWith('user_'), [profile]);

  // TODO: set FREE_PREMIUM to false when launching paid premium
  const FREE_PREMIUM = true as boolean;
  const isPremium = useMemo(() => {
    if (FREE_PREMIUM || isAdmin) return true;
    const meta = user?.user_metadata;
    if (!meta || !meta.is_premium) return false;
    const until = meta.premium_until;
    if (typeof until !== 'string') return false;
    return new Date(until) > new Date();
  }, [FREE_PREMIUM, user, isAdmin]);

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
