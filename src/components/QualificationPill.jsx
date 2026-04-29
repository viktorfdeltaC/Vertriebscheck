import { VERDICT_STYLES } from '../lib/qualification.js';

export default function QualificationPill({ verdict, compact = false }) {
  const v = VERDICT_STYLES[verdict?.level ?? 'empty'];
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
        v.bg + ' ' + v.text
      }
      title={verdict?.reasons?.join(' · ') || v.label}
    >
      <span className={'h-1.5 w-1.5 rounded-full ' + v.dot} />
      {compact ? v.short : v.label}
    </span>
  );
}
