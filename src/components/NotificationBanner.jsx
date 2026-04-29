import { useEffect, useState } from 'react';
import { bannerDismissed, dismissBanner, requestPermission, getPrefs, setPrefs } from '../lib/notifications.js';
import Icon from './Icon.jsx';

export default function NotificationBanner() {
  const [show, setShow] = useState(false);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;
    if (bannerDismissed()) return;
    const t = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!show && !granted) return null;

  async function activate() {
    const r = await requestPermission();
    if (r === 'granted') {
      const prefs = getPrefs();
      setPrefs({ ...prefs, active: true });
      setGranted(true);
      setTimeout(() => { setShow(false); setGranted(false); }, 2500);
    }
    dismissBanner();
  }

  function later() {
    dismissBanner();
    setShow(false);
  }

  return (
    <div
      className="bg-white"
      style={{ borderBottom: '1px solid #E5E7EB' }}
    >
      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-3 flex items-center gap-3 flex-wrap">
        <span style={{ color: '#1B2A4A', display: 'inline-flex' }}><Icon name="bell" size={18} /></span>
        <div className="flex-1 min-w-[260px]" style={{ fontSize: '13px', color: '#1D1D1F' }}>
          {granted ? (
            <span style={{ color: '#166534', fontWeight: 500 }}>Benachrichtigungen aktiviert ✓</span>
          ) : (
            <>
              <span style={{ fontWeight: 500 }}>Benachrichtigungen aktivieren</span>
              <span style={{ color: '#6E6E73' }}> — erhalten Sie sofortige Updates wenn Kunden Dokumente einreichen.</span>
            </>
          )}
        </div>
        {!granted && (
          <div className="flex items-center gap-2">
            <button
              onClick={activate}
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
              Jetzt aktivieren
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
        )}
      </div>
    </div>
  );
}
