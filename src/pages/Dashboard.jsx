import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import QualificationPill from '../components/QualificationPill.jsx';
import { supabase, IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';
import { useAuth } from '../lib/auth.jsx';
import { computeVerdict } from '../lib/qualification.js';

export default function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      if (IS_MOCK) {
        if (cancelled) return;
        setLeads(mock.listLeads({ asAdmin: isAdmin }));
        setLoading(false);
        return;
      }
      const sel = isAdmin
        ? 'id, client_name, status, created_at, share_uuid, created_by, profiles:created_by(full_name), lead_items(checked)'
        : 'id, client_name, status, created_at, share_uuid, lead_items(checked)';
      const { data, error: err } = await supabase
        .from('leads')
        .select(sel)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (err) setError(err.message);
      else setLeads(data ?? []);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [isAdmin]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-wert-navy">Leads</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin ? 'Alle Leads im Überblick.' : 'Ihre Leads im Überblick.'}
          </p>
        </div>
        <Link to="/leads/new" className="btn-primary">+ Neuer Lead</Link>
      </div>

      {error && <div className="card p-4 text-sm text-red-700 bg-red-50 border-red-200">{error}</div>}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Lade…</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Noch keine Leads. Legen Sie Ihren ersten Lead an.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Klient</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Voraussetzungen</th>
                  <th className="text-left px-4 py-3 font-medium">Fortschritt</th>
                  <th className="text-left px-4 py-3 font-medium">Erstellt am</th>
                  {isAdmin && <th className="text-left px-4 py-3 font-medium">Erstellt von</th>}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((l) => {
                  const total = l.lead_items?.length ?? 0;
                  const done = l.lead_items?.filter((i) => i.checked).length ?? 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-wert-navy">
                        <Link to={`/leads/${l.id}`} className="hover:underline">
                          {l.client_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3"><QualificationPill verdict={computeVerdict(l.qualification)} compact /></td>
                      <td className="px-4 py-3 min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-32 rounded-full bg-slate-200 overflow-hidden">
                            <div className="h-full bg-wert-blue" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-10">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(l.created_at).toLocaleDateString('de-DE')}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-slate-600">
                          {l.profiles?.full_name ?? '—'}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <Link to={`/leads/${l.id}`} className="text-wert-blue hover:underline text-sm font-medium">
                          Öffnen →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
