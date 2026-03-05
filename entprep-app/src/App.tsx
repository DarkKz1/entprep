import React, { Suspense, useEffect, useRef, useState } from "react";
import { TOTAL_Q } from './config/questionPools';
import { prefetchCounts, getTotalQ } from './utils/questionStore';
import { GLOBAL_STYLES, LAYOUT, COLORS } from './constants/styles';
import { DARK, LIGHT, themeToCss } from './constants/themes';
import { SCREENS } from './constants/screens';
import { useBreakpoint } from './hooks/useBreakpoint';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider, useApp } from './contexts/AppContext';
import { NavigationProvider, useNav } from './contexts/NavigationContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { useT } from './locales';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';
import { Home as HomeIcon, Brain, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ProfileSelect from './components/ProfileSelect';
import Home from './components/Home';
import Progress from './components/Progress';
import Settings from './components/Settings';
import Adaptive from './components/Adaptive';
import SubjectDetail from './components/SubjectDetail';
import Challenge from './components/Challenge';
import InstallPrompt from './components/InstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import UpdatePrompt from './components/UpdatePrompt';
import PaywallModal from './components/PaywallModal';
import Onboarding from './components/Onboarding';
import AuthPrompt from './components/AuthPrompt';
import PushPrompt from './components/PushPrompt';
import { supabase } from './config/supabase';
import { useAuth } from './contexts/AuthContext';
import type { TestResult } from './types';

const submitLeaderboard = async (result: TestResult) => {
  if (!supabase || result.type === 'fullent') return;
  try {
    const session = await supabase.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) return;
    await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ subject: result.su, score: result.sc }),
    });
  } catch { /* silently fail */ }
};

const Test = React.lazy(() => import('./components/Test'));
const FullENT = React.lazy(() => import('./components/FullENT'));
const Calc = React.lazy(() => import('./components/Calc'));
const ErrorReview = React.lazy(() => import('./components/ErrorReview'));
const Admin = React.lazy(() => import('./components/Admin'));
const Leaderboard = React.lazy(() => import('./components/Leaderboard'));
const Friends = React.lazy(() => import('./components/Friends'));
const Duel = React.lazy(() => import('./components/Duel'));

interface NavItem {
  id: string;
  key: 'home' | 'adaptive' | 'progress' | 'settings';
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", key: "home", Icon: HomeIcon },
  { id: "adaptive", key: "adaptive", Icon: Brain },
  { id: "prog", key: "progress", Icon: BarChart3 },
  { id: "set", key: "settings", Icon: SettingsIcon },
];

function AppContent() {
  const { screen, curSub, selTopic, customQs, tab, challengeData, paywallReason, nav, goHome, changeTab, setScreen, setTab, setCustomQs, setSelTopic, closePaywall } = useNav();
  const { hist, prof, st, syncError, showOnboarding, showAuthPrompt, addHist, confirmProfile, resetProfile, finishOnboarding, finishAuthPrompt, updSt, clearHist } = useApp();
  const toast = useToast();
  const tr = useT();
  const bp = useBreakpoint();
  const isDesktop = bp === 'desktop';

  const isDark = st.theme !== 'light';
  const palette = isDark ? DARK : LIGHT;

  useEffect(() => {
    const splash = document.getElementById('splash');
    if (splash) {
      splash.classList.add('hide');
      setTimeout(() => splash.remove(), 400);
    }
  }, []);

  const [totalQ, setTotalQ] = useState(TOTAL_Q);
  useEffect(() => { prefetchCounts().then(ok => { if (ok) setTotalQ(getTotalQ()); }); }, []);

  const prevSyncError = useRef<string | null>(null);
  useEffect(() => {
    if (syncError && syncError !== prevSyncError.current) {
      toast.warning(tr.auth.syncFailed);
    }
    prevSyncError.current = syncError;
  }, [syncError]); // eslint-disable-line react-hooks/exhaustive-deps

  const needProfile = prof.length === 0 && screen !== SCREENS.PROFILE;
  const showNav = !needProfile && screen !== SCREENS.TEST && screen !== SCREENS.FULL_ENT && screen !== SCREENS.PROFILE && screen !== SCREENS.SUBJECT && screen !== SCREENS.ERROR_REVIEW && screen !== SCREENS.ADMIN && screen !== SCREENS.CHALLENGE && screen !== SCREENS.LEADERBOARD && screen !== SCREENS.FRIENDS && screen !== SCREENS.DUEL && !showOnboarding && !showAuthPrompt;

  const { user } = useAuth();
  const handleFinish = (result: TestResult) => { addHist(result); if (user) { submitLeaderboard(result); } goHome(); };
  const handleConfirmProfile = (sel: string[], goal?: import('./types/index').GoalSettings) => { confirmProfile(sel, goal); goHome(); };
  const handleResetProfile = () => { resetProfile(); setScreen(SCREENS.PROFILE); setTab(SCREENS.HOME); };

  if (showOnboarding) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Segoe UI',-apple-system,sans-serif", maxWidth: LAYOUT.maxWidth, margin: "0 auto", position: "relative" }}>
      <style>{`:root{${themeToCss(palette)}}${GLOBAL_STYLES}`}</style>
      <Onboarding onFinish={finishOnboarding} />
    </div>
  );

  if (showAuthPrompt) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Segoe UI',-apple-system,sans-serif", maxWidth: LAYOUT.maxWidth, margin: "0 auto", position: "relative" }}>
      <style>{`:root{${themeToCss(palette)}}${GLOBAL_STYLES}`}</style>
      <AuthPrompt onFinish={finishAuthPrompt} />
    </div>
  );

  const mainContent = (
    <>
      <main role="main" key={screen} style={{ paddingTop: 10, animation: "screenIn 0.35s cubic-bezier(0.16,1,0.3,1)", willChange: "opacity,transform" }}>
        {needProfile && <ProfileSelect onConfirm={handleConfirmProfile} />}
        {!needProfile && screen === SCREENS.PROFILE && <ProfileSelect onConfirm={handleConfirmProfile} />}
        {!needProfile && screen === SCREENS.HOME && <Home />}
        {!needProfile && screen === SCREENS.SUBJECT && curSub && (
          <ErrorBoundary key="subject" title="Ошибка предмета" message="Не удалось загрузить предмет." onRecover={goHome}>
            <SubjectDetail sid={curSub} />
          </ErrorBoundary>
        )}
        {!needProfile && screen === SCREENS.CHALLENGE && challengeData && (
          <ErrorBoundary key="challenge" title="Ошибка челленджа" message="Не удалось загрузить челлендж." onRecover={goHome}>
            <Challenge data={challengeData} />
          </ErrorBoundary>
        )}
        <Suspense fallback={<LoadingSpinner />}>
          {!needProfile && screen === SCREENS.TEST && curSub && (
            <ErrorBoundary key="test" title="Ошибка теста" message="Произошла ошибка во время теста." onRecover={goHome}>
              <Test sid={curSub} tid={selTopic} customQs={customQs} finish={handleFinish} />
            </ErrorBoundary>
          )}
          {!needProfile && screen === SCREENS.CALC && (
            <ErrorBoundary key="calc" title="Ошибка калькулятора" message="Не удалось загрузить калькулятор." onRecover={goHome}>
              <Calc />
            </ErrorBoundary>
          )}
          {!needProfile && screen === SCREENS.FULL_ENT && (
            <ErrorBoundary key="fullent" title="Ошибка пробного ЕНТ" message="Произошла ошибка при симуляции ЕНТ." onRecover={goHome}>
              <FullENT finish={handleFinish} />
            </ErrorBoundary>
          )}
          {!needProfile && screen === SCREENS.ERROR_REVIEW && (
            <ErrorBoundary key="errors" title="Ошибка работы над ошибками" message="Не удалось загрузить раздел." onRecover={goHome}>
              <ErrorReview />
            </ErrorBoundary>
          )}
          {!needProfile && screen === SCREENS.ADMIN && (
            <ErrorBoundary key="admin" title="Ошибка админ-панели" message="Не удалось загрузить админку." onRecover={goHome}>
              <Admin />
            </ErrorBoundary>
          )}
          {!needProfile && screen === SCREENS.LEADERBOARD && (
            <ErrorBoundary key="leaderboard" title="Ошибка таблицы лидеров" message="Не удалось загрузить таблицу лидеров." onRecover={goHome}>
              <Leaderboard />
            </ErrorBoundary>
          )}
          {!needProfile && screen === SCREENS.FRIENDS && (
            <ErrorBoundary key="friends" title="Ошибка друзей" message="Не удалось загрузить раздел друзей." onRecover={goHome}>
              <Friends />
            </ErrorBoundary>
          )}
          {!needProfile && screen === SCREENS.DUEL && (
            <ErrorBoundary key="duel" title="Ошибка дуэли" message="Не удалось загрузить дуэль." onRecover={goHome}>
              <Duel />
            </ErrorBoundary>
          )}
        </Suspense>
        {!needProfile && screen === SCREENS.ADAPTIVE && (
          <ErrorBoundary key="adaptive" title="Ошибка анализа" message="Не удалось загрузить анализ." onRecover={() => changeTab(SCREENS.HOME)}>
            <Adaptive />
          </ErrorBoundary>
        )}
        {!needProfile && screen === SCREENS.PROGRESS && (
          <ErrorBoundary key="progress" title="Ошибка прогресса" message="Не удалось загрузить прогресс." onRecover={() => changeTab(SCREENS.HOME)}>
            <Progress />
          </ErrorBoundary>
        )}
        {!needProfile && screen === SCREENS.SETTINGS && (
          <ErrorBoundary key="settings" title="Ошибка настроек" message="Не удалось загрузить настройки." onRecover={() => changeTab(SCREENS.HOME)}>
            <Settings />
          </ErrorBoundary>
        )}
      </main>
    </>
  );

  const sidebarNav = (
    <aside style={{ width: 220, flexShrink: 0, position: "sticky", top: 0, height: "100vh", background: "var(--bg-footer)", borderRight: "1px solid var(--border-light)", display: "flex", flexDirection: "column", padding: "20px 0" }}>
      <div style={{ padding: "0 20px 24px", fontSize: 15, fontWeight: 800, fontFamily: "'Unbounded',sans-serif" }}>
        <span style={{ color: COLORS.accent }}>ENT</span>
        <span style={{ color: COLORS.teal }}>prep</span>
        <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 6 }}>v5</span>
      </div>
      {NAV_ITEMS.map(ni => {
        const active = tab === ni.id;
        const label = tr.tabs[ni.key];
        return (
          <button key={ni.id} onClick={() => changeTab(ni.id)} aria-label={label} aria-current={active ? "page" : undefined} style={{ display: "flex", alignItems: "center", gap: 12, background: active ? "rgba(255,107,53,0.08)" : "none", border: "none", cursor: "pointer", padding: "12px 20px", borderRadius: 0, borderLeft: active ? `3px solid ${COLORS.accent}` : "3px solid transparent", transition: "all 0.2s", width: "100%", textAlign: "left" }}>
            <ni.Icon size={20} strokeWidth={active ? 2.2 : 1.8} color={active ? COLORS.accent : "var(--text-muted)"} style={{ transition: "color 0.2s" }} />
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? COLORS.accent : "var(--text-secondary)", transition: "color 0.2s" }}>{label}</span>
          </button>
        );
      })}
    </aside>
  );

  const bottomNav = (
    <nav role="navigation" aria-label={tr.tabs.home} style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: LAYOUT.maxWidth, background: "var(--bg-footer)", borderTop: "1px solid var(--border-light)", padding: "8px 16px 14px", display: "flex", justifyContent: "space-around" }}>
      {NAV_ITEMS.map(ni => {
        const active = tab === ni.id;
        const label = tr.tabs[ni.key];
        return (
          <button key={ni.id} onClick={() => changeTab(ni.id)} aria-label={label} aria-current={active ? "page" : undefined} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: "6px 18px", borderRadius: 12, transition: "all 0.2s", position: "relative" }}>
            <ni.Icon size={22} strokeWidth={active ? 2.2 : 1.8} color={active ? COLORS.accent : "var(--text-muted)"} style={{ transition: "color 0.2s" }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? COLORS.accent : "var(--text-muted)", marginTop: 4, transition: "color 0.2s" }}>{label}</span>
            {active && <div style={{ width: 16, height: 3, borderRadius: 2, background: COLORS.accent, marginTop: 3, animation: "scaleIn 0.2s ease" }} />}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "'Segoe UI',-apple-system,sans-serif" }}>
      <style>{`:root{${themeToCss(palette)}}${GLOBAL_STYLES}`}</style>
      <OfflineBanner />
      {isDesktop && showNav ? (
        <div style={{ display: "flex", minHeight: "100vh" }}>
          {sidebarNav}
          <div style={{ flex: 1, maxWidth: LAYOUT.maxWidth, margin: "0 auto", position: "relative" }}>
            <header role="banner" style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid var(--border-light)", background: "var(--bg-header)",  }}>
              <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Unbounded',sans-serif" }}>
                <span style={{ color: COLORS.accent }}>ENT</span>
                <span style={{ color: COLORS.teal }}>prep</span>
                <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 6 }}>v5 • {totalQ}q</span>
              </div>
            </header>
            {mainContent}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: LAYOUT.maxWidth, margin: "0 auto", position: "relative" }}>
          <header role="banner" style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid var(--border-light)", background: "var(--bg-header)",  }}>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Unbounded',sans-serif" }}>
              <span style={{ color: COLORS.accent }}>ENT</span>
              <span style={{ color: COLORS.teal }}>prep</span>
              <span style={{ fontSize: 9, color: "var(--text-muted)", marginLeft: 6 }}>v5 • {totalQ}q</span>
            </div>
          </header>
          {mainContent}
          {showNav && bottomNav}
        </div>
      )}
      <InstallPrompt />
      <UpdatePrompt />
      <PushPrompt />
      <PaywallModal open={paywallReason !== null} reason={paywallReason} onClose={closePaywall} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <NavigationProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </NavigationProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
