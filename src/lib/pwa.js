// Manuelle Service-Worker-Registrierung für die Berater-Ansicht.
// Aufgerufen von src/components/Layout.jsx (nicht für /check/:uuid).

let registered = false;
let deferredPrompt = null;
const promptListeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    promptListeners.forEach((fn) => fn(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    promptListeners.forEach((fn) => fn(false));
  });
}

export async function registerAdvisorSW() {
  if (registered) return;
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return; // virtual:pwa-register only exists after build
  registered = true;
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({ immediate: true });
  } catch {
    // virtual module unavailable in this environment — ignore
  }
}

export function canPromptInstall() {
  return !!deferredPrompt;
}

export function onInstallAvailable(fn) {
  promptListeners.add(fn);
  fn(canPromptInstall());
  return () => promptListeners.delete(fn);
}

export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  promptListeners.forEach((fn) => fn(false));
  return choice?.outcome ?? 'dismissed';
}

const DISMISS_KEY = 'pwa-install-dismissed';
export function installBannerDismissed() {
  try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
}
export function dismissInstallBanner() {
  try { localStorage.setItem(DISMISS_KEY, '1'); } catch { /* ignore */ }
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}
