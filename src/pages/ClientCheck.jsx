import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';

export default function ClientCheck() {
  const { share_uuid } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [section2Open, setSection2Open] = useState(false);
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

  const allItems = useMemo(() => sections.flatMap((s) => s.items.map((i) => ({ ...i, section: s }))), [sections]);
  const total = allItems.length;
  const done = allItems.filter((i) => i.lead_item?.checked).length;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Lade…</div>;
  }
  if (error || !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card p-6 max-w-md text-center">
          <h1 className="text-lg font-semibold text-wert-navy mb-2">Link ungültig</h1>
          <p className="text-sm text-slate-500">{error ?? 'Lead nicht gefunden.'}</p>
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
    if (!confirm('Unterlagen jetzt einreichen? Danach sind keine Änderungen mehr möglich.')) return;
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
      // notification is best-effort
    }
    setSubmitting(false);
    setShowSuccess(true);
  }

  return (
    <div className="min-h-screen bg-wert-bg pb-32">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
          <div className="font-bold tracking-wide text-wert-navy">UNTERLAGEN-CHECK</div>
          <div className="text-xs text-slate-400">Wertentwickler</div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        {submitted && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 mb-6 flex items-start gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white font-semibold">✓</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-emerald-800">Bereits eingereicht</div>
              <div className="text-sm text-emerald-700 mt-0.5">
                Eingereicht am {lead.submitted_at ? new Date(lead.submitted_at).toLocaleString('de-DE') : '—'}. Diese Ansicht ist nur noch lesbar.
              </div>
            </div>
            {IS_MOCK && (
              <button
                type="button"
                onClick={async () => { mock.resetSubmission(share_uuid); await load(); }}
                className="btn-ghost text-xs whitespace-nowrap"
                title="Setzt im Demo-Modus den Lead-Status zurück"
              >
                Demo zurücksetzen
              </button>
            )}
          </div>
        )}
        <div className="card p-5 mb-6">
          <div className="text-xs uppercase tracking-wide text-slate-400">Klient</div>
          <div className="text-lg font-semibold text-wert-navy">{lead.client_name}</div>
          {!submitted && (
            <p className="text-sm text-slate-500 mt-3">
              Bitte laden Sie zu jedem Punkt die Datei hoch oder bestätigen Sie per Häkchen, dass die Unterlage bereitliegt. Sie können bis zur endgültigen Einreichung jederzeit ändern.
            </p>
          )}
          <div className="mt-4">
            <ProgressLine value={done} total={total} />
          </div>
        </div>

        {sections.map((s, idx) => {
          const isSecondary = idx === 1;
          const collapsed = isSecondary && !section2Open;
          return (
            <section key={s.id} className="mb-6">
              {isSecondary ? (
                <button
                  onClick={() => setSection2Open((v) => !v)}
                  className="w-full text-left card px-5 py-4 flex items-center justify-between hover:bg-slate-50"
                  type="button"
                >
                  <div>
                    <div className="font-semibold text-wert-navy">{s.label}</div>
                    <div className="text-sm text-slate-500 mt-0.5">
                      Haben Sie bereits Immobilien? Dann öffnen Sie diesen Abschnitt.
                    </div>
                  </div>
                  <span className="text-slate-400 text-xl">{section2Open ? '−' : '+'}</span>
                </button>
              ) : (
                <h2 className="text-lg font-semibold text-wert-navy mb-3">{s.label}</h2>
              )}
              {!collapsed && (
                <div className={'card divide-y divide-slate-100 ' + (isSecondary ? 'mt-3' : '')}>
                  {s.items.map((it) => (
                    <ChecklistItemRow
                      key={it.id}
                      item={it}
                      shareUuid={share_uuid}
                      onChange={load}
                      locked={submitted}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </main>

      {!submitted && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <ProgressLine value={done} total={total} />
            </div>
            <button onClick={onSubmit} className="btn-primary whitespace-nowrap" disabled={submitting}>
              {submitting ? 'Wird eingereicht…' : 'Unterlagen einreichen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressLine({ value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
        <span>{value} von {total} Unterlagen</span>
        <span className="font-semibold text-wert-navy">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div className="h-full bg-wert-blue transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ChecklistItemRow({ item, shareUuid, onChange, locked }) {
  const li = item.lead_item ?? {};
  const [checked, setChecked] = useState(!!li.checked);
  const [note, setNote] = useState(li.note ?? '');
  const [filePath, setFilePath] = useState(li.file_path ?? null);
  const [uploading, setUploading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [err, setErr] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    setChecked(!!li.checked);
    setNote(li.note ?? '');
    setFilePath(li.file_path ?? null);
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
      setDownloadUrl(null);
      onChange?.();
      return;
    }
    const { error: e } = await supabase.rpc('delete_item_file', {
      p_share: shareUuid,
      p_item_id: item.id,
    });
    if (e) { setErr(e.message); return; }
    setFilePath(null);
    setDownloadUrl(null);
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

  return (
    <div className="p-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={locked}
          className={
            'mt-0.5 h-5 w-5 shrink-0 rounded border flex items-center justify-center transition ' +
            (checked
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-white border-slate-300 hover:border-wert-blue') +
            (locked ? ' opacity-70 cursor-not-allowed' : '')
          }
          aria-label="abhaken"
        >
          {checked ? '✓' : ''}
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-wert-navy">{item.label}</div>
          {item.description && (
            <div className="text-sm text-slate-500 mt-0.5">{item.description}</div>
          )}
          {(!locked || note) && (
            <textarea
              className="input mt-3 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              rows={2}
              placeholder="Notiz (optional)"
              value={note}
              disabled={locked}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => { if ((note ?? '') !== (li.note ?? '')) persist({ nextNote: note }); }}
            />
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {filePath ? (
              <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-sm">
                <button onClick={viewFile} className="text-wert-blue hover:underline truncate max-w-[16rem]">
                  📄 {fileName}
                </button>
                {!locked && (
                  <button onClick={removeFile} className="text-slate-400 hover:text-red-600" aria-label="Datei entfernen">🗑</button>
                )}
              </div>
            ) : !locked ? (
              <label className="btn-secondary cursor-pointer text-xs py-1.5 px-3">
                {uploading ? 'Hochladen…' : 'Datei hochladen'}
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={onUpload}
                  disabled={uploading}
                  accept="image/*,application/pdf"
                />
              </label>
            ) : (
              <span className="text-xs text-slate-400">Keine Datei hochgeladen</span>
            )}
          </div>
          {err && <div className="text-xs text-red-600 mt-2">{err}</div>}
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ lead, firstSubmit, onContinue }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-wert-bg">
      <div className="card p-8 max-w-md text-center">
        <div className="h-12 w-12 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl">✓</div>
        <h1 className="text-xl font-semibold text-wert-navy mt-4">Vielen Dank!</h1>
        <p className="text-sm text-slate-500 mt-2">
          {firstSubmit
            ? 'Ihr Berater wurde benachrichtigt.'
            : 'Diese Unterlagen wurden bereits eingereicht.'}
        </p>
        {lead.submitted_at && (
          <p className="text-xs text-slate-400 mt-3">
            Eingereicht am {new Date(lead.submitted_at).toLocaleString('de-DE')}
          </p>
        )}
        {onContinue && (
          <button onClick={onContinue} className="btn-secondary mt-6 w-full">
            Übersicht anzeigen
          </button>
        )}
      </div>
    </div>
  );
}
