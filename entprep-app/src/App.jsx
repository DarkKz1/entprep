import React, { Suspense } from "react";
import { TOTAL_Q } from './config/questionPools.js';
import { GLOBAL_STYLES } from './constants/styles.js';
import { SCREENS } from './constants/screens.js';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { AppProvider, useApp } from './contexts/AppContext.jsx';
import { NavigationProvider, useNav } from './contexts/NavigationContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LoadingSpinner from './components/ui/LoadingSpinner.jsx';
import { Home as HomeIcon, Brain, BarChart3, Settings as SettingsIcon } from 'lucide-react';
import ProfileSelect from './components/ProfileSelect.jsx';
import Home from './components/Home.jsx';
import Progress from './components/Progress.jsx';
import Settings from './components/Settings.jsx';
import Adaptive from './components/Adaptive.jsx';
import SubjectDetail from './components/SubjectDetail.jsx';
import Challenge from './components/Challenge.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import OfflineBanner from './components/OfflineBanner.jsx';
import UpdatePrompt from './components/UpdatePrompt.jsx';
import Onboarding from './components/Onboarding.jsx';

const Test = React.lazy(() => import('./components/Test.jsx'));
const FullENT = React.lazy(() => import('./components/FullENT.jsx'));
const Calc = React.lazy(() => import('./components/Calc.jsx'));
const ErrorReview = React.lazy(() => import('./components/ErrorReview.jsx'));
const Admin = React.lazy(() => import('./components/Admin.jsx'));

const NAV_ITEMS = [
  { id: "home", l: "Главная", Icon: HomeIcon },
  { id: "adaptive", l: "Анализ", Icon: Brain },
  { id: "prog", l: "Прогресс", Icon: BarChart3 },
  { id: "set", l: "Настройки", Icon: SettingsIcon },
];

function AppContent() {
  const { screen, curSub, selTopic, customQs, tab, challengeData, nav, goHome, changeTab, setScreen, setTab, setCustomQs, setSelTopic } = useNav();
  const { hist, prof, st, showOnboarding, addHist, confirmProfile, resetProfile, finishOnboarding, updSt, clearHist } = useApp();

  const needProfile = prof.length === 0 && screen !== SCREENS.PROFILE;
  const showNav = !needProfile && screen !== SCREENS.TEST && screen !== SCREENS.FULL_ENT && screen !== SCREENS.PROFILE && screen !== SCREENS.SUBJECT && screen !== SCREENS.ERROR_REVIEW && screen !== SCREENS.ADMIN && screen !== SCREENS.CHALLENGE && !showOnboarding;

  const handleFinish = (result) => { addHist(result); goHome(); };

  const handleConfirmProfile = (sel) => { confirmProfile(sel); goHome(); };

  const handleResetProfile = () => { resetProfile(); setScreen(SCREENS.PROFILE); setTab(SCREENS.HOME); };

  if (showOnboarding) return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", fontFamily: "'Segoe UI',-apple-system,sans-serif", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{GLOBAL_STYLES}</style>
      <Onboarding onFinish={finishOnboarding} />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f1a", fontFamily: "'Segoe UI',-apple-system,sans-serif", maxWidth: 480, margin: "0 auto", position: "relative" }}>
      <style>{GLOBAL_STYLES}</style>
      <OfflineBanner />
      <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(15,15,26,0.6)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <div style={{ fontSize: 15, fontWeight: 800, fontFamily: "'Unbounded',sans-serif" }}>
          <span style={{ color: "#FF6B35" }}>ENT</span>
          <span style={{ color: "#0EA5E9" }}>prep</span>
          <span style={{ fontSize: 9, color: "#64748b", marginLeft: 6 }}>v5 • {TOTAL_Q}q</span>
        </div>
      </div>
      <div key={screen} style={{ paddingTop: 10, animation: "screenIn 0.35s cubic-bezier(0.16,1,0.3,1)", willChange: "opacity,transform" }}>
        {needProfile && <ProfileSelect onConfirm={handleConfirmProfile} />}
        {!needProfile && screen === SCREENS.PROFILE && <ProfileSelect onConfirm={handleConfirmProfile} />}
        {!needProfile && screen === SCREENS.HOME && <Home />}
        {!needProfile && screen === SCREENS.SUBJECT && curSub && <SubjectDetail sid={curSub} />}
        {!needProfile && screen === SCREENS.CHALLENGE && challengeData && <Challenge data={challengeData} />}
        <Suspense fallback={<LoadingSpinner />}>
          {!needProfile && screen === SCREENS.TEST && curSub && <Test sid={curSub} tid={selTopic} customQs={customQs} finish={handleFinish} />}
          {!needProfile && screen === SCREENS.CALC && <Calc />}
          {!needProfile && screen === SCREENS.FULL_ENT && <FullENT finish={handleFinish} />}
          {!needProfile && screen === SCREENS.ERROR_REVIEW && <ErrorReview />}
          {!needProfile && screen === SCREENS.ADMIN && <Admin />}
        </Suspense>
        {!needProfile && screen === SCREENS.ADAPTIVE && <Adaptive />}
        {!needProfile && screen === SCREENS.PROGRESS && <Progress />}
        {!needProfile && screen === SCREENS.SETTINGS && <Settings />}
      </div>
      {showNav && (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(15,15,26,0.75)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderTop: "1px solid rgba(255,255,255,0.06)", padding: "8px 16px 14px", display: "flex", justifyContent: "space-around" }}>
          {NAV_ITEMS.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => changeTab(t.id)} style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: "6px 18px", borderRadius: 12, transition: "all 0.2s", position: "relative" }}>
                <t.Icon size={22} strokeWidth={active ? 2.2 : 1.8} color={active ? "#FF6B35" : "#64748b"} style={{ transition: "color 0.2s" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: active ? "#FF6B35" : "#64748b", marginTop: 4, transition: "color 0.2s" }}>{t.l}</span>
                {active && <div style={{ width: 16, height: 3, borderRadius: 2, background: "#FF6B35", marginTop: 3, animation: "scaleIn 0.2s ease" }} />}
              </button>
            );
          })}
        </div>
      )}
      <InstallPrompt />
      <UpdatePrompt />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <NavigationProvider>
            <AppContent />
          </NavigationProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
