import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { IS_MOCK } from '../lib/supabase.js';
import NotificationBanner from './NotificationBanner.jsx';
import BellMenu from './BellMenu.jsx';

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
    <div className="min-h-screen" style={{ background: '#F5F5F7', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <header
        className="sticky top-0 z-20 bg-white"
        style={{ borderBottom: '1px solid #E5E7EB' }}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-[52px] flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <span
              className="text-[#1D1D1F]"
              style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em' }}
            >
              Unterlagen-Check
            </span>
            <span style={{ color: '#D1D5DB', fontSize: '15px' }}>/</span>
            <span style={{ color: '#6E6E73', fontSize: '13px' }}>Wertentwickler</span>
          </Link>
          <div className="flex items-center gap-4">
            {profile?.is_admin && (
              <NavLink
                to="/admin/users"
                style={({ isActive }) => ({
                  fontSize: '14px',
                  color: isActive ? '#1D1D1F' : '#6E6E73',
                  fontWeight: isActive ? 500 : 400,
                  transitionDuration: '150ms',
                })}
                className="transition-colors hover:text-[#1D1D1F]"
              >
                Team
              </NavLink>
            )}
            <BellMenu />
            {profile?.full_name && (
              <span className="hidden sm:inline" style={{ color: '#6E6E73', fontSize: '14px' }}>
                {profile.full_name}
              </span>
            )}
            {IS_MOCK && profile?.is_admin && (
              <div className="hidden sm:flex items-center gap-1 rounded-md p-0.5" style={{ background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                <button
                  onClick={() => switchRole('admin')}
                  className="text-xs px-2 py-1 rounded font-medium"
                  style={{ background: profile?.is_admin ? '#FCD34D' : 'transparent', color: '#92400E' }}
                  title="Als Admin einloggen (dieser Tab)"
                >
                  Admin
                </button>
                <button
                  onClick={() => switchRole('rep')}
                  className="text-xs px-2 py-1 rounded font-medium"
                  style={{ background: !profile?.is_admin ? '#FCD34D' : 'transparent', color: '#92400E' }}
                  title="Als Berater einloggen (dieser Tab)"
                >
                  Berater
                </button>
                <span style={{ width: '1px', height: '14px', background: '#FDE68A', margin: '0 2px' }} />
                <a
                  href="/dashboard?as=rep"
                  target="_blank"
                  rel="noopener"
                  className="text-xs px-2 py-1 rounded"
                  style={{ color: '#92400E' }}
                  title="Berater-Sicht in neuem Tab öffnen"
                >
                  ↗ Berater-Tab
                </a>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="transition-colors"
              style={{ color: '#6E6E73', fontSize: '14px', transitionDuration: '150ms' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1D1D1F')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#6E6E73')}
            >
              Abmelden
            </button>
          </div>
        </div>
      </header>
      <NotificationBanner />
      <main className="max-w-6xl mx-auto px-5 sm:px-6 py-10">{children}</main>
    </div>
  );
}
