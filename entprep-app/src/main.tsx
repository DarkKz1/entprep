import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initSentry } from './config/sentry'
import { Capacitor } from '@capacitor/core'

initSentry();

// Handle OAuth deep links in native app
if (Capacitor.isNativePlatform()) {
  Promise.all([
    import('@capacitor/app'),
    import('@capacitor/browser'),
    import('./config/supabase'),
  ]).then(([{ App: CapApp }, { Browser }, { supabase: sb }]) => {
    CapApp.addListener('appUrlOpen', async ({ url }) => {
      if (!sb) return;
      await Browser.close();

      // PKCE flow (Supabase v2+): kz.entprep.app://auth?code=...
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      if (code) {
        await sb.auth.exchangeCodeForSession(code);
        window.location.reload();
        return;
      }

      // Legacy implicit flow fallback: ...#access_token=...
      const hash = url.split('#')[1];
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token && refresh_token) {
          await sb.auth.setSession({ access_token, refresh_token });
          window.location.reload();
        }
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
