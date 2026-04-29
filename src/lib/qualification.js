// Geteilte Verdict-Logik für QualificationPanel + Dashboard.

export const THRESHOLDS = {
  ledig: { einkommen: 2500, gewinn: 50000, ek: 7500, zve: 90000 },
  verheiratet: { einkommen: 3800, gewinn: 70000, ek: 12000, zve: 120000 },
};
export const KIND_PER_MONAT = 300;

export const VERDICT_STYLES = {
  pass:  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Voraussetzungen erfüllt',     short: 'Erfüllt',           icon: '✓' },
  warn:  { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   dot: 'bg-amber-500',   label: 'Gesonderte Prüfung',           short: 'Gesonderte Prüfung', icon: '⚠' },
  fail:  { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     dot: 'bg-red-500',     label: 'Voraussetzungen nicht erfüllt', short: 'Nicht erfüllt',     icon: '✗' },
  empty: { bg: 'bg-slate-50',   border: 'border-slate-200',   text: 'text-slate-500',   dot: 'bg-slate-400',   label: 'Noch nicht erfasst',           short: 'Offen',             icon: '–' },
};

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }

export function computeVerdict(state) {
  if (!state) return { level: 'empty', reasons: [], thresholds: THRESHOLDS.ledig };
  const t = THRESHOLDS[state.familienstand] ?? THRESHOLDS.ledig;
  const einkommen = num(state.haushaltseinkommen);
  const gewinn = num(state.gewinn_3j);
  const ek = num(state.eigenkapital);
  const kinderAbzug = num(state.kinder) * KIND_PER_MONAT;

  const hasInput = einkommen || gewinn || ek;
  if (!hasInput) return { level: 'empty', reasons: [], thresholds: t };

  const reasons = [];
  let level = 'pass';

  if (state.beschaeftigung === 'selbststaendig') {
    if (gewinn === 0) { level = 'fail'; reasons.push('Gewinn fehlt'); }
    else if (gewinn < t.gewinn) { level = 'fail'; reasons.push(`Gewinn unter ${t.gewinn.toLocaleString('de-DE')} €`); }
  } else {
    const verfuegbar = einkommen - kinderAbzug;
    if (einkommen === 0) { level = 'fail'; reasons.push('Einkommen fehlt'); }
    else if (verfuegbar < t.einkommen) {
      level = 'fail';
      reasons.push(`Verfügbares Einkommen ${verfuegbar.toLocaleString('de-DE')} € < ${t.einkommen.toLocaleString('de-DE')} €${kinderAbzug ? ` (nach −${kinderAbzug} € Kinder)` : ''}`);
    }
  }
  if (ek === 0) { level = 'fail'; reasons.push('Eigenkapital fehlt'); }
  else if (ek < t.ek) { level = 'fail'; reasons.push(`Eigenkapital unter ${t.ek.toLocaleString('de-DE')} €`); }

  const flagsSet = Object.keys(state.flags || {}).filter((k) => state.flags[k]);
  if (level === 'pass' && flagsSet.length > 0) {
    level = 'warn';
    reasons.push(`Gesonderte Prüfung erforderlich (${flagsSet.length} Flag${flagsSet.length === 1 ? '' : 's'})`);
  }

  return { level, reasons, thresholds: t };
}
