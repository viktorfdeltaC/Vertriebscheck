import { VERDICT_STYLES } from '../lib/qualification.js';

const COLORS = {
  pass: { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
  warn: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  fail: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  empty: { bg: '#F3F4F6', text: '#6E6E73', dot: '#9CA3AF' },
};

export default function QualificationPill({ verdict, compact = false }) {
  const v = VERDICT_STYLES[verdict?.level ?? 'empty'];
  const c = COLORS[verdict?.level ?? 'empty'];
  return (
    <span
      title={verdict?.reasons?.join(' · ') || v.label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '980px',
        padding: '3px 10px',
        fontSize: '11px',
        fontWeight: 600,
        background: c.bg,
        color: c.text,
      }}
    >
      <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: c.dot }} />
      {compact ? v.short : v.label}
    </span>
  );
}
