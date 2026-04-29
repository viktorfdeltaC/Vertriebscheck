import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import QualificationPill from '../components/QualificationPill.jsx';
import { supabase, IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';
import { useAuth } from '../lib/auth.jsx';
import { computeVerdict } from '../lib/qualification.js';
import { getLeadSubscriptions, setLeadSubscribed } from '../lib/notifications.js';
import { deadlineStatus, formatDeadline } from '../lib/deadline.js';
import Icon from '../components/Icon.jsx';

const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)';

export default function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = !!profile?.is_admin;
  const userId = profile?.id;
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subs, setSubs] = useState(() => getLeadSubscriptions(userId));

  useEffect(() => {
    setSubs(getLeadSubscriptions(userId));
  }, [userId]);

  function toggleSub(leadId) {
    if (!userId) return;
    const next = !subs[leadId];
    setLeadSubscribed(userId, leadId, next);
    setSubs((s) => ({ ...s, [leadId]: next }));
  }

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: '#1D1D1F' }}>Leads</h1>
          <p style={{ fontSize: '15px', color: '#6E6E73', marginTop: '4px' }}>
            {isAdmin ? 'Alle Leads im Überblick.' : 'Ihre Leads im Überblick.'}
          </p>
        </div>
        <Link
          to="/leads/new"
          className="transition-all hover:opacity-90"
          style={{
            background: '#1D1D1F',
            color: 'white',
            fontSize: '14px',
            fontWeight: 500,
            padding: '10px 20px',
            borderRadius: '980px',
            transitionDuration: '150ms',
          }}
        >
          + Neuer Lead
        </Link>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3" style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', color: '#991B1B', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: CARD_SHADOW }}>
        {loading ? (
          <div className="p-10 text-center" style={{ color: '#6E6E73', fontSize: '14px' }}>Lade…</div>
        ) : leads.length === 0 ? (
          <div className="p-10 text-center" style={{ color: '#6E6E73', fontSize: '14px' }}>
            Noch keine Leads. Legen Sie Ihren ersten Lead an.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <Th>Klient</Th>
                  <Th>Status</Th>
                  <Th>Voraussetzungen</Th>
                  <Th>Fortschritt</Th>
                  <Th>Erstellt am</Th>
                  <Th>Frist</Th>
                  {isAdmin && <Th>Erstellt von</Th>}
                  <Th></Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {[...leads]
                  .sort((a, b) => {
                    const aExp = deadlineStatus(a.deadline)?.level === 'expired' && a.status === 'offen' ? 1 : 0;
                    const bExp = deadlineStatus(b.deadline)?.level === 'expired' && b.status === 'offen' ? 1 : 0;
                    return bExp - aExp;
                  })
                  .map((l, idx, arr) => {
                  const total = l.lead_items?.length ?? 0;
                  const done = l.lead_items?.filter((i) => i.checked).length ?? 0;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const isLast = idx === arr.length - 1;
                  const ds = deadlineStatus(l.deadline);
                  const ageDays = (Date.now() - new Date(l.created_at).getTime()) / 86400000;
                  const isStale = l.status === 'offen' && ageDays >= 3 && done === 0;
                  const subscribed = !!subs[l.id];
                  return (
                    <tr
                      key={l.id}
                      className="transition-colors"
                      style={{
                        borderBottom: isLast ? 'none' : '1px solid #F9FAFB',
                        transitionDuration: '150ms',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Td>
                        <div className="flex items-center gap-2">
                          {isStale && (
                            <span
                              title="Keine Aktivität seit 3+ Tagen"
                              style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#F59E0B', flexShrink: 0 }}
                            />
                          )}
                          <Link
                            to={`/leads/${l.id}`}
                            style={{ color: '#1D1D1F', fontSize: '14px', fontWeight: 500 }}
                            className="hover:underline"
                          >
                            {l.client_name}
                          </Link>
                        </div>
                      </Td>
                      <Td nowrap><StatusBadge status={l.status} /></Td>
                      <Td nowrap><QualificationPill verdict={computeVerdict(l.qualification)} compact /></Td>
                      <Td nowrap>
                        <div className="flex items-center gap-2">
                          <div className="overflow-hidden" style={{ height: '4px', width: '100px', borderRadius: '999px', background: '#F3F4F6' }}>
                            <div className="h-full" style={{ width: `${pct}%`, background: '#1B2A4A', borderRadius: '999px' }} />
                          </div>
                          <span style={{ fontSize: '12px', color: '#6E6E73', marginLeft: '6px' }}>{pct}%</span>
                        </div>
                      </Td>
                      <Td nowrap>
                        <span style={{ fontSize: '14px', color: '#6E6E73' }}>
                          {new Date(l.created_at).toLocaleDateString('de-DE')}
                        </span>
                      </Td>
                      <Td nowrap>
                        {!ds ? (
                          <span style={{ fontSize: '14px', color: '#D1D5DB' }}>—</span>
                        ) : ds.level === 'expired' && l.status === 'offen' ? (
                          <span style={{ fontSize: '14px', color: '#DC2626', fontWeight: 500 }}>
                            {formatDeadline(l.deadline, { short: true })} · Abgelaufen
                          </span>
                        ) : ds.level === 'warning' && l.status === 'offen' ? (
                          <span className="inline-flex items-center gap-1.5" style={{ fontSize: '14px', color: '#B45309', fontWeight: 500 }}>
                            <Icon name="alertTriangle" size={14} />
                            {formatDeadline(l.deadline, { short: true })}
                          </span>
                        ) : (
                          <span style={{ fontSize: '14px', color: '#6E6E73' }}>
                            {formatDeadline(l.deadline, { short: true })}
                          </span>
                        )}
                      </Td>
                      {isAdmin && (
                        <Td nowrap>
                          <span style={{ fontSize: '14px', color: '#6E6E73' }}>{l.profiles?.full_name ?? '—'}</span>
                        </Td>
                      )}
                      <Td nowrap>
                        <button
                          onClick={() => toggleSub(l.id)}
                          title="Push-Benachrichtigungen für diesen Lead"
                          aria-label="Push-Benachrichtigungen umschalten"
                          className="transition-colors inline-flex items-center justify-center"
                          style={{
                            color: subscribed ? '#1B2A4A' : '#D1D5DB',
                            background: 'transparent',
                            padding: '6px',
                            borderRadius: '8px',
                            transitionDuration: '150ms',
                          }}
                        >
                          <Icon name={subscribed ? 'bell' : 'bellOff'} size={18} />
                        </button>
                      </Td>
                      <Td nowrap>
                        <Link
                          to={`/leads/${l.id}`}
                          className="transition-colors"
                          style={{ fontSize: '14px', color: '#1B2A4A', fontWeight: 500, transitionDuration: '150ms' }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#2563EB')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = '#1B2A4A')}
                        >
                          Öffnen →
                        </Link>
                      </Td>
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

function Th({ children }) {
  return (
    <th
      style={{
        textAlign: 'left',
        padding: '12px 16px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.05em',
        color: '#6E6E73',
        textTransform: 'uppercase',
        background: 'transparent',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </th>
  );
}

function Td({ children, nowrap }) {
  return <td style={{ padding: '14px 16px', whiteSpace: nowrap ? 'nowrap' : 'normal' }}>{children}</td>;
}
