import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { IS_MOCK } from '../lib/supabase.js';

export default function Login() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (session) {
    const to = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={to} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) setError('Anmeldung fehlgeschlagen. Bitte E-Mail und Passwort prüfen.');
  }

  async function quickLogin(role) {
    setError(null);
    setBusy(true);
    const e = role === 'admin' ? 'holger.weller@wertentwickler.de' : 'lisa@wertentwickler.de';
    await signIn(e, 'demo');
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-wert-bg">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/assets/Wertentwickler%20logo1.png"
            alt="Wertentwickler"
            style={{ height: '120px', width: 'auto', display: 'block', marginBottom: '28px' }}
          />
          <div className="font-bold tracking-wide text-wert-navy text-lg">UNTERLAGEN-CHECK</div>
        </div>
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
          <h1 className="text-xl font-semibold text-wert-navy">Anmelden</h1>
          <div>
            <label className="label" htmlFor="email">E-Mail</label>
            <input
              id="email"
              type="email"
              className="input"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">Passwort</label>
            <input
              id="password"
              type="password"
              className="input"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <button className="btn-primary w-full" type="submit" disabled={busy}>
            {busy ? 'Anmelden…' : 'Anmelden'}
          </button>
          {IS_MOCK ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800 space-y-2">
              <div className="font-semibold">Demo-Modus (kein Supabase verbunden)</div>
              <div>Direkt einloggen:</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy}
                  className="flex-1 rounded-md bg-white border border-amber-300 px-2 py-1.5 hover:bg-amber-100 font-medium disabled:opacity-50"
                  onClick={() => quickLogin('admin')}
                >
                  Als Admin
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="flex-1 rounded-md bg-white border border-amber-300 px-2 py-1.5 hover:bg-amber-100 font-medium disabled:opacity-50"
                  onClick={() => quickLogin('rep')}
                >
                  Als Berater
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center">
              Konten werden vom Administrator angelegt.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
