import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import QualificationPanel from '../components/QualificationPanel.jsx';
import { supabase, IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';
import { useAuth } from '../lib/auth.jsx';

export default function LeadDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;

  const [lead, setLead] = useState(null);
  const [sections, setSections] = useState([]);
  const [items, setItems] = useState([]);
  const [leadItems, setLeadItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  async function load() {
    setLoading(true);
    if (IS_MOCK) {
      setLead(mock.getLead(id));
      setSections(mock.getSections());
      setItems(mock.getItems());
      setLeadItems(mock.getLeadItems(id));
      setLoading(false);
      return;
    }
    const sel = isAdmin
      ? '*, profiles:created_by(full_name)'
      : '*';
    const [{ data: l, error: le }, { data: s }, { data: ci }, { data: li }] = await Promise.all([
      supabase.from('leads').select(sel).eq('id', id).maybeSingle(),
      supabase.from('checklist_sections').select('*').order('sort_order'),
      supabase.from('checklist_items').select('*').order('sort_order'),
      supabase.from('lead_items').select('*').eq('lead_id', id),
    ]);
    if (le) setError(le.message);
    setLead(l ?? null);
    setSections(s ?? []);
    setItems(ci ?? []);
    setLeadItems(li ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id, isAdmin]);

  async function markComplete() {
    if (!confirm('Lead als vollständig markieren?')) return;
    if (IS_MOCK) { mock.markComplete(id); load(); return; }
    const { error: err } = await supabase
      .from('leads')
      .update({ status: 'vollständig', submitted_at: new Date().toISOString() })
      .eq('id', id);
    if (err) { setError(err.message); return; }
    load();
  }

  async function toggleItem(itemId, current) {
    const next = !current;
    setLeadItems((prev) => prev.map((li) => (li.item_id === itemId ? { ...li, checked: next } : li)));
    if (IS_MOCK) {
      mock.setLeadItemChecked(id, itemId, next);
      return;
    }
    const { error: err } = await supabase
      .from('lead_items')
      .update({ checked: next, updated_at: new Date().toISOString() })
      .eq('lead_id', id)
      .eq('item_id', itemId);
    if (err) { setError(err.message); load(); }
  }

  async function downloadFile(path) {
    if (IS_MOCK) { alert(`Mock-Datei: ${path}`); return; }
    const { data, error: err } = await supabase.rpc('request_download_url', { p_path: path });
    if (err) { alert(err.message); return; }
    if (data) window.open(data, '_blank', 'noopener');
  }

  if (loading) return <Layout><div className="text-slate-500">Lade…</div></Layout>;
  if (!lead) return <Layout><div className="text-slate-500">Lead nicht gefunden.</div></Layout>;

  const total = leadItems.length;
  const done = leadItems.filter((i) => i.checked).length;
  const liByItem = Object.fromEntries(leadItems.map((li) => [li.item_id, li]));
  const shareLink = `${window.location.origin}/check/${lead.share_uuid}`;

  async function copyShare() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Layout>
      <div className="mb-4">
        <Link to="/dashboard" className="text-sm text-slate-500 hover:text-wert-navy">← Zurück zum Dashboard</Link>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-wert-navy">{lead.client_name}</h1>
            <div className="text-sm text-slate-500 mt-1 flex items-center gap-3">
              <StatusBadge status={lead.status} />
              <span>Erstellt am {new Date(lead.created_at).toLocaleDateString('de-DE')}</span>
              {isAdmin && lead.profiles?.full_name && (
                <span>· Erstellt von {lead.profiles.full_name}</span>
              )}
              {lead.submitted_at && (
                <span>· Eingereicht {new Date(lead.submitted_at).toLocaleString('de-DE')}</span>
              )}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {lead.client_email && <span>{lead.client_email}</span>}
              {lead.client_email && lead.client_phone && <span> · </span>}
              {lead.client_phone && <span>{lead.client_phone}</span>}
            </div>
          </div>
          {isAdmin && lead.status !== 'vollständig' && (
            <button onClick={markComplete} className="btn-secondary">Lead als vollständig markieren</button>
          )}
        </div>

        <div className="mt-6">
          <div className="label">Share-Link für den Klienten</div>
          <div className="flex gap-2">
            <input className="input font-mono text-xs" value={shareLink} readOnly onFocus={(e) => e.target.select()} />
            <button onClick={copyShare} className="btn-secondary whitespace-nowrap">
              {copied ? 'Kopiert ✓' : 'Kopieren'}
            </button>
          </div>
        </div>

        <div className="mt-6">
          <ProgressBar value={done} total={total} />
        </div>
      </div>

      {error && <div className="card p-4 mb-4 text-sm text-red-700 bg-red-50 border-red-200">{error}</div>}

      <QualificationPanel leadId={id} locked={lead.status === 'vollständig'} />

      <h2 className="text-lg font-semibold text-wert-navy mb-3">Unterlagen</h2>

      {sections.map((s) => {
        const sectionItems = items.filter((i) => i.section_id === s.id);
        return (
          <section key={s.id} className="mb-6">
            <h2 className="text-lg font-semibold text-wert-navy mb-3">{s.label}</h2>
            <div className="card divide-y divide-slate-100">
              {sectionItems.map((it) => {
                const li = liByItem[it.id];
                return (
                  <div key={it.id} className="p-4 flex gap-3">
                    <div className="pt-0.5">
                      <button
                        type="button"
                        onClick={() => toggleItem(it.id, !!li?.checked)}
                        disabled={lead.status === 'vollständig'}
                        title={lead.status === 'vollständig' ? 'Lead ist eingereicht' : (li?.checked ? 'Häkchen entfernen' : 'Als erledigt markieren')}
                        className={
                          'inline-flex h-5 w-5 items-center justify-center rounded border transition ' +
                          (li?.checked
                            ? 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-white border-slate-300 text-transparent hover:border-wert-blue') +
                          (lead.status === 'vollständig' ? ' opacity-60 cursor-not-allowed' : ' cursor-pointer')
                        }
                      >
                        ✓
                      </button>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-wert-navy">{it.label}</div>
                      {it.description && <div className="text-sm text-slate-500 mt-0.5">{it.description}</div>}
                      {li?.note && (
                        <div className="text-sm bg-slate-50 border border-slate-200 rounded-md px-3 py-2 mt-2 whitespace-pre-wrap">
                          <span className="font-semibold text-slate-700">Notiz: </span>{li.note}
                        </div>
                      )}
                      {li?.file_path && (
                        <button
                          onClick={() => downloadFile(li.file_path)}
                          className="mt-2 text-sm text-wert-blue hover:underline inline-flex items-center gap-1"
                        >
                          📄 Datei öffnen
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </Layout>
  );
}
