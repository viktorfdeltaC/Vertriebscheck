import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { supabase, IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';
import { useAuth } from '../lib/auth.jsx';

const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)';
const INPUT_STYLE = {
  width: '100%',
  background: '#F5F5F7',
  border: '1px solid #E5E7EB',
  borderRadius: '10px',
  fontSize: '14px',
  color: '#1D1D1F',
  padding: '10px 14px',
  outline: 'none',
  transitionDuration: '150ms',
};

function inputFocus(e) {
  e.target.style.borderColor = '#1B2A4A';
  e.target.style.background = 'white';
}
function inputBlur(e) {
  e.target.style.borderColor = '#E5E7EB';
  e.target.style.background = '#F5F5F7';
}

export default function AdminUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vorname, setVorname] = useState('');
  const [nachname, setNachname] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    if (IS_MOCK) {
      setUsers(mock.listUsers());
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, full_name, email, is_admin, created_at')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setUsers(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function onInvite(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const full_name = `${vorname.trim()} ${nachname.trim()}`.trim();
    if (!full_name || !email.trim()) return;
    setBusy(true);
    try {
      if (IS_MOCK) {
        mock.inviteUser({ full_name, email: email.trim() });
      } else {
        // TODO: connect to Edge Function `invite-user`
        const { error: err } = await supabase.functions.invoke('invite-user', {
          body: { email: email.trim(), full_name },
        });
        if (err) throw err;
      }
      setSuccess(`Einladung an ${email.trim()} gesendet.`);
      setVorname('');
      setNachname('');
      setEmail('');
      await load();
    } catch (ex) {
      setError(ex.message ?? 'Einladung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(u) {
    if (u.id === user?.id) return;
    if (!confirm(`${u.full_name} wirklich entfernen?`)) return;
    if (IS_MOCK) {
      mock.removeUser(u.id);
      await load();
      return;
    }
    // TODO: connect to Edge Function `remove-user`
    const { error: err } = await supabase.functions.invoke('remove-user', { body: { id: u.id } });
    if (err) setError(err.message);
    await load();
  }

  return (
    <Layout>
      <div className="mb-8">
        <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: '#1D1D1F' }}>Team</h1>
        <p style={{ fontSize: '15px', color: '#6E6E73', marginTop: '4px' }}>Vertriebspartner verwalten.</p>
      </div>

      <div className="bg-white mb-8" style={{ borderRadius: '16px', padding: '28px', boxShadow: CARD_SHADOW }}>
        <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F' }}>Neuen Berater einladen</h2>
        <p style={{ fontSize: '13px', color: '#6E6E73', marginTop: '4px' }}>
          Es wird eine E-Mail mit einem Link zum Setzen des Passworts gesendet.
        </p>
        <form onSubmit={onInvite} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Vorname</FieldLabel>
              <input
                value={vorname}
                onChange={(e) => setVorname(e.target.value)}
                onFocus={inputFocus}
                onBlur={inputBlur}
                style={INPUT_STYLE}
                required
              />
            </div>
            <div>
              <FieldLabel>Nachname</FieldLabel>
              <input
                value={nachname}
                onChange={(e) => setNachname(e.target.value)}
                onFocus={inputFocus}
                onBlur={inputBlur}
                style={INPUT_STYLE}
                required
              />
            </div>
          </div>
          <div>
            <FieldLabel>E-Mail</FieldLabel>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={inputFocus}
              onBlur={inputBlur}
              style={INPUT_STYLE}
              required
            />
          </div>
          {success && (
            <div style={{ fontSize: '14px', color: '#166534', background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '10px 14px' }}>
              {success}
            </div>
          )}
          {error && (
            <div style={{ fontSize: '14px', color: '#991B1B', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px' }}>
              {error}
            </div>
          )}
          <div>
            <button
              type="submit"
              disabled={busy}
              className="transition-all"
              style={{
                background: '#1D1D1F',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                padding: '10px 20px',
                borderRadius: '980px',
                opacity: busy ? 0.3 : 1,
                cursor: busy ? 'not-allowed' : 'pointer',
                transitionDuration: '150ms',
              }}
            >
              {busy ? 'Einladung wird gesendet…' : 'Einladung senden'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: CARD_SHADOW }}>
        {loading ? (
          <div className="p-10 text-center" style={{ color: '#6E6E73', fontSize: '14px' }}>Lade…</div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center" style={{ color: '#6E6E73', fontSize: '14px' }}>Noch keine Berater.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                <Th>Name</Th>
                <Th>E-Mail</Th>
                <Th>Leads</Th>
                <Th>Erstellt am</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => {
                const isLast = idx === users.length - 1;
                const isSelf = u.id === user?.id;
                return (
                  <tr
                    key={u.id}
                    className="transition-colors"
                    style={{ borderBottom: isLast ? 'none' : '1px solid #F9FAFB', transitionDuration: '150ms' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <Td>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>{u.full_name}</span>
                        {u.is_admin && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase',
                              background: '#EFF6FF',
                              color: '#1B2A4A',
                              borderRadius: '980px',
                              padding: '2px 8px',
                            }}
                          >
                            Admin
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td><span style={{ fontSize: '14px', color: '#6E6E73' }}>{u.email}</span></Td>
                    <Td><span style={{ fontSize: '14px', color: '#6E6E73' }}>{u.lead_count ?? 0}</span></Td>
                    <Td>
                      <span style={{ fontSize: '14px', color: '#6E6E73' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('de-DE') : '—'}
                      </span>
                    </Td>
                    <Td>
                      <button
                        onClick={() => onRemove(u)}
                        disabled={isSelf}
                        title={isSelf ? 'Eigener Account kann nicht entfernt werden' : 'Berater entfernen'}
                        className="transition-colors"
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: isSelf ? '#D1D5DB' : '#DC2626',
                          cursor: isSelf ? 'not-allowed' : 'pointer',
                          transitionDuration: '150ms',
                        }}
                      >
                        Entfernen
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '12px 20px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        color: '#6E6E73',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td style={{ padding: '16px 20px' }}>{children}</td>;
}

function FieldLabel({ children }) {
  return (
    <label
      style={{
        display: 'block',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: '#6E6E73',
        marginBottom: '6px',
      }}
    >
      {children}
    </label>
  );
}
