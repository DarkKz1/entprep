import React, { createContext, useContext, useState, useCallback } from 'react';
import { SCREENS } from '../constants/screens.js';
import { parseChallengeUrl } from '../utils/shareHelpers.js';

const NavigationContext = createContext(null);

export function NavigationProvider({ children }) {
  const [challengeData] = useState(() => parseChallengeUrl());
  const [screen, setScreen] = useState(() => {
    if (parseChallengeUrl()) return SCREENS.CHALLENGE;
    const p = new URLSearchParams(window.location.search).get('screen');
    return ['fullent', 'prog', 'calc'].includes(p) ? p : SCREENS.HOME;
  });
  const [curSub, setCurSub] = useState(null);
  const [selTopic, setSelTopic] = useState(null);
  const [customQs, setCustomQs] = useState(null);
  const [tab, setTab] = useState(SCREENS.HOME);

  const nav = useCallback((target, sub, topic) => {
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
    } else if (target === 'errors_test' && sub) {
      setCustomQs(sub);
      setCurSub(sub[0]?._su || 'math');
      setSelTopic(null);
      setScreen(SCREENS.TEST);
    } else if (target === 'admin') {
      setScreen(SCREENS.ADMIN);
    } else {
      setScreen(SCREENS.HOME);
    }
  }, []);

  const goHome = useCallback(() => {
    setScreen(SCREENS.HOME);
    setTab(SCREENS.HOME);
  }, []);

  const changeTab = useCallback((t) => {
    setTab(t);
    if (t === 'prog') setScreen(SCREENS.PROGRESS);
    else if (t === 'set') setScreen(SCREENS.SETTINGS);
    else if (t === 'adaptive') setScreen(SCREENS.ADAPTIVE);
    else setScreen(SCREENS.HOME);
  }, []);

  const goBack = useCallback((fallback) => {
    if (fallback) {
      setScreen(fallback);
    } else {
      setScreen(SCREENS.HOME);
      setTab(SCREENS.HOME);
    }
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        screen, setScreen,
        curSub, setCurSub,
        selTopic, setSelTopic,
        customQs, setCustomQs,
        tab, setTab,
        challengeData,
        nav, goHome, changeTab, goBack,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNav() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error('useNav must be used within NavigationProvider');
  return ctx;
}
