import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';
import AnimatedCheckbox from '../components/AnimatedCheckbox.jsx';
import { deadlineStatus, formatDeadline } from '../lib/deadline.js';
import Icon from '../components/Icon.jsx';

const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)';

export default function ClientCheck() {
  const { share_uuid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasProperty, setHasProperty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  async function load() {
    setLoading(true);
    if (IS_MOCK) {
      const res = mock.getByShare(share_uuid);
      if (!res) setError('Link ungültig oder abgelaufen.');
      setData(res);
      setLoading(false);
      return;
    }
    const { data: res, error: err } = await supabase.rpc('get_lead_by_share', { p_share: share_uuid });
    if (err) setError('Link ungültig oder abgelaufen.');
    setData(res ?? null);
    setLoading(false);
  }

  useEffect(() => { load(); }, [share_uuid]);

  const lead = data?.lead;
  const sections = data?.sections ?? [];
  const submitted = lead?.status === 'vollständig';

  const standardSection = sections[0];
  const propertySection = sections[1];

  useEffect(() => {
    if (propertySection?.items?.some((i) => i.lead_item?.checked || i.lead_item?.file_path)) {
      setHasProperty(true);
    }
  }, [propertySection]);

  const standardItems = standardSection?.items ?? [];
  const propertyItems = propertySection?.items ?? [];

  const countingItems = hasProperty ? [...standardItems, ...propertyItems] : standardItems;
  const total = countingItems.length;
  const done = countingItems.filter((i) => i.lead_item?.checked).length;
  const standardDone = standardItems.filter((i) => i.lead_item?.checked).length;
  const allStandardDone = standardItems.length > 0 && standardDone === standardItems.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-[#6E6E73]" style={{ background: '#F5F5F7' }}>Lade…</div>;
  }
  if (error || !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F5F7' }}>
        <div className="bg-white rounded-2xl p-8 max-w-md text-center" style={{ boxShadow: CARD_SHADOW }}>
          <h1 className="text-lg font-semibold text-[#1D1D1F] mb-2">Link ungültig</h1>
          <p className="text-sm text-[#6E6E73]">{error ?? 'Lead nicht gefunden.'}</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <SuccessScreen lead={lead} firstSubmit shareUuid={share_uuid} onContinue={() => { setShowSuccess(false); load(); }} />
    );
  }

  async function onSubmit() {
    if (done < 1) return;
    if (!confirm('Bereit zum Absenden? Nach dem Senden können Sie keine Änderungen mehr vornehmen.')) return;
    setSubmitting(true);
    if (IS_MOCK) {
      mock.submitByShare(share_uuid);
      setSubmitting(false);
      setShowSuccess(true);
      return;
    }
    const { error: err } = await supabase.rpc('submit_lead', { p_share: share_uuid });
    if (err) {
      setSubmitting(false);
      alert(err.message);
      return;
    }
    try {
      await supabase.functions.invoke('notify-rep', { body: { share_uuid } });
    } catch {
      // best-effort
    }
    setSubmitting(false);
    setShowSuccess(true);
  }

  return (
    <div className="min-h-screen pb-32" style={{ background: '#F5F5F7' }}>
      <header
        className="sticky top-0 z-20 bg-white"
        style={{ borderBottom: '1px solid #E5E7EB' }}
      >
        <div className="max-w-3xl mx-auto px-5 sm:px-6 h-[52px] flex items-center justify-between">
          <div
            className="text-[#1D1D1F]"
            style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.01em' }}
          >
            Unterlagen-Check
          </div>
          <div className="text-[#6E6E73]" style={{ fontSize: '13px' }}>Wertentwickler</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 sm:px-6 py-8">
        {submitted && (
          <div
            className="rounded-2xl bg-[#F0FDF4] px-6 py-5 mb-8 flex items-start gap-4"
            style={{ border: '1px solid #BBF7D0' }}
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#22C55E] text-white">✓</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[#166534]">Wir haben alles erhalten – vielen Dank!</div>
              <div className="text-sm text-[#15803D] mt-0.5">
                Eingereicht am {lead.submitted_at ? new Date(lead.submitted_at).toLocaleString('de-DE') : '—'}. Ihr Berater meldet sich in Kürze bei Ihnen.
              </div>
            </div>
            {IS_MOCK && (
              <button
                type="button"
                onClick={async () => { mock.resetSubmission(share_uuid); await load(); }}
                className="text-xs text-[#6E6E73] hover:text-[#1D1D1F] whitespace-nowrap transition-colors"
                style={{ transitionDuration: '150ms' }}
              >
                Demo zurücksetzen
              </button>
            )}
          </div>
        )}

        {/* Hero card */}
        <section
          className="bg-white rounded-2xl mb-10"
          style={{ boxShadow: CARD_SHADOW, padding: '32px' }}
        >
          <h1
            className="text-[#1D1D1F]"
            style={{ fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2 }}
          >
            Schön, dass Sie da sind, {lead.client_name}.
          </h1>
          {!submitted && (
            <p
              className="text-[#6E6E73] mt-3"
              style={{ fontSize: '15px', lineHeight: 1.6, maxWidth: '520px' }}
            >
              Hier sammeln wir gemeinsam alles, was Ihr Berater für Ihre Finanzierung braucht. Laden Sie Ihre Dokumente einfach direkt hoch oder bestätigen Sie kurz, dass sie bereitliegen.
            </p>
          )}
          {(() => {
            const ds = deadlineStatus(lead.deadline);
            if (!ds || submitted) return null;
            const fmtDate = formatDeadline(lead.deadline);
            if (ds.level === 'expired') {
              return (
                <div
                  className="mt-5"
                  style={{ background: '#FEF2F2', color: '#991B1B', borderRadius: '10px', padding: '12px 16px', fontSize: '14px' }}
                >
                  Die Frist ist verstrichen. Melden Sie sich bitte kurz bei Ihrem Berater – gemeinsam finden wir eine Lösung.
                </div>
              );
            }
            if (ds.level === 'warning') {
              return (
                <div
                  className="mt-5 flex items-start gap-2.5"
                  style={{ background: '#FEF3C7', color: '#92400E', borderRadius: '10px', padding: '12px 16px', fontSize: '14px' }}
                >
                  <span style={{ marginTop: '2px' }}><Icon name="alertTriangle" size={16} /></span>
                  <span>Es bleiben {ds.daysLeft === 0 ? 'nur noch heute' : `noch ${ds.daysLeft} Tag${ds.daysLeft === 1 ? '' : 'e'}`} bis zum {fmtDate}. Falls etwas fehlt, melden Sie sich gerne bei Ihrem Berater.</span>
                </div>
              );
            }
            return (
              <div
                className="mt-5 flex items-start gap-2.5"
                style={{ background: '#EFF6FF', color: '#1E40AF', borderRadius: '10px', padding: '12px 16px', fontSize: '14px' }}
              >
                <span style={{ marginTop: '2px' }}><Icon name="calendar" size={16} /></span>
                <span>Ihre Frist ist der {fmtDate}. Bei Fragen sind wir gerne für Sie da.</span>
              </div>
            );
          })()}
          <div className="mt-7">
            <div className="text-[#6E6E73] mb-2" style={{ fontSize: '13px' }}>
              {done} von {total} Unterlagen · {pct}%
            </div>
            <div
              className="w-full overflow-hidden"
              style={{ height: '6px', borderRadius: '999px', background: '#E5E7EB' }}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #1B2A4A, #2563EB)',
                  transitionDuration: '300ms',
                }}
              />
            </div>
          </div>
        </section>

        {standardSection && (
          <section className="mb-10">
            <h2
              className="text-[#6E6E73] uppercase mb-4 px-1"
              style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em' }}
            >
              {standardSection.label}
            </h2>
            <div className="space-y-3">
              {standardItems.map((it) => (
                <ChecklistItemRow
                  key={it.id}
                  item={it}
                  shareUuid={share_uuid}
                  onChange={load}
                  locked={submitted}
                />
              ))}
            </div>
          </section>
        )}

        {propertySection && (
          <section className="mb-10">
            <PropertyToggle
              open={hasProperty}
              disabled={submitted}
              onToggle={() => setHasProperty((v) => !v)}
            />
            {hasProperty && (
              <>
                <h2
                  className="text-[#6E6E73] uppercase mt-8 mb-4 px-1"
                  style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '0.04em' }}
                >
                  {propertySection.label}
                </h2>
                <div className="space-y-3">
                  {propertyItems.map((it) => (
                    <ChecklistItemRow
                      key={it.id}
                      item={it}
                      shareUuid={share_uuid}
                      onChange={load}
                      locked={submitted}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {!submitted && (
        <div
          className="fixed bottom-0 left-0 right-0 z-20"
          style={{
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid #E5E7EB',
          }}
        >
          <div
            className="w-full overflow-hidden"
            style={{ height: '3px', background: '#E5E7EB' }}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #1B2A4A, #2563EB)',
                transitionDuration: '300ms',
              }}
            />
          </div>
          <div className="max-w-3xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="text-[#6E6E73]" style={{ fontSize: '13px' }}>
              {done} von {total} · {pct}%
            </div>
            <button
              onClick={onSubmit}
              disabled={submitting || done < 1}
              className={
                'transition-all ' +
                (allStandardDone && !submitting && done >= 1 ? 'animate-pulse-soft ' : '')
              }
              style={{
                background: '#1D1D1F',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                padding: '10px 20px',
                borderRadius: '980px',
                opacity: done < 1 || submitting ? 0.3 : 1,
                cursor: done < 1 || submitting ? 'not-allowed' : 'pointer',
                transitionDuration: '150ms',
              }}
            >
              {submitting ? 'Wird eingereicht…' : 'Unterlagen einreichen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PropertyToggle({ open, disabled, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="w-full text-left flex items-center justify-between transition-all"
      style={{
        background: open ? 'white' : '#F5F5F7',
        border: '1px solid #E5E7EB',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: open ? CARD_SHADOW : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transitionDuration: '150ms',
      }}
    >
      <div>
        <div className="text-[#1D1D1F]" style={{ fontSize: '15px', fontWeight: 500 }}>
          Ich habe bereits Immobilien
        </div>
        <div className="text-[#6E6E73] mt-0.5" style={{ fontSize: '13px' }}>
          Falls Sie bereits Immobilien besitzen, brauchen wir noch ein paar zusätzliche Unterlagen.
        </div>
      </div>
      <span
        className="text-[#6E6E73] transition-transform"
        style={{
          fontSize: '20px',
          lineHeight: 1,
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          transitionDuration: '150ms',
        }}
      >
        ›
      </span>
    </button>
  );
}

function ChecklistItemRow({ item, shareUuid, onChange, locked }) {
  const li = item.lead_item ?? {};
  const [checked, setChecked] = useState(!!li.checked);
  const [note, setNote] = useState(li.note ?? '');
  const [filePath, setFilePath] = useState(li.file_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [showNote, setShowNote] = useState(!!(li.note && li.note.length > 0));
  const [hover, setHover] = useState(false);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    setChecked(!!li.checked);
    setNote(li.note ?? '');
    setFilePath(li.file_path ?? null);
    if (li.note && li.note.length > 0) setShowNote(true);
  }, [li.checked, li.note, li.file_path]);

  async function persist({ nextChecked = checked, nextNote = note, nextPath = filePath }) {
    if (IS_MOCK) {
      try {
        mock.updateLeadItemPublic(shareUuid, item.id, {
          checked: nextChecked,
          note: nextNote,
          filePath: nextPath,
        });
      } catch (e) { setErr(e.message); }
      onChange?.();
      return;
    }
    const { error: e } = await supabase.rpc('update_lead_item_public', {
      p_share: shareUuid,
      p_item_id: item.id,
      p_checked: nextChecked,
      p_note: nextNote,
      p_file_path: nextPath,
    });
    if (e) setErr(e.message);
    onChange?.();
  }

  async function toggle() {
    const next = !checked;
    setChecked(next);
    await persist({ nextChecked: next });
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setUploading(true);
    if (IS_MOCK) {
      try {
        const path = mock.attachFile(shareUuid, item.id, file);
        setFilePath(path);
        setChecked(true);
      } catch (ex) { setErr(ex.message); }
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
      onChange?.();
      return;
    }
    try {
      const { data: signed, error: rpcErr } = await supabase.rpc('request_upload_url', {
        p_share: shareUuid,
        p_item_id: item.id,
        p_filename: file.name,
      });
      if (rpcErr) throw rpcErr;
      const path = signed.path;
      const token = signed.signed?.token;
      const { error: upErr } = await supabase.storage
        .from('lead-docs')
        .uploadToSignedUrl(path, token, file);
      if (upErr) throw upErr;
      setFilePath(path);
      await persist({ nextPath: path, nextChecked: true });
      setChecked(true);
    } catch (ex) {
      setErr(ex.message ?? 'Upload fehlgeschlagen.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function removeFile() {
    if (!filePath) return;
    if (!confirm('Datei entfernen?')) return;
    if (IS_MOCK) {
      try { mock.removeFile(shareUuid, item.id); } catch (e) { setErr(e.message); return; }
      setFilePath(null);
      onChange?.();
      return;
    }
    const { error: e } = await supabase.rpc('delete_item_file', {
      p_share: shareUuid,
      p_item_id: item.id,
    });
    if (e) { setErr(e.message); return; }
    setFilePath(null);
    onChange?.();
  }

  async function viewFile() {
    if (!filePath) return;
    if (IS_MOCK) { alert(`Mock-Datei: ${filePath}`); return; }
    const { data: url, error: e } = await supabase.rpc('request_download_url', { p_path: filePath });
    if (e) { setErr(e.message); return; }
    if (url) window.open(url, '_blank', 'noopener');
  }

  const fileName = filePath ? filePath.split('/').pop().replace(/^\d+_/, '') : null;
  const hasFile = !!filePath;

  return (
    <div
      className="bg-white transition-all"
      style={{
        borderRadius: '16px',
        padding: '16px',
        paddingLeft: '13px',
        borderLeft: `3px solid ${checked ? '#22C55E' : 'transparent'}`,
        background: checked ? '#F0FDF4' : '#FFFFFF',
        boxShadow: CARD_SHADOW,
        transitionDuration: '150ms',
      }}
    >
      <div className="flex items-start gap-3">
        <div style={{ marginTop: '1px' }}>
          <AnimatedCheckbox checked={checked} onChange={toggle} disabled={locked} ariaLabel="abhaken" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[#1D1D1F]" style={{ fontSize: '15px', fontWeight: 500 }}>{item.label}</div>
          {item.description && (
            <div className="text-[#6E6E73]" style={{ fontSize: '13px', marginTop: '2px', lineHeight: 1.5 }}>
              {item.description}
            </div>
          )}

          {li.advisor_note && (
            <div
              className="mt-3"
              style={{
                background: '#FEF3C7',
                borderLeft: '3px solid #F59E0B',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <div
                className="inline-flex items-center gap-1.5"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#92400E',
                }}
              >
                <Icon name="message" size={13} />
                Ein kurzer Hinweis von Ihrem Berater
              </div>
              <div style={{ fontSize: '13px', color: '#92400E', marginTop: '2px', lineHeight: 1.5 }}>
                {li.advisor_note}
              </div>
            </div>
          )}

          {!locked && (
            <div className="mt-3">
              {hasFile ? (
                <div
                  className="flex items-center gap-2 transition-all"
                  style={{
                    height: '44px',
                    padding: '0 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #22C55E',
                    background: '#F0FDF4',
                    transitionDuration: '150ms',
                  }}
                >
                  <span className="text-[#22C55E]" style={{ fontSize: '14px' }}>✓</span>
                  <button
                    onClick={viewFile}
                    className="flex-1 min-w-0 text-left truncate hover:underline"
                    style={{ fontSize: '13px', fontWeight: 500, color: '#166534' }}
                    title={fileName}
                  >
                    {fileName}
                  </button>
                  <button
                    onClick={removeFile}
                    className="hover:text-red-600 transition-colors"
                    style={{ fontSize: '13px', color: '#15803D', transitionDuration: '150ms' }}
                    aria-label="Datei entfernen"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <label
                  onMouseEnter={() => setHover(true)}
                  onMouseLeave={() => setHover(false)}
                  className="flex items-center justify-center gap-2 cursor-pointer transition-all"
                  style={{
                    height: '44px',
                    borderRadius: '10px',
                    border: `1.5px dashed ${hover || uploading ? '#2563EB' : '#D1D5DB'}`,
                    background: hover || uploading ? '#EFF6FF' : '#F5F5F7',
                    color: hover || uploading ? '#2563EB' : '#6E6E73',
                    fontSize: '13px',
                    transitionDuration: '150ms',
                  }}
                >
                  <Icon name="upload" size={14} />
                  <span>{uploading ? 'Hochladen…' : 'Datei hochladen'}</span>
                  <span style={{ color: '#D1D5DB' }}>—</span>
                  <span>PDF, JPG, PNG bis 10 MB</span>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    onChange={onUpload}
                    disabled={uploading}
                    accept="image/*,application/pdf"
                  />
                </label>
              )}
            </div>
          )}

          {locked && hasFile && (
            <div
              className="mt-3 flex items-center gap-2"
              style={{
                height: '44px',
                padding: '0 14px',
                borderRadius: '10px',
                border: '1px solid #E5E7EB',
                background: '#F5F5F7',
                fontSize: '13px',
              }}
            >
              <span style={{ color: '#6E6E73', display: 'inline-flex' }}><Icon name="fileText" size={14} /></span>
              <button onClick={viewFile} className="text-[#2563EB] hover:underline truncate">{fileName}</button>
            </div>
          )}

          {!locked && (
            <div className="mt-2">
              {!showNote && !note ? (
                <button
                  type="button"
                  onClick={() => setShowNote(true)}
                  className="text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
                  style={{ fontSize: '12px', transitionDuration: '150ms' }}
                >
                  + Notiz hinzufügen
                </button>
              ) : (
                <textarea
                  className="w-full bg-white outline-none resize-none transition-colors"
                  rows={2}
                  placeholder="Notiz (optional)"
                  value={note}
                  autoFocus={showNote && !note}
                  onChange={(e) => setNote(e.target.value)}
                  onBlur={() => {
                    if ((note ?? '') !== (li.note ?? '')) persist({ nextNote: note });
                    if (!note) setShowNote(false);
                  }}
                  style={{
                    fontSize: '13px',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #E5E7EB',
                    color: '#1D1D1F',
                    transitionDuration: '150ms',
                  }}
                />
              )}
            </div>
          )}

          {locked && note && (
            <div className="mt-2 italic" style={{ fontSize: '13px', color: '#6E6E73' }}>„{note}"</div>
          )}

          {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ lead, firstSubmit, onContinue }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#F5F5F7' }}>
      <div className="bg-white rounded-2xl p-8 max-w-md text-center" style={{ boxShadow: CARD_SHADOW }}>
        <div className="h-12 w-12 mx-auto rounded-full bg-[#F0FDF4] text-[#22C55E] flex items-center justify-center text-2xl">✓</div>
        <h1 className="text-[#1D1D1F] mt-4" style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em' }}>
          Geschafft – vielen Dank!
        </h1>
        <p className="text-[#6E6E73] mt-2" style={{ fontSize: '14px', lineHeight: 1.55 }}>
          {firstSubmit
            ? 'Ihr Berater hat Ihre Unterlagen erhalten und meldet sich in Kürze bei Ihnen.'
            : 'Diese Unterlagen haben Sie bereits eingereicht.'}
        </p>
        {lead.submitted_at && (
          <p className="text-[#6E6E73] mt-3" style={{ fontSize: '12px' }}>
            Eingereicht am {new Date(lead.submitted_at).toLocaleString('de-DE')}
          </p>
        )}
        {onContinue && (
          <button
            onClick={onContinue}
            className="mt-6 w-full transition-all"
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
            Übersicht anzeigen
          </button>
        )}
      </div>
    </div>
  );
}
