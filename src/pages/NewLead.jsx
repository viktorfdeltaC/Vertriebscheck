import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { supabase, IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';

export default function NewLead() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    if (IS_MOCK) {
      const data = mock.createLead({ name: name.trim(), email: email.trim(), phone: phone.trim() });
      setBusy(false);
      setCreated(data);
      return;
    }
    const { data, error: err } = await supabase.rpc('create_lead', {
      p_client_name: name.trim(),
      p_client_email: email.trim(),
      p_client_phone: phone.trim(),
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
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
          <h1 className="text-2xl font-bold text-wert-navy">Lead angelegt</h1>
          <p className="text-sm text-slate-500 mt-1">
            Senden Sie diesen Link per WhatsApp oder E-Mail an Ihren Kunden.
          </p>
          <div className="card p-5 mt-6 space-y-4">
            <div>
              <div className="label">Klient</div>
              <div className="font-medium text-wert-navy">{created.client_name}</div>
            </div>
            <div>
              <div className="label">Share-Link</div>
              <div className="flex gap-2">
                <input className="input font-mono text-xs" value={shareLink()} readOnly onFocus={(e) => e.target.select()} />
                <button type="button" className="btn-secondary whitespace-nowrap" onClick={copy}>
                  {copied ? 'Kopiert ✓' : 'Kopieren'}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Link to="/dashboard" className="btn-secondary">Zum Dashboard</Link>
              <button onClick={() => navigate(`/leads/${created.id}`)} className="btn-primary">Lead öffnen</button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-wert-navy">Neuer Lead</h1>
        <p className="text-sm text-slate-500 mt-1">Klientendaten erfassen.</p>
        <form onSubmit={onSubmit} className="card p-5 mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="name">Name des Klienten *</label>
            <input id="name" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="email">E-Mail</label>
            <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Telefon</label>
            <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="flex gap-2 pt-2">
            <Link to="/dashboard" className="btn-secondary">Abbrechen</Link>
            <button type="submit" className="btn-primary" disabled={busy || !name.trim()}>
              {busy ? 'Anlegen…' : 'Lead anlegen'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
