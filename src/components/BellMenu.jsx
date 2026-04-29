import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { getPrefs, setPrefs, requestPermission, showTestNotification } from '../lib/notifications.js';
import Icon from './Icon.jsx';

export default function BellMenu() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [prefs, setLocalPrefs] = useState(() => getPrefs());
  const [saved, setSaved] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function update(patch) {
    setLocalPrefs((p) => ({ ...p, ...patch }));
  }

  async function save() {
    if (prefs.active && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const r = await requestPermission();
      if (r !== 'granted') {
        setLocalPrefs((p) => ({ ...p, active: false }));
        return;
      }
    }
    setPrefs(prefs);
    // TODO: sync with rep preferences in Supabase profiles table
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  const isActive = prefs.active && (typeof Notification === 'undefined' || Notification.permission === 'granted');

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Benachrichtigungen"
        className="transition-colors"
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '999px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isActive ? '#1B2A4A' : '#6E6E73',
          transitionDuration: '150ms',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F7')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Icon name={isActive ? 'bell' : 'bellOff'} size={18} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 bg-white"
          style={{
            width: '280px',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)',
            padding: '14px',
            zIndex: 30,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span style={{ fontSize: '13px', color: '#6E6E73' }}>Benachrichtigungen</span>
            <Toggle checked={!!prefs.active} onChange={(v) => update({ active: v })} />
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '10px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: '8px' }}>
              Benachrichtigen bei
            </div>
            <CheckRow checked={!!prefs.on_upload} onChange={(v) => update({ on_upload: v })} label="Dokument hochgeladen" />
            <CheckRow checked={!!prefs.on_submit} onChange={(v) => update({ on_submit: v })} label="Unterlagen eingereicht" />
            <CheckRow checked={!!prefs.on_open} onChange={(v) => update({ on_open: v })} label="Link erstmals geöffnet" />
          </div>
          <div className="flex items-center justify-between mt-3" style={{ paddingTop: '10px', borderTop: '1px solid #F3F4F6' }}>
            <span style={{ fontSize: '12px', color: saved ? '#166534' : 'transparent', transitionDuration: '150ms' }}>
              {saved ? 'Gespeichert ✓' : '·'}
            </span>
            <button
              onClick={save}
              className="transition-all"
              style={{
                background: '#1D1D1F',
                color: 'white',
                fontSize: '12px',
                fontWeight: 500,
                padding: '6px 14px',
                borderRadius: '980px',
                transitionDuration: '150ms',
              }}
            >
              Speichern
            </button>
          </div>
          {profile?.is_admin && (
            <button
              onClick={showTestNotification}
              className="mt-2 w-full transition-colors"
              style={{
                fontSize: '12px',
                color: '#6E6E73',
                padding: '6px 8px',
                borderRadius: '8px',
                transitionDuration: '150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F7')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Test-Benachrichtigung senden
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="transition-all"
      style={{
        width: '36px',
        height: '20px',
        borderRadius: '999px',
        background: checked ? '#22C55E' : '#D1D5DB',
        position: 'relative',
        transitionDuration: '150ms',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '18px' : '2px',
          width: '16px',
          height: '16px',
          borderRadius: '999px',
          background: 'white',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          transition: 'left 150ms ease',
        }}
      />
    </button>
  );
}

function CheckRow({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer" style={{ padding: '6px 2px' }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#1B2A4A', width: '15px', height: '15px' }}
      />
      <span style={{ fontSize: '13px', color: '#1D1D1F' }}>{label}</span>
    </label>
  );
}
