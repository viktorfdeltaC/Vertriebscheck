import { useEffect, useState } from 'react';
import {
  onInstallAvailable,
  promptInstall,
  installBannerDismissed,
  dismissInstallBanner,
  isStandalone,
} from '../lib/pwa.js';
import Icon from './Icon.jsx';

export default function InstallBanner() {
  const [available, setAvailable] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (installBannerDismissed()) return;
    return onInstallAvailable((v) => {
      setAvailable(v);
      if (v) setShow(true);
    });
  }, []);

  if (!show || !available) return null;

  async function install() {
    await promptInstall();
    setShow(false);
  }
  function later() {
    dismissInstallBanner();
    setShow(false);
  }

  return (
    <div className="bg-white" style={{ borderBottom: '1px solid #E5E7EB' }}>
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        <span style={{ color: '#1B2A4A', display: 'inline-flex' }}>
          <Icon name="paperclip" size={18} />
        </span>
        <div className="flex-1 min-w-[260px]" style={{ fontSize: '13px', color: '#1D1D1F' }}>
          <span style={{ fontWeight: 500 }}>App installieren</span>
          <span style={{ color: '#6E6E73' }}> — schnellerer Zugriff direkt vom Homescreen.</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={install}
            className="transition-all"
            style={{
              background: '#1D1D1F',
              color: 'white',
              fontSize: '13px',
              fontWeight: 500,
              padding: '7px 14px',
              borderRadius: '980px',
              transitionDuration: '150ms',
            }}
          >
            Installieren
          </button>
          <button
            onClick={later}
            className="transition-colors"
            style={{ fontSize: '13px', color: '#6E6E73', padding: '7px 10px', transitionDuration: '150ms' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1D1D1F')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#6E6E73')}
          >
            Später
          </button>
        </div>
      </div>
    </div>
  );
}
