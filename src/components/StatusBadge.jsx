export default function StatusBadge({ status }) {
  const isDone = status === 'vollständig';
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '980px',
        padding: '3px 10px',
        fontSize: '11px',
        fontWeight: 600,
        background: isDone ? '#DCFCE7' : '#FEF3C7',
        color: isDone ? '#166534' : '#92400E',
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '999px',
          background: isDone ? '#22C55E' : '#F59E0B',
        }}
      />
      {isDone ? 'Vollständig' : 'Offen'}
    </span>
  );
}
