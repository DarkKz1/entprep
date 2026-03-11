import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { loadData, saveData } from '../utils/storage';
import { cloudLoad, cloudSave, mergeData } from '../utils/cloudSync';
import { useAuth } from './AuthContext';
import { addWrongAnswers } from '../utils/srEngine';
import type { TestResult, Settings, GoalSettings, SRCard } from '../types/index';

interface AppContextValue {
  hist: TestResult[];
  prof: string[];
  st: Settings;
  srCards: SRCard[];
  syncError: string | null;
  showOnboarding: boolean;
  showAuthPrompt: boolean;
  addHist: (result: TestResult) => void;
  clearHist: () => void;
  updSt: (newSt: Settings) => void;
  confirmProfile: (sel: string[], goal?: GoalSettings) => void;
  resetProfile: () => void;
  finishOnboarding: () => void;
  finishAuthPrompt: () => void;
  addSrFromResult: (result: TestResult) => void;
  setSrCards: React.Dispatch<React.SetStateAction<SRCard[]>>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [hist, setHist] = useState<TestResult[]>(() => loadData()?.hist || []);
  const [prof, setProf] = useState<string[]>(() => loadData()?.prof || []);
  const [st, setSt] = useState<Settings>(() => loadData()?.st || { exp: true, tmr: true, shf: true, theme: 'dark' });
  const [srCards, setSrCards] = useState<SRCard[]>(() => loadData()?.srCards || []);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const data = loadData();
    if (data?.hist?.length && data.hist.length > 0 || data?.prof?.length && data.prof.length > 0) return false;
    return !localStorage.getItem('entprep_onboarded');
  });

  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const syncedRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const debouncedCloudSave = useCallback((userId: string, _data: { hist: TestResult[]; prof: string[]; st: Settings; srCards?: SRCard[] }) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      // Read fresh data from localStorage to avoid stale closure
      const fresh = loadData();
      const data = fresh ? { hist: fresh.hist || [], prof: fresh.prof || [], st: fresh.st || _data.st, srCards: fresh.srCards || _data.srCards || [] } : _data;
      const result = await cloudSave(userId, data);
      if (!result.ok) setSyncError(result.error ?? null);
      else setSyncError(null);
    }, 1000);
  }, []);

  useEffect(() => {
    if (!user) {
      syncedRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const cloud = await cloudLoad(user.id);
      if (cancelled) return;
      // Read fresh local data from localStorage (not stale closure values)
      const stored = loadData();
      const local = { hist: stored?.hist || [], prof: stored?.prof || [], st: stored?.st || { exp: true, tmr: true, shf: true, theme: 'dark' as const }, srCards: stored?.srCards || [] };
      const merged = mergeData(local, cloud);
      setHist(merged.hist);
      setProf(merged.prof);
      setSt(merged.st);
      setSrCards(merged.srCards || []);
      syncedRef.current = true;
      await cloudSave(user.id, merged);
    })();
    return () => { cancelled = true; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', st.theme === 'light' ? '#f5f5f7' : '#0f0f1a');
  }, [st.theme]);

  useEffect(() => {
    saveData({ hist, st, prof, srCards, lastLogin: new Date().toISOString() });
    if (user && syncedRef.current) debouncedCloudSave(user.id, { hist, prof, st, srCards });
  }, [hist, st, prof, srCards]); // eslint-disable-line react-hooks/exhaustive-deps

  const addHist = useCallback((result: TestResult) => {
    setHist(prev => [...prev, result]);
  }, []);

  const clearHist = useCallback(() => {
    setHist([]);
  }, []);

  const addSrFromResult = useCallback((result: TestResult) => {
    setSrCards(prev => addWrongAnswers(prev, result));
  }, []);

  const updSt = useCallback((newSt: Settings) => {
    setSt(newSt);
  }, []);

  const confirmProfile = useCallback((sel: string[], goal?: GoalSettings) => {
    setProf(sel);
    // Save immediately to localStorage so it persists even if app is closed before useEffect fires
    try {
      const current = loadData();
      const currentSt = current?.st || { exp: true, tmr: true, shf: true, theme: 'dark' };
      const newSt = goal ? { ...currentSt, goal } : currentSt;
      if (goal) setSt(newSt);
      saveData({ hist: current?.hist || [], st: newSt, prof: sel, lastLogin: new Date().toISOString() });
    } catch {}
    // Show auth prompt for unauthenticated first-time users
    if (!user && !localStorage.getItem('entprep_auth_prompted')) {
      setShowAuthPrompt(true);
    }
  }, [user]);

  const resetProfile = useCallback(() => {
    setProf([]);
  }, []);

  const finishOnboarding = useCallback(() => {
    localStorage.setItem('entprep_onboarded', '1');
    setShowOnboarding(false);
  }, []);

  const finishAuthPrompt = useCallback(() => {
    localStorage.setItem('entprep_auth_prompted', '1');
    setShowAuthPrompt(false);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      hist, prof, st, srCards, syncError,
      showOnboarding, showAuthPrompt,
      addHist, clearHist, updSt,
      confirmProfile, resetProfile,
      finishOnboarding, finishAuthPrompt,
      addSrFromResult, setSrCards,
    }),
    [hist, prof, st, srCards, syncError, showOnboarding, showAuthPrompt, addHist, clearHist, updSt, confirmProfile, resetProfile, finishOnboarding, finishAuthPrompt, addSrFromResult],
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
