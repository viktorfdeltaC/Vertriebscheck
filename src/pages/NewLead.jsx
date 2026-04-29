import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { supabase, IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';

const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)';
const PRIMARY_BTN = {
  background: '#1D1D1F',
  color: 'white',
  fontSize: '14px',
  fontWeight: 500,
  padding: '10px 20px',
  borderRadius: '980px',
  transitionDuration: '150ms',
};
const SECONDARY_BTN = {
  background: 'white',
  color: '#1D1D1F',
  fontSize: '14px',
  fontWeight: 500,
  padding: '10px 20px',
  borderRadius: '980px',
  border: '1px solid #E5E7EB',
  transitionDuration: '150ms',
};
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

export default function NewLead() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deadline, setDeadline] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (IS_MOCK) {
      const data = mock.createLead({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        deadline: deadline || null,
      });
      setBusy(false);
      setCreated(data);
      return;
    }
    // TODO: extend create_lead RPC + leads table with `deadline date nullable`
    const { data, error: err } = await supabase.rpc('create_lead', {
      p_client_name: name.trim(),
      p_client_email: email.trim(),
      p_client_phone: phone.trim(),
      p_deadline: deadline || null,
    });
    setBusy(false);
    if (err) { setError(err.message); return; }
    setCreated(data);
  }

  function shareLink() {
    if (!created) return '';
    return `${window.location.origin}/check/${created.share_uuid}`;
  }

  async function copy() {
    await navigator.clipboard.writeText(shareLink());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (created) {
    return (
      <Layout>
        <div className="max-w-xl">
          <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: '#1D1D1F' }}>Lead angelegt</h1>
          <p style={{ fontSize: '15px', color: '#6E6E73', marginTop: '4px' }}>
            Senden Sie diesen Link per WhatsApp oder E-Mail an Ihren Kunden.
          </p>
          <div className="bg-white mt-6" style={{ borderRadius: '16px', padding: '28px', boxShadow: CARD_SHADOW }}>
            <Label>Klient</Label>
            <div style={{ fontSize: '16px', fontWeight: 500, color: '#1D1D1F' }}>{created.client_name}</div>
            <div style={{ marginTop: '20px' }}>
              <Label>Share-Link</Label>
              <div className="flex gap-2">
                <input
                  value={shareLink()}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  style={{ ...INPUT_STYLE, fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '13px', color: '#6E6E73' }}
                />
                <button
                  type="button"
                  onClick={copy}
                  className="whitespace-nowrap transition-all"
                  style={{
                    ...PRIMARY_BTN,
                    borderRadius: '10px',
                    fontSize: '13px',
                    padding: '10px 16px',
                    background: copied ? '#22C55E' : '#1D1D1F',
                  }}
                >
                  {copied ? 'Kopiert ✓' : 'Kopieren'}
                </button>
              </div>
            </div>
            <div className="flex gap-2" style={{ marginTop: '24px' }}>
              <Link to="/dashboard" style={SECONDARY_BTN}>Zum Dashboard</Link>
              <button onClick={() => navigate(`/leads/${created.id}`)} style={PRIMARY_BTN}>Lead öffnen</button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-xl">
        <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: '#1D1D1F' }}>Neuer Lead</h1>
        <p style={{ fontSize: '15px', color: '#6E6E73', marginTop: '4px' }}>Klientendaten erfassen.</p>
        <form
          onSubmit={onSubmit}
          className="bg-white mt-6"
          style={{ borderRadius: '16px', padding: '28px', boxShadow: CARD_SHADOW }}
        >
          <div className="space-y-5">
            <div>
              <Label htmlFor="name">Name des Klienten *</Label>
              <input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={inputFocus}
                onBlur={inputBlur}
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <Label htmlFor="email">E-Mail</Label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={inputFocus}
                onBlur={inputBlur}
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onFocus={inputFocus}
                onBlur={inputBlur}
                style={INPUT_STYLE}
              />
            </div>
            <div>
              <Label htmlFor="deadline">Frist für Unterlagen (optional)</Label>
              <input
                id="deadline"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                onFocus={inputFocus}
                onBlur={inputBlur}
                style={INPUT_STYLE}
              />
            </div>
            {error && (
              <div style={{ fontSize: '14px', color: '#991B1B', background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '10px 14px' }}>
                {error}
              </div>
            )}
            <div className="flex gap-2" style={{ paddingTop: '8px' }}>
              <Link to="/dashboard" style={SECONDARY_BTN}>Abbrechen</Link>
              <button
                type="submit"
                disabled={busy || !name.trim()}
                style={{ ...PRIMARY_BTN, opacity: busy || !name.trim() ? 0.3 : 1, cursor: busy || !name.trim() ? 'not-allowed' : 'pointer' }}
              >
                {busy ? 'Anlegen…' : 'Lead anlegen'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
}

function Label({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        fontSize: '12px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        color: '#6E6E73',
        marginBottom: '8px',
      }}
    >
      {children}
    </label>
  );
}
