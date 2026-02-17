import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { loadData, saveData } from '../utils/storage.js';
import { cloudLoad, cloudSave, mergeData } from '../utils/cloudSync.js';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [hist, setHist] = useState(() => loadData()?.hist || []);
  const [prof, setProf] = useState(() => loadData()?.prof || []);
  const [st, setSt] = useState(() => loadData()?.st || { exp: true, tmr: true, shf: true });
  const [showOnboarding, setShowOnboarding] = useState(() => {
    const data = loadData();
    if (data?.hist?.length > 0 || data?.prof?.length > 0) return false;
    return !localStorage.getItem('entprep_onboarded');
  });

  const syncedRef = useRef(false);
  const saveTimer = useRef(null);

  const debouncedCloudSave = useCallback((userId, data) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => cloudSave(userId, data), 1000);
  }, []);

  // Cloud sync: on user login merge data
  useEffect(() => {
    if (!user) {
      syncedRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const cloud = await cloudLoad(user.id);
      if (cancelled) return;
      const local = { hist, prof, st };
      const merged = mergeData(local, cloud);
      setHist(merged.hist);
      setProf(merged.prof);
      setSt(merged.st);
      syncedRef.current = true;
      await cloudSave(user.id, merged);
    })();
    return () => { cancelled = true; };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist to localStorage + cloud
  useEffect(() => {
    saveData({ hist, st, prof, lastLogin: new Date().toISOString() });
    if (user && syncedRef.current) debouncedCloudSave(user.id, { hist, prof, st });
  }, [hist, st, prof]); // eslint-disable-line react-hooks/exhaustive-deps

  const addHist = useCallback((result) => {
    setHist(prev => [...prev, result]);
  }, []);

  const clearHist = useCallback(() => {
    setHist([]);
  }, []);

  const updSt = useCallback((newSt) => {
    setSt(newSt);
  }, []);

  const confirmProfile = useCallback((sel) => {
    setProf(sel);
  }, []);

  const resetProfile = useCallback(() => {
    setProf([]);
  }, []);

  const finishOnboarding = useCallback(() => {
    localStorage.setItem('entprep_onboarded', '1');
    setShowOnboarding(false);
  }, []);

  return (
    <AppContext.Provider
      value={{
        hist, prof, st,
        showOnboarding,
        addHist, clearHist, updSt,
        confirmProfile, resetProfile,
        finishOnboarding,
        setProf, setHist, setSt,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
