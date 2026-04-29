import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { IS_MOCK } from '../lib/supabase.js';

export default function Layout({ children }) {
  const { profile, signOut, signIn } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  async function switchRole(role) {
    const e = role === 'admin' ? 'holger.weller@wertentwickler.de' : 'lisa@wertentwickler.de';
    await signIn(e, 'demo');
    navigate('/dashboard', { replace: true });
  }

  return (
    <div className="min-h-screen bg-wert-bg">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <span className="font-bold tracking-wide text-wert-navy">UNTERLAGEN-CHECK</span>
            <span className="hidden sm:inline text-xs text-slate-400">/ Wertentwickler</span>
          </Link>
          <div className="flex items-center gap-3">
            {profile?.full_name && (
              <span className="hidden sm:inline text-sm text-slate-600">{profile.full_name}</span>
            )}
            {profile?.is_admin && (
              <span className="text-xs font-semibold uppercase tracking-wide rounded-md bg-wert-blue/10 text-wert-blue px-2 py-1">
                Admin
              </span>
            )}
            {IS_MOCK && profile?.is_admin && (
              <div className="hidden sm:flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 p-0.5">
                <button
                  onClick={() => switchRole('admin')}
                  className={
                    'text-xs px-2 py-1 rounded ' +
                    (profile?.is_admin ? 'bg-amber-200 font-semibold text-amber-900' : 'text-amber-700 hover:bg-amber-100')
                  }
                  title="Als Admin einloggen (dieser Tab)"
                >
                  Admin
                </button>
                <button
                  onClick={() => switchRole('rep')}
                  className={
                    'text-xs px-2 py-1 rounded ' +
                    (!profile?.is_admin ? 'bg-amber-200 font-semibold text-amber-900' : 'text-amber-700 hover:bg-amber-100')
                  }
                  title="Als Berater einloggen (dieser Tab)"
                >
                  Berater
                </button>
                <span className="w-px h-4 bg-amber-200 mx-0.5" />
                <a
                  href="/dashboard?as=rep"
                  target="_blank"
                  rel="noopener"
                  className="text-xs px-2 py-1 rounded text-amber-700 hover:bg-amber-100"
                  title="Berater-Sicht in neuem Tab öffnen (Holger bleibt hier eingeloggt)"
                >
                  ↗ Berater-Tab
                </a>
              </div>
            )}
            <button onClick={handleLogout} className="btn-ghost">
              Abmelden
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
