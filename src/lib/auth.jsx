import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, IS_MOCK } from './supabase.js';
import { mock } from './mock.js';

const AuthContext = createContext(null);

const MOCK_KEY = 'unterlagen-check-mock-auth';
const TAB_OVERRIDE_KEY = 'unterlagen-check-tab-role';

function readMockAuth() {
  // Pro-Tab Override per ?as=admin / ?as=rep oder gespeicherter sessionStorage-Wert
  const params = new URLSearchParams(window.location.search);
  const asParam = params.get('as');
  if (asParam === 'admin' || asParam === 'rep') {
    try { sessionStorage.setItem(TAB_OVERRIDE_KEY, asParam); } catch {}
  }
  let tabRole = null;
  try { tabRole = sessionStorage.getItem(TAB_OVERRIDE_KEY); } catch {}
  if (tabRole === 'admin') return { id: 'rep-1', email: 'holger.weller@wertentwickler.de' };
  if (tabRole === 'rep') return { id: 'rep-2', email: 'lisa@wertentwickler.de' };
  try {
    const raw = localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (IS_MOCK) {
      const m = readMockAuth();
      if (m) {
        mock.CURRENT_USER_ID = m.id;
        setSession({ user: { id: m.id, email: m.email } });
        setProfile(mock.getProfile(m.id));
      }
      setLoading(false);
      return;
    }
  }, []);

  useEffect(() => {
    if (IS_MOCK) return;
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      if (!data.session) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      if (!newSession) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (IS_MOCK) return;
    if (!session?.user) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('profiles')
      .select('id, full_name, is_admin')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile(data ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  async function signIn(email, password) {
    if (IS_MOCK) {
      const userId = email.includes('lisa') ? 'rep-2' : 'rep-1';
      const p = mock.getProfile(userId);
      mock.CURRENT_USER_ID = userId;
      localStorage.setItem(MOCK_KEY, JSON.stringify({ id: userId, email: p.email }));
      setSession({ user: { id: userId, email: p.email } });
      setProfile(p);
      return { error: null };
    }
    return supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    if (IS_MOCK) {
      localStorage.removeItem(MOCK_KEY);
      setSession(null);
      setProfile(null);
      return { error: null };
    }
    return supabase.auth.signOut();
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isMock: IS_MOCK,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
