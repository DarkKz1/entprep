import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { SCREENS } from '../constants/screens';
import { parseChallengeUrl } from '../utils/shareHelpers';
import { parseDuelInviteParam } from '../utils/duelHelpers';
import type { Question, ChallengeData, PaywallReason } from '../types/index';

interface NavigationContextValue {
  screen: string;
  setScreen: React.Dispatch<React.SetStateAction<string>>;
  curSub: string | null;
  setCurSub: React.Dispatch<React.SetStateAction<string | null>>;
  selTopic: string | null;
  setSelTopic: React.Dispatch<React.SetStateAction<string | null>>;
  customQs: Question[] | null;
  setCustomQs: React.Dispatch<React.SetStateAction<Question[] | null>>;
  tab: string;
  setTab: React.Dispatch<React.SetStateAction<string>>;
  challengeData: ChallengeData | null;
  paywallReason: PaywallReason;
  nav: (target: string, sub?: string | null, topic?: string | null) => void;
  navToErrorTest: (questions: Question[]) => void;
  navToReview: () => void;
  goHome: () => void;
  changeTab: (t: string) => void;
  goBack: (fallback?: string) => void;
  closePaywall: () => void;
  openPaywall: (reason: PaywallReason) => void;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [challengeData] = useState<ChallengeData | null>(() => parseChallengeUrl());
  const [screen, setScreen] = useState(() => {
    if (parseChallengeUrl()) return SCREENS.CHALLENGE;
    const params = new URLSearchParams(window.location.search);
    if (params.get('add')) return SCREENS.FRIENDS;
    if (parseDuelInviteParam()) return SCREENS.DUEL;
    const p = params.get('screen');
    return ['fullent', 'prog', 'calc'].includes(p!) ? p! : SCREENS.HOME;
  });
  const [curSub, setCurSub] = useState<string | null>(null);
  const [selTopic, setSelTopic] = useState<string | null>(null);
  const [customQs, setCustomQs] = useState<Question[] | null>(null);
  const [tab, setTab] = useState<string>(SCREENS.HOME);
  const [paywallReason, setPaywallReason] = useState<PaywallReason>(null);

  const closePaywall = useCallback(() => setPaywallReason(null), []);
  const openPaywall = useCallback((reason: PaywallReason) => setPaywallReason(reason), []);

  const nav = useCallback((target: string, sub?: string | null, topic?: string | null) => {
    if (target === 'test' && sub) {
      setCurSub(sub);
      setSelTopic(topic || null);
      setCustomQs(null);
      setScreen(SCREENS.TEST);
    } else if (target === 'topics' && sub) {
      setCurSub(sub);
      setSelTopic(null);
      setScreen(SCREENS.SUBJECT);
    } else if (target === 'calc') {
      setScreen(SCREENS.CALC);
    } else if (target === 'fullent') {
      setScreen(SCREENS.FULL_ENT);
    } else if (target === 'adaptive') {
      setScreen(SCREENS.ADAPTIVE);
      setTab(SCREENS.ADAPTIVE);
    } else if (target === 'errors') {
      setScreen(SCREENS.ERROR_REVIEW);
    } else if (target === 'admin') {
      setScreen(SCREENS.ADMIN);
    } else if (target === 'leaderboard') {
      setScreen(SCREENS.LEADERBOARD);
    } else if (target === 'friends') {
      setScreen(SCREENS.FRIENDS);
    } else if (target === 'duel') {
      setScreen(SCREENS.DUEL);
    } else if (target === 'review') {
      setScreen(SCREENS.REVIEW);
    } else {
      setScreen(SCREENS.HOME);
    }
  }, []);

  const navToErrorTest = useCallback((questions: Question[]) => {
    setCustomQs(questions);
    setCurSub(questions[0]?._su || 'math');
    setSelTopic(null);
    setScreen(SCREENS.TEST);
  }, []);

  const navToReview = useCallback(() => {
    setScreen(SCREENS.REVIEW);
  }, []);

  const goHome = useCallback(() => {
    setScreen(SCREENS.HOME);
    setTab(SCREENS.HOME);
  }, []);

  const changeTab = useCallback((t: string) => {
    setTab(t);
    if (t === 'prog') setScreen(SCREENS.PROGRESS);
    else if (t === 'set') setScreen(SCREENS.SETTINGS);
    else if (t === 'adaptive') setScreen(SCREENS.ADAPTIVE);
    else setScreen(SCREENS.HOME);
  }, []);

  const goBack = useCallback((fallback?: string) => {
    if (fallback) {
      setScreen(fallback);
    } else {
      setScreen(SCREENS.HOME);
      setTab(SCREENS.HOME);
    }
  }, []);

  const value = useMemo<NavigationContextValue>(
    () => ({
      screen, setScreen,
      curSub, setCurSub,
      selTopic, setSelTopic,
      customQs, setCustomQs,
      tab, setTab,
      challengeData,
      paywallReason,
      nav, navToErrorTest, navToReview, goHome, changeTab, goBack,
      closePaywall, openPaywall,
    }),
    [screen, curSub, selTopic, customQs, tab, challengeData, paywallReason, nav, navToErrorTest, navToReview, goHome, changeTab, goBack, closePaywall, openPaywall],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNav(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNav must be used within NavigationProvider');
  return ctx;
}
