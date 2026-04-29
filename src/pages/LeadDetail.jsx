import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import QualificationPanel from '../components/QualificationPanel.jsx';
import AnimatedCheckbox from '../components/AnimatedCheckbox.jsx';
import { deadlineStatus, formatDeadline } from '../lib/deadline.js';
import Icon from '../components/Icon.jsx';
import { supabase, IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';
import { useAuth } from '../lib/auth.jsx';
import { exportLeadPdf } from '../lib/exportLeadPdf.js';

const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)';

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
  const [reminderSent, setReminderSent] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState('');
  const [openNoteId, setOpenNoteId] = useState(null);

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
    const sel = isAdmin ? '*, profiles:created_by(full_name)' : '*';
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
    if (IS_MOCK) { mock.setLeadItemChecked(id, itemId, next); return; }
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

  if (loading) return <Layout><div style={{ color: '#6E6E73', fontSize: '14px' }}>Lade…</div></Layout>;
  if (!lead) return <Layout><div style={{ color: '#6E6E73', fontSize: '14px' }}>Lead nicht gefunden.</div></Layout>;

  const total = leadItems.length;
  const done = leadItems.filter((i) => i.checked).length;
  const liByItem = Object.fromEntries(leadItems.map((li) => [li.item_id, li]));
  const shareLink = `${window.location.origin}/check/${lead.share_uuid}`;
  const locked = lead.status === 'vollständig';

  async function copyShare() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function saveDeadline() {
    const value = deadlineDraft || null;
    if (IS_MOCK) {
      mock.setLeadDeadline(id, value);
    } else {
      // TODO: update leads table column `deadline date nullable`
      const { error: err } = await supabase.from('leads').update({ deadline: value }).eq('id', id);
      if (err) { setError(err.message); return; }
    }
    setLead({ ...lead, deadline: value });
    setEditingDeadline(false);
  }

  async function saveAdvisorNote(itemId, value) {
    setLeadItems((prev) => prev.map((li) => (li.item_id === itemId ? { ...li, advisor_note: value || null } : li)));
    if (IS_MOCK) {
      mock.setAdvisorNote(id, itemId, value);
      return;
    }
    // TODO: save to lead_items.advisor_note column in Supabase
    const { error: err } = await supabase
      .from('lead_items')
      .update({ advisor_note: value || null, updated_at: new Date().toISOString() })
      .eq('lead_id', id)
      .eq('item_id', itemId);
    if (err) setError(err.message);
  }

  const ds = deadlineStatus(lead.deadline);

  const whatsappText = `Guten Tag ${lead.client_name}, anbei Ihr persönlicher Link zur Unterlageneinreichung für Ihre Immobilienfinanzierung: ${shareLink}\nBei Fragen stehe ich jederzeit zur Verfügung.`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;

  async function sendReminder() {
    if (!lead.client_email) {
      alert('Keine E-Mail-Adresse hinterlegt.');
      return;
    }
    if (!confirm(`Erinnerung per Email an ${lead.client_email} senden?`)) return;
    setReminderBusy(true);
    // TODO: call Supabase Edge Function 'send-reminder'
    // Edge Function sends email via Resend to client with the share link
    try {
      if (!IS_MOCK) {
        await supabase.functions.invoke('send-reminder', { body: { lead_id: id } });
      } else {
        // eslint-disable-next-line no-console
        console.log('[mock-reminder]', { to: lead.client_email, link: shareLink });
      }
      setReminderSent(true);
      setTimeout(() => setReminderSent(false), 3000);
    } catch (ex) {
      alert(ex.message ?? 'Erinnerung fehlgeschlagen.');
    } finally {
      setReminderBusy(false);
    }
  }

  function handleExportPdf() {
    // TODO: replace mock data with real Supabase data when connected
    const qualification = IS_MOCK
      ? mock.getQualification(id)
      : null; // qualification is currently loaded by QualificationPanel only; for Supabase, fetch from `lead_qualifications`
    exportLeadPdf({
      lead,
      sections,
      items,
      leadItems,
      qualification,
      advisorName: lead.profiles?.full_name ?? profile?.full_name ?? null,
    });
  }

  // TODO: replace mock data with real events from Supabase
  // Table: lead_events (lead_id, type, description, created_at)
  // Triggered by Edge Functions on each client action
  const events = mockEvents(lead);

  return (
    <Layout>
      <div className="mb-5">
        <Link
          to="/dashboard"
          className="transition-colors"
          style={{ fontSize: '14px', color: '#6E6E73', transitionDuration: '150ms' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#1D1D1F')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6E6E73')}
        >
          ← Zurück zum Dashboard
        </Link>
      </div>

      <div className="bg-white mb-6" style={{ borderRadius: '16px', padding: '28px', boxShadow: CARD_SHADOW }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-0.02em', color: '#1D1D1F' }}>
              {lead.client_name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2" style={{ fontSize: '13px', color: '#6E6E73' }}>
              <StatusBadge status={lead.status} />
              <span>Erstellt am {new Date(lead.created_at).toLocaleDateString('de-DE')}</span>
              {isAdmin && lead.profiles?.full_name && <span>· Erstellt von {lead.profiles.full_name}</span>}
              {lead.submitted_at && <span>· Eingereicht {new Date(lead.submitted_at).toLocaleString('de-DE')}</span>}
            </div>
            {(lead.client_email || lead.client_phone) && (
              <div style={{ fontSize: '14px', color: '#6E6E73', marginTop: '4px' }}>
                {lead.client_email && <span>{lead.client_email}</span>}
                {lead.client_email && lead.client_phone && <span> · </span>}
                {lead.client_phone && <span>{lead.client_phone}</span>}
              </div>
            )}
            <div className="mt-2 flex items-center gap-2 flex-wrap" style={{ fontSize: '13px' }}>
              {editingDeadline ? (
                <>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={deadlineDraft}
                    onChange={(e) => setDeadlineDraft(e.target.value)}
                    autoFocus
                    style={{
                      background: '#F5F5F7',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#1D1D1F',
                      padding: '4px 8px',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={saveDeadline}
                    style={{ fontSize: '12px', color: '#1B2A4A', fontWeight: 500 }}
                  >
                    Speichern
                  </button>
                  <button
                    onClick={() => { setEditingDeadline(false); setDeadlineDraft(lead.deadline ?? ''); }}
                    style={{ fontSize: '12px', color: '#6E6E73' }}
                  >
                    Abbrechen
                  </button>
                </>
              ) : ds ? (
                <>
                  <span
                    className="inline-flex items-center gap-1.5"
                    style={{
                      color:
                        ds.level === 'expired' ? '#DC2626' :
                        ds.level === 'warning' ? '#B45309' :
                        '#6E6E73',
                      fontWeight: ds.level === 'normal' ? 400 : 500,
                    }}
                  >
                    <Icon name="calendar" size={14} />
                    Frist: {formatDeadline(lead.deadline)}
                  </span>
                  {ds.level === 'expired' && (
                    <span
                      style={{
                        background: '#FEE2E2',
                        color: '#991B1B',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '980px',
                      }}
                    >
                      Frist abgelaufen
                    </span>
                  )}
                  {ds.level === 'warning' && (
                    <span className="inline-flex items-center gap-1" style={{ color: '#B45309' }}>
                      <Icon name="alertTriangle" size={13} />
                      Frist in {ds.daysLeft === 0 ? 'heute' : `${ds.daysLeft} Tag${ds.daysLeft === 1 ? '' : 'en'}`}
                    </span>
                  )}
                  {!locked && (
                    <button
                      onClick={() => { setEditingDeadline(true); setDeadlineDraft(lead.deadline ?? ''); }}
                      title="Frist ändern"
                      className="inline-flex items-center"
                      style={{ color: '#6E6E73', padding: '2px 4px' }}
                    >
                      <Icon name="pencil" size={13} />
                    </button>
                  )}
                </>
              ) : !locked ? (
                <button
                  onClick={() => { setEditingDeadline(true); setDeadlineDraft(''); }}
                  className="inline-flex items-center gap-1.5"
                  style={{ fontSize: '13px', color: '#6E6E73' }}
                >
                  <Icon name="calendar" size={14} />
                  Frist hinzufügen
                </button>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportPdf}
              className="transition-all inline-flex items-center gap-1.5"
              style={{
                background: 'white',
                color: '#1D1D1F',
                fontSize: '13px',
                fontWeight: 500,
                padding: '8px 16px',
                borderRadius: '980px',
                border: '1px solid #E5E7EB',
                transitionDuration: '150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F7')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
            >
              <span aria-hidden style={{ fontSize: '14px', lineHeight: 1 }}>↓</span>
              PDF exportieren
            </button>
            {isAdmin && !locked && (
              <button
                onClick={markComplete}
                className="transition-all"
                style={{
                  background: 'white',
                  color: '#1D1D1F',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '10px 20px',
                  borderRadius: '980px',
                  border: '1px solid #E5E7EB',
                  transitionDuration: '150ms',
                }}
              >
                Als vollständig markieren
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: '24px' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#6E6E73',
              marginBottom: '8px',
            }}
          >
            Share-Link für den Kunden
          </div>
          <div className="flex gap-2">
            <input
              value={shareLink}
              readOnly
              onFocus={(e) => e.target.select()}
              style={{
                flex: 1,
                background: '#F5F5F7',
                border: '1px solid #E5E7EB',
                borderRadius: '10px',
                fontSize: '13px',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                color: '#6E6E73',
                padding: '10px 14px',
                outline: 'none',
              }}
            />
            <button
              onClick={copyShare}
              className="whitespace-nowrap transition-all"
              style={{
                background: copied ? '#22C55E' : '#1D1D1F',
                color: 'white',
                fontSize: '13px',
                fontWeight: 500,
                padding: '10px 16px',
                borderRadius: '10px',
                transitionDuration: '150ms',
              }}
            >
              {copied ? 'Kopiert ✓' : 'Kopieren'}
            </button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap transition-colors inline-flex items-center justify-center"
              style={{
                background: 'white',
                color: '#1D1D1F',
                fontSize: '13px',
                fontWeight: 500,
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                transitionDuration: '150ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#F5F5F7')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
            >
              <span className="inline-flex items-center gap-1.5">
                <Icon name="messageCircle" size={15} />
                Per WhatsApp senden
              </span>
            </a>
          </div>

          {!locked && (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={sendReminder}
                disabled={reminderBusy}
                className="transition-colors inline-flex items-center gap-1.5"
                style={{
                  fontSize: '13px',
                  color: '#6E6E73',
                  padding: '4px 0',
                  cursor: reminderBusy ? 'wait' : 'pointer',
                  transitionDuration: '150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#1D1D1F')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6E6E73')}
              >
                <Icon name="bell" size={14} />
                <span>{reminderBusy ? 'Senden…' : 'Erinnerung senden'}</span>
              </button>
              {reminderSent && (
                <span
                  style={{
                    fontSize: '13px',
                    color: '#166534',
                    fontWeight: 500,
                    transition: 'opacity 300ms',
                  }}
                >
                  Erinnerung gesendet ✓
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: '24px' }}>
          <ProgressBar value={done} total={total} />
        </div>
      </div>

      <ActivityFeed events={events} open={activityOpen} onToggle={() => setActivityOpen((v) => !v)} />

      {error && (
        <div className="mb-6 px-4 py-3" style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '12px', color: '#991B1B', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <QualificationPanel leadId={id} locked={locked} />

      <h2
        className="mb-4"
        style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6E6E73' }}
      >
        Unterlagen
      </h2>

      {sections.map((s) => {
        const sectionItems = items.filter((i) => i.section_id === s.id);
        return (
          <section key={s.id} className="mb-8">
            <h3
              className="mb-3 px-1"
              style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6E6E73' }}
            >
              {s.label}
            </h3>
            <div className="bg-white overflow-hidden" style={{ borderRadius: '16px', boxShadow: CARD_SHADOW }}>
              {sectionItems.map((it, idx) => {
                const li = liByItem[it.id];
                const checked = !!li?.checked;
                const isLast = idx === sectionItems.length - 1;
                return (
                  <div
                    key={it.id}
                    className="transition-all"
                    style={{
                      padding: '16px 20px',
                      paddingLeft: '17px',
                      borderBottom: isLast ? 'none' : '1px solid #F3F4F6',
                      borderLeft: `3px solid ${checked ? '#22C55E' : 'transparent'}`,
                      background: checked ? '#F9FEFB' : 'white',
                      transitionDuration: '150ms',
                    }}
                  >
                    <div className="flex gap-3">
                      <div
                        style={{ marginTop: '1px' }}
                        title={locked ? 'Lead ist eingereicht' : (checked ? 'Häkchen entfernen' : 'Als erledigt markieren')}
                      >
                        <AnimatedCheckbox
                          checked={checked}
                          onChange={() => toggleItem(it.id, checked)}
                          disabled={locked}
                          ariaLabel="abhaken"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1D1D1F' }}>{it.label}</div>
                        {it.description && (
                          <div style={{ fontSize: '13px', color: '#6E6E73', marginTop: '2px', lineHeight: 1.5 }}>
                            {it.description}
                          </div>
                        )}
                        {li?.note && (
                          <div
                            className="whitespace-pre-wrap"
                            style={{
                              fontSize: '13px',
                              background: '#F5F5F7',
                              border: '1px solid #E5E7EB',
                              borderRadius: '10px',
                              padding: '10px 14px',
                              marginTop: '8px',
                              color: '#1D1D1F',
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#6E6E73' }}>Notiz: </span>{li.note}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 self-center flex flex-col items-end gap-2">
                        {li?.file_path ? (
                          <button
                            onClick={() => downloadFile(li.file_path)}
                            className="hover:underline inline-flex items-center gap-1.5"
                            style={{ fontSize: '12px', fontWeight: 500, color: '#22C55E' }}
                          >
                            <Icon name="paperclip" size={13} />
                            Datei ansehen
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#D1D5DB' }}>Kein Dokument</span>
                        )}
                        {!locked && (
                          <button
                            onClick={() => setOpenNoteId(openNoteId === it.id ? null : it.id)}
                            className="transition-colors inline-flex items-center gap-1"
                            style={{
                              fontSize: '12px',
                              color: '#6E6E73',
                              border: '1px solid #E5E7EB',
                              background: 'white',
                              borderRadius: '980px',
                              padding: '3px 10px',
                              transitionDuration: '150ms',
                            }}
                            title="Hinweis an den Kunden"
                          >
                            <Icon name="message" size={13} />
                            Hinweis
                            {li?.advisor_note && (
                              <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: '#F59E0B' }} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                    {!locked && openNoteId === it.id && (
                      <AdvisorNoteEditor
                        initial={li?.advisor_note ?? ''}
                        onSave={(v) => saveAdvisorNote(it.id, v)}
                        onClose={() => setOpenNoteId(null)}
                      />
                    )}
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

function AdvisorNoteEditor({ initial, onSave, onClose }) {
  const [value, setValue] = useState(initial);
  return (
    <div className="mt-3" style={{ paddingLeft: '34px' }}>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(value)}
        autoFocus
        rows={2}
        placeholder="Hinweis an den Kunden..."
        style={{
          width: '100%',
          fontSize: '13px',
          border: '1px solid #E5E7EB',
          borderRadius: '10px',
          padding: '10px',
          resize: 'vertical',
          color: '#1D1D1F',
          outline: 'none',
        }}
      />
      <div className="mt-1 flex justify-end">
        {initial && (
          <button
            type="button"
            onClick={() => { setValue(''); onSave(''); onClose(); }}
            style={{ fontSize: '12px', color: '#DC2626' }}
          >
            Hinweis löschen
          </button>
        )}
      </div>
    </div>
  );
}

function ActivityFeed({ events, open, onToggle }) {
  const visible = events.slice(0, 20);
  const hasMore = events.length > 20;
  const dotColor = (type) => {
    if (type === 'opened') return '#2563EB';
    if (type === 'upload' || type === 'submitted') return '#22C55E';
    return '#9CA3AF';
  };
  return (
    <div className="bg-white mb-6 overflow-hidden" style={{ borderRadius: '16px', boxShadow: CARD_SHADOW }}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between transition-colors"
        style={{ padding: '20px 24px', transitionDuration: '150ms' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
      >
        <div className="text-left">
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F' }}>Aktivität</div>
          <div style={{ fontSize: '13px', color: '#6E6E73', marginTop: '2px' }}>
            {events.length} {events.length === 1 ? 'Ereignis' : 'Ereignisse'}
          </div>
        </div>
        <span
          className="transition-transform"
          style={{
            fontSize: '20px',
            lineHeight: 1,
            color: '#6E6E73',
            transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
            transitionDuration: '200ms',
          }}
        >
          ›
        </span>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '20px 24px' }}>
          {events.length === 0 ? (
            <div style={{ fontSize: '13px', color: '#6E6E73' }}>Noch keine Aktivität.</div>
          ) : (
            <ol style={{ position: 'relative', paddingLeft: '20px' }}>
              <span
                aria-hidden
                style={{
                  position: 'absolute',
                  left: '3px',
                  top: '4px',
                  bottom: '4px',
                  width: '1px',
                  background: '#E5E7EB',
                }}
              />
              {visible.map((ev, i) => (
                <li key={i} style={{ position: 'relative', paddingBottom: '14px' }}>
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute',
                      left: '-20px',
                      top: '6px',
                      width: '8px',
                      height: '8px',
                      borderRadius: '999px',
                      background: dotColor(ev.type),
                      boxShadow: '0 0 0 3px white',
                    }}
                  />
                  <div style={{ fontSize: '12px', color: '#6E6E73' }}>{ev.time}</div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#1D1D1F',
                      marginTop: '2px',
                      fontWeight: ev.type === 'submitted' ? 600 : 400,
                    }}
                  >
                    {ev.text}
                  </div>
                </li>
              ))}
            </ol>
          )}
          {hasMore && (
            <button
              type="button"
              className="mt-2"
              style={{ fontSize: '13px', color: '#1B2A4A', fontWeight: 500 }}
            >
              Alle anzeigen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function mockEvents(lead) {
  const fmt = (d) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const base = lead?.created_at ? new Date(lead.created_at).getTime() : Date.now();
  const events = [
    { offsetMin: 30, type: 'opened', text: 'Kunde hat Link erstmals geöffnet' },
    { offsetMin: 45, type: 'upload', text: 'Personalausweis hochgeladen' },
    { offsetMin: 58, type: 'checked', text: 'Einkommensnachweise bestätigt' },
    { offsetMin: 72, type: 'opened', text: 'Abschnitt geöffnet: Bei vorhandenen Immobilien' },
  ];
  if (lead?.status === 'vollständig') {
    events.push({ offsetMin: 95, type: 'submitted', text: 'Unterlagen eingereicht' });
  }
  return events.map((e) => ({
    time: fmt(new Date(base + e.offsetMin * 60000)),
    type: e.type,
    text: e.text,
  }));
}
