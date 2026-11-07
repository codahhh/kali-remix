import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { PreferencesProvider } from './state/PreferencesContext';
import { ToastProvider } from './state/ToastContext';
import { FsProvider } from './state/FsContext';
import { PwaProvider } from './state/PwaContext';
import { WindowProvider } from './state/WindowContext';
import { applyThemeToDocument, loadPreferences } from './lib/prefs';

applyThemeToDocument(loadPreferences().prefs);

const container = document.getElementById('root');
if (!container) throw new Error('Root container missing');

createRoot(container).render(
  <StrictMode>
    <PreferencesProvider>
      <ToastProvider>
        <FsProvider>
          <PwaProvider>
            <WindowProvider>
              <App />
            </WindowProvider>
          </PwaProvider>
        </FsProvider>
      </ToastProvider>
    </PreferencesProvider>
  </StrictMode>,
);

// The service worker is production-only: it keeps dev servers and HMR predictable.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swUrl = new URL('sw.js', document.baseURI).toString();
    navigator.serviceWorker
      .register(swUrl, { scope: new URL('.', document.baseURI).pathname })
      .catch(() => {
        /* Offline installation is optional; the app works without it. */
      });
  });
}
