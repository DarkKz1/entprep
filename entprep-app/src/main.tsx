import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initSentry } from './config/sentry'
import { Capacitor } from '@capacitor/core'

initSentry();

// Handle OAuth deep links in native app
if (Capacitor.isNativePlatform()) {
  import('@capacitor/app').then(({ App: CapApp }) => {
    CapApp.addListener('appUrlOpen', ({ url }) => {
      // OAuth callback: https://entprep.netlify.app/#access_token=...
      const hash = url.split('#')[1];
      if (hash) {
        window.location.hash = hash;
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
