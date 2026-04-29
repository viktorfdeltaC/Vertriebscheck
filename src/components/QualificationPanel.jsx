import { useEffect, useMemo, useState } from 'react';
import { IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';
import { computeVerdict, THRESHOLDS, VERDICT_STYLES } from '../lib/qualification.js';

const FLAGS = [
  { key: 'weniger_3j_sst', label: 'Weniger als 3 Jahre selbstständig' },
  { key: 'probezeit', label: 'Arbeitnehmer in Probezeit' },
  { key: 'konsumdarlehen', label: 'Vorhandene Konsumdarlehen' },
  { key: 'unterhalt', label: 'Unterhaltsverpflichtung' },
  { key: 'kompensation_ek', label: 'Geringeres Eigenkapital, dafür höheres Haushaltseinkommen / Gewinn' },
  { key: 'kompensation_einkommen', label: 'Geringeres Haushaltseinkommen / Gewinn, dafür höheres Eigenkapital' },
];

const KATEGORIEN = [
  {
    title: 'Generell',
    items: [
      { key: 'nebenkosten_ek', label: 'Nebenkosten des Erwerbs aus Eigenkapital', hint: 'ca. 8–12% des Kaufpreises' },
      { key: 'freie_liquiditaet', label: 'Mtl. ca. 150 € – 300 € freie Liquidität' },
      { key: 'weitere_anlagen', label: 'Weitere Geldanlagen / Vermögen vorhanden', hint: 'Liquiditätsreserve mind. 3 Monatsnettoeinkommen' },
    ],
  },
  {
    title: 'Denkmal-/Sanierungsobjekt',
    items: [
      { key: 'zve_ok', label: 'Zu versteuerndes Einkommen (ZVE)', hint: 'verheiratet: 120.000 € · ledig: 90.000 €' },
      { key: 'ek_5_10', label: '5–10% EK gewünscht' },
      { key: 'bauzeitzinsen', label: 'Liquides Kapital für Bauzeitzinsen (1–2 Jahre)' },
    ],
  },
  {
    title: 'Objektgröße (Kaufpreis)',
    items: [
      { key: 'objektgroesse', label: 'ca. bis 3–4 faches Jahreseinkommen' },
    ],
  },
];

const POTENTIAL = [
  { key: 'sparvertrag', label: 'Sparvertrag', hint: '> 100 € monatlich' },
  { key: 'privatversichert', label: 'Privatversicherte Angestellte' },
  { key: 'lebensversicherung', label: 'Lebensversicherung mit Rückkaufwert', hint: '> 15.000 €' },
  { key: 'bankguthaben', label: 'Bankguthaben', hint: '> 15.000 €' },
  { key: 'auslaufende_lv', label: 'Auslaufende Lebens- oder Rentenversicherungen' },
  { key: 'wiederanlage', label: 'Wiederanlage oder Umschichtung Sparverträge' },
];

const EMPTY = {
  familienstand: 'ledig',
  beschaeftigung: 'angestellt', // 'angestellt' | 'selbststaendig'
  haushaltseinkommen: '',
  gewinn_3j: '',
  zve: '',
  kinder: 0,
  eigenkapital: '',
  flags: {},
  kategorien: {},
  potential: {},
  notiz: '',
};

export default function QualificationPanel({ leadId, locked }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(EMPTY);
  const [savedAt, setSavedAt] = useState(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    if (IS_MOCK) {
      const q = mock.getQualification(leadId);
      if (q) {
        setState({ ...EMPTY, ...q });
        setSavedAt(q.updated_at ?? null);
        setOpen(true);
      }
    }
  }, [leadId]);

  const verdict = useMemo(() => computeVerdict(state), [state]);
  const v = VERDICT_STYLES[verdict.level];

  function update(patch) {
    setState((s) => ({ ...s, ...patch }));
    setDirty(true);
  }
  function toggleFlag(key) {
    setState((s) => ({ ...s, flags: { ...s.flags, [key]: !s.flags?.[key] } }));
    setDirty(true);
  }
  function toggleKategorie(key) {
    setState((s) => ({ ...s, kategorien: { ...s.kategorien, [key]: !s.kategorien?.[key] } }));
    setDirty(true);
  }
  function togglePotential(key) {
    setState((s) => ({ ...s, potential: { ...s.potential, [key]: !s.potential?.[key] } }));
    setDirty(true);
  }

  function save() {
    if (IS_MOCK) {
      mock.saveQualification(leadId, state);
      setSavedAt(new Date().toISOString());
      setDirty(false);
      return;
    }
    // TODO: Supabase persistence (eigene Tabelle lead_qualifications) sobald Migration angelegt ist.
  }

  return (
    <div className="card mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={'inline-flex h-8 w-8 items-center justify-center rounded-lg ' + v.bg + ' ' + v.text + ' font-semibold'}>
            {v.icon}
          </span>
          <div className="text-left">
            <div className="font-semibold text-wert-navy">Voraussetzungs-Check</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Berater-interne Vorqualifizierung – nicht für den Klienten sichtbar.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ' + v.bg + ' ' + v.text}>
            <span className={'h-1.5 w-1.5 rounded-full ' + v.dot} />
            {v.label}
          </span>
          <span className="text-slate-400 text-xl">{open ? '−' : '+'}</span>
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-5 space-y-6">
          {/* Verdict-Details */}
          <div className={'rounded-lg border px-4 py-3 ' + v.bg + ' ' + v.border}>
            <div className={'text-sm font-semibold ' + v.text}>{v.label}</div>
            {verdict.reasons.length > 0 && (
              <ul className={'text-xs mt-1 list-disc list-inside ' + v.text}>
                {verdict.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            {verdict.level === 'empty' && (
              <div className="text-xs text-slate-500 mt-1">Bitte Einkommen und Eigenkapital erfassen.</div>
            )}
          </div>

          {/* 1. Prüfraster */}
          <section>
            <h3 className="text-sm font-semibold text-wert-navy mb-3 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">1</span> Prüfraster
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Familienstand</label>
                <select
                  className="input"
                  value={state.familienstand}
                  onChange={(e) => update({ familienstand: e.target.value })}
                  disabled={locked}
                >
                  <option value="ledig">ledig</option>
                  <option value="verheiratet">verheiratet</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="label">Beschäftigung</label>
                <select
                  className="input"
                  value={state.beschaeftigung}
                  onChange={(e) => update({ beschaeftigung: e.target.value })}
                  disabled={locked}
                >
                  <option value="angestellt">Angestellt</option>
                  <option value="selbststaendig">Selbstständig</option>
                </select>
              </div>
              <div>
                <label className="label">Kinder im Haushalt</label>
                <input
                  type="number"
                  min="0"
                  className="input"
                  value={state.kinder}
                  onChange={(e) => update({ kinder: e.target.value })}
                  disabled={locked}
                />
              </div>
              <div>
                <label className="label">Eigenkapital (€)</label>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="input"
                  placeholder={`min. ${verdict.thresholds.ek.toLocaleString('de-DE')}`}
                  value={state.eigenkapital}
                  onChange={(e) => update({ eigenkapital: e.target.value })}
                  disabled={locked}
                />
              </div>
              {state.beschaeftigung === 'angestellt' ? (
                <div className="col-span-2">
                  <label className="label">Haushaltseinkommen netto (€/Monat)</label>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className="input"
                    placeholder={`min. ${verdict.thresholds.einkommen.toLocaleString('de-DE')}`}
                    value={state.haushaltseinkommen}
                    onChange={(e) => update({ haushaltseinkommen: e.target.value })}
                    disabled={locked}
                  />
                </div>
              ) : (
                <div className="col-span-2">
                  <label className="label">Gewinn nach Steuer p.a. (Ø letzte 3 Jahre, €)</label>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    className="input"
                    placeholder={`min. ${verdict.thresholds.gewinn.toLocaleString('de-DE')}`}
                    value={state.gewinn_3j}
                    onChange={(e) => update({ gewinn_3j: e.target.value })}
                    disabled={locked}
                  />
                </div>
              )}
              <div className="col-span-2 sm:col-span-2">
                <label className="label">Zu versteuerndes Einkommen p.a. (€) <span className="text-slate-400 font-normal">– für Denkmal/Sanierung</span></label>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="input"
                  placeholder={`Denkmal-Schwelle: ${verdict.thresholds.zve.toLocaleString('de-DE')}`}
                  value={state.zve}
                  onChange={(e) => update({ zve: e.target.value })}
                  disabled={locked}
                />
              </div>
            </div>
            <ThresholdsTable familienstand={state.familienstand} />
          </section>

          {/* 2. Gesonderte Prüfung */}
          <section>
            <h3 className="text-sm font-semibold text-wert-navy mb-3 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">2</span> Gesonderte Prüfung
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {FLAGS.map((f) => (
                <CheckboxRow
                  key={f.key}
                  checked={!!state.flags?.[f.key]}
                  onToggle={() => toggleFlag(f.key)}
                  label={f.label}
                  locked={locked}
                  variant="warn"
                />
              ))}
            </div>
          </section>

          {/* 3. Voraussetzungen-Kategorien */}
          <section>
            <h3 className="text-sm font-semibold text-wert-navy mb-3 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">3</span> Voraussetzungen – Kategorien
            </h3>
            <div className="space-y-4">
              {KATEGORIEN.map((cat) => (
                <div key={cat.title}>
                  <div className="text-xs uppercase tracking-wide text-wert-blue font-semibold mb-2">{cat.title}</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {cat.items.map((it) => (
                      <CheckboxRow
                        key={it.key}
                        checked={!!state.kategorien?.[it.key]}
                        onToggle={() => toggleKategorie(it.key)}
                        label={it.label}
                        hint={it.hint}
                        locked={locked}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Potentialfindung */}
          <section>
            <h3 className="text-sm font-semibold text-wert-navy mb-3 flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">4</span> Ideen zur Potentialfindung
            </h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {POTENTIAL.map((p) => (
                <CheckboxRow
                  key={p.key}
                  checked={!!state.potential?.[p.key]}
                  onToggle={() => togglePotential(p.key)}
                  label={p.label}
                  hint={p.hint}
                  locked={locked}
                />
              ))}
            </div>
          </section>

          {/* Notiz + Speichern */}
          <section>
            <label className="label">Notiz (intern)</label>
            <textarea
              rows={2}
              className="input"
              placeholder="z.B. Sondersituationen, Beratungshinweise…"
              value={state.notiz}
              onChange={(e) => update({ notiz: e.target.value })}
              disabled={locked}
            />
          </section>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {savedAt ? <>Zuletzt gespeichert: {new Date(savedAt).toLocaleString('de-DE')}</> : <>Noch nicht gespeichert.</>}
              {dirty && <span className="ml-2 text-amber-600 font-medium">· ungespeicherte Änderungen</span>}
            </div>
            <button onClick={save} className="btn-primary" disabled={locked || !dirty}>
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThresholdsTable({ familienstand }) {
  return (
    <div className="text-xs rounded-lg border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-3 bg-slate-50 text-slate-500 uppercase tracking-wide font-semibold px-3 py-1.5">
        <div>Prüfwert</div>
        <div className={familienstand === 'ledig' ? 'text-wert-navy' : ''}>ledig</div>
        <div className={familienstand === 'verheiratet' ? 'text-wert-navy' : ''}>verheiratet</div>
      </div>
      {[
        ['Haushaltseinkommen netto / Monat (Angestellt)', '2.500 €', '3.800 €'],
        ['Gewinn n. Steuer p.a. (Ø 3J., Selbstständig)', '50.000 €', '70.000 €'],
        ['Pro Kind im Haushalt / Monat (Abzug)', '300 €', '300 €'],
        ['Eigenkapital (Cash/Ersatzsicherheiten)', '7.500 €', '12.000 €'],
        ['ZVE für Denkmal-/Sanierungsobjekt', '90.000 €', '120.000 €'],
      ].map((row) => (
        <div key={row[0]} className="grid grid-cols-3 px-3 py-1.5 border-t border-slate-100">
          <div className="text-slate-600">{row[0]}</div>
          <div className={familienstand === 'ledig' ? 'font-semibold text-wert-navy' : 'text-slate-500'}>{row[1]}</div>
          <div className={familienstand === 'verheiratet' ? 'font-semibold text-wert-navy' : 'text-slate-500'}>{row[2]}</div>
        </div>
      ))}
    </div>
  );
}

function CheckboxRow({ checked, onToggle, label, hint, locked, variant }) {
  const tickClass = variant === 'warn'
    ? (checked ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300 hover:border-amber-400')
    : (checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-300 hover:border-wert-blue');
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={locked}
      className="flex items-start gap-2.5 text-left px-3 py-2 rounded-lg hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className={'mt-0.5 h-4 w-4 shrink-0 rounded border flex items-center justify-center text-xs transition ' + tickClass}>
        {checked ? '✓' : ''}
      </span>
      <span className="text-sm text-wert-navy leading-snug">
        {label}
        {hint && <span className="block text-xs text-slate-500 font-normal mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}
