import { useEffect, useMemo, useState } from 'react';
import { IS_MOCK } from '../lib/supabase.js';
import { mock } from '../lib/mock.js';
import { computeVerdict } from '../lib/qualification.js';

const CARD_SHADOW = '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)';

const PILL_COLORS = {
  pass: { bg: '#DCFCE7', text: '#166534', dot: '#22C55E', label: 'Qualifiziert' },
  warn: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B', label: 'Mit Auflagen' },
  fail: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', label: 'Nicht qualifiziert' },
  empty: { bg: '#F3F4F6', text: '#6E6E73', dot: '#9CA3AF', label: 'Noch nicht erfasst' },
};

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
  beschaeftigung: 'angestellt',
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
      }
    }
  }, [leadId]);

  const verdict = useMemo(() => computeVerdict(state), [state]);
  const pill = PILL_COLORS[verdict.level];

  function update(patch) { setState((s) => ({ ...s, ...patch })); setDirty(true); }
  function toggleFlag(key) { setState((s) => ({ ...s, flags: { ...s.flags, [key]: !s.flags?.[key] } })); setDirty(true); }
  function toggleKategorie(key) { setState((s) => ({ ...s, kategorien: { ...s.kategorien, [key]: !s.kategorien?.[key] } })); setDirty(true); }
  function togglePotential(key) { setState((s) => ({ ...s, potential: { ...s.potential, [key]: !s.potential?.[key] } })); setDirty(true); }

  function save() {
    if (IS_MOCK) {
      mock.saveQualification(leadId, state);
      setSavedAt(new Date().toISOString());
      setDirty(false);
    }
  }

  return (
    <div className="bg-white mb-6 overflow-hidden" style={{ borderRadius: '16px', boxShadow: CARD_SHADOW }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 transition-colors"
        style={{ padding: '20px 24px', transitionDuration: '150ms' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#F9FAFB')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
      >
        <div className="text-left flex-1 min-w-0">
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F' }}>Voraussetzungs-Check</div>
          <div style={{ fontSize: '13px', color: '#6E6E73', marginTop: '2px' }}>
            Berater-interne Vorqualifizierung – nicht für den Klienten sichtbar.
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '980px',
              padding: '3px 10px',
              fontSize: '11px',
              fontWeight: 600,
              background: pill.bg,
              color: pill.text,
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: pill.dot }} />
            {pill.label}
          </span>
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
        </div>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid #F3F4F6', padding: '24px' }} className="space-y-7">
          {/* Verdict box */}
          <div
            style={{
              borderRadius: '10px',
              padding: '14px 16px',
              background: pill.bg,
              border: `1px solid ${pill.dot}33`,
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 600, color: pill.text }}>{pill.label}</div>
            {verdict.reasons.length > 0 && (
              <ul style={{ fontSize: '12px', color: pill.text, marginTop: '4px', listStyle: 'disc inside' }}>
                {verdict.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
            {verdict.level === 'empty' && (
              <div style={{ fontSize: '12px', color: '#6E6E73', marginTop: '4px' }}>
                Bitte Einkommen und Eigenkapital erfassen.
              </div>
            )}
          </div>

          <Section number="1" title="Prüfraster">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="col-span-2 sm:col-span-1">
                <FieldLabel>Familienstand</FieldLabel>
                <select
                  value={state.familienstand}
                  onChange={(e) => update({ familienstand: e.target.value })}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  disabled={locked}
                  style={INPUT_STYLE}
                >
                  <option value="ledig">ledig</option>
                  <option value="verheiratet">verheiratet</option>
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <FieldLabel>Beschäftigung</FieldLabel>
                <select
                  value={state.beschaeftigung}
                  onChange={(e) => update({ beschaeftigung: e.target.value })}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  disabled={locked}
                  style={INPUT_STYLE}
                >
                  <option value="angestellt">Angestellt</option>
                  <option value="selbststaendig">Selbstständig</option>
                </select>
              </div>
              <div>
                <FieldLabel>Kinder im Haushalt</FieldLabel>
                <input
                  type="number"
                  min="0"
                  value={state.kinder}
                  onChange={(e) => update({ kinder: e.target.value })}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  disabled={locked}
                  style={INPUT_STYLE}
                />
              </div>
              <div>
                <FieldLabel>Eigenkapital (€)</FieldLabel>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder={`min. ${verdict.thresholds.ek.toLocaleString('de-DE')}`}
                  value={state.eigenkapital}
                  onChange={(e) => update({ eigenkapital: e.target.value })}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  disabled={locked}
                  style={INPUT_STYLE}
                />
              </div>
              {state.beschaeftigung === 'angestellt' ? (
                <div className="col-span-2">
                  <FieldLabel>Haushaltseinkommen netto (€/Monat)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder={`min. ${verdict.thresholds.einkommen.toLocaleString('de-DE')}`}
                    value={state.haushaltseinkommen}
                    onChange={(e) => update({ haushaltseinkommen: e.target.value })}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    disabled={locked}
                    style={INPUT_STYLE}
                  />
                </div>
              ) : (
                <div className="col-span-2">
                  <FieldLabel>Gewinn nach Steuer p.a. (Ø letzte 3 Jahre, €)</FieldLabel>
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    placeholder={`min. ${verdict.thresholds.gewinn.toLocaleString('de-DE')}`}
                    value={state.gewinn_3j}
                    onChange={(e) => update({ gewinn_3j: e.target.value })}
                    onFocus={inputFocus}
                    onBlur={inputBlur}
                    disabled={locked}
                    style={INPUT_STYLE}
                  />
                </div>
              )}
              <div className="col-span-2 sm:col-span-2">
                <FieldLabel>
                  Zu versteuerndes Einkommen p.a. (€){' '}
                  <span style={{ color: '#9CA3AF', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                    – für Denkmal/Sanierung
                  </span>
                </FieldLabel>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  placeholder={`Denkmal-Schwelle: ${verdict.thresholds.zve.toLocaleString('de-DE')}`}
                  value={state.zve}
                  onChange={(e) => update({ zve: e.target.value })}
                  onFocus={inputFocus}
                  onBlur={inputBlur}
                  disabled={locked}
                  style={INPUT_STYLE}
                />
              </div>
            </div>
            <ThresholdsTable familienstand={state.familienstand} />
          </Section>

          <Section number="2" title="Gesonderte Prüfung">
            <div className="grid sm:grid-cols-2 gap-2">
              {FLAGS.map((f) => (
                <CheckboxRow
                  key={f.key}
                  checked={!!state.flags?.[f.key]}
                  onToggle={() => toggleFlag(f.key)}
                  label={f.label}
                  locked={locked}
                />
              ))}
            </div>
          </Section>

          <Section number="3" title="Voraussetzungen – Kategorien">
            <div className="space-y-5">
              {KATEGORIEN.map((cat) => (
                <div key={cat.title}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      color: '#1B2A4A',
                      marginBottom: '8px',
                    }}
                  >
                    {cat.title}
                  </div>
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
          </Section>

          <Section number="4" title="Ideen zur Potentialfindung">
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
          </Section>

          <section>
            <FieldLabel>Notiz (intern)</FieldLabel>
            <textarea
              rows={3}
              placeholder="z.B. Sondersituationen, Beratungshinweise…"
              value={state.notiz}
              onChange={(e) => update({ notiz: e.target.value })}
              onFocus={inputFocus}
              onBlur={inputBlur}
              disabled={locked}
              style={{ ...INPUT_STYLE, resize: 'vertical' }}
            />
          </section>

          <div className="flex items-center justify-between" style={{ paddingTop: '12px', borderTop: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: '12px', color: '#6E6E73' }}>
              {savedAt ? <>Zuletzt gespeichert: {new Date(savedAt).toLocaleString('de-DE')}</> : <>Noch nicht gespeichert.</>}
              {dirty && <span style={{ marginLeft: '8px', color: '#92400E', fontWeight: 500 }}>· ungespeicherte Änderungen</span>}
            </div>
            <button
              onClick={save}
              disabled={locked || !dirty}
              className="transition-all"
              style={{
                background: '#1D1D1F',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                padding: '10px 20px',
                borderRadius: '980px',
                opacity: (locked || !dirty) ? 0.3 : 1,
                cursor: (locked || !dirty) ? 'not-allowed' : 'pointer',
                transitionDuration: '150ms',
              }}
            >
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ number, title, children }) {
  return (
    <section>
      <h3 className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#6E6E73' }}>{number}</span>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#1D1D1F' }}>{title}</span>
      </h3>
      {children}
    </section>
  );
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

function ThresholdsTable({ familienstand }) {
  const rows = [
    ['Haushaltseinkommen netto / Monat (Angestellt)', '2.500 €', '3.800 €'],
    ['Gewinn n. Steuer p.a. (Ø 3J., Selbstständig)', '50.000 €', '70.000 €'],
    ['Pro Kind im Haushalt / Monat (Abzug)', '300 €', '300 €'],
    ['Eigenkapital (Cash/Ersatzsicherheiten)', '7.500 €', '12.000 €'],
    ['ZVE für Denkmal-/Sanierungsobjekt', '90.000 €', '120.000 €'],
  ];
  const headerStyle = {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: '#6E6E73',
  };
  return (
    <div style={{ background: '#F9FAFB', borderRadius: '10px', overflow: 'hidden' }}>
      <div className="grid grid-cols-3" style={{ ...headerStyle, padding: '10px 14px' }}>
        <div>Prüfwert</div>
        <div style={familienstand === 'ledig' ? { color: '#1D1D1F' } : {}}>ledig</div>
        <div style={familienstand === 'verheiratet' ? { color: '#1D1D1F' } : {}}>verheiratet</div>
      </div>
      {rows.map((row) => (
        <div
          key={row[0]}
          className="grid grid-cols-3"
          style={{ padding: '10px 14px', borderTop: '1px solid #F3F4F6', fontSize: '14px' }}
        >
          <div style={{ color: '#6E6E73' }}>{row[0]}</div>
          <div style={familienstand === 'ledig' ? { fontWeight: 600, color: '#1D1D1F' } : { color: '#9CA3AF' }}>{row[1]}</div>
          <div style={familienstand === 'verheiratet' ? { fontWeight: 600, color: '#1D1D1F' } : { color: '#9CA3AF' }}>{row[2]}</div>
        </div>
      ))}
    </div>
  );
}

function CheckboxRow({ checked, onToggle, label, hint, locked }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={locked}
      className="flex items-start gap-3 text-left transition-colors"
      style={{
        padding: '10px 12px',
        borderRadius: '10px',
        opacity: locked ? 0.6 : 1,
        cursor: locked ? 'not-allowed' : 'pointer',
        transitionDuration: '150ms',
      }}
      onMouseEnter={(e) => { if (!locked) e.currentTarget.style.background = '#F9FAFB'; }}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span
        className="shrink-0 flex items-center justify-center transition-all"
        style={{
          marginTop: '1px',
          width: '18px',
          height: '18px',
          borderRadius: '5px',
          border: checked ? 'none' : '1.5px solid #D1D5DB',
          background: checked ? '#1B2A4A' : 'white',
          color: 'white',
          fontSize: '12px',
          transitionDuration: '150ms',
        }}
      >
        {checked ? '✓' : ''}
      </span>
      <span style={{ fontSize: '14px', color: '#1D1D1F', lineHeight: 1.4 }}>
        {label}
        {hint && <span style={{ display: 'block', fontSize: '12px', color: '#6E6E73', fontWeight: 400, marginTop: '2px' }}>{hint}</span>}
      </span>
    </button>
  );
}
