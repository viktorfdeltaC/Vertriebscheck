export default function ProgressBar({ value, total, showLabel = true }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-2" style={{ fontSize: '13px', color: '#6E6E73' }}>
          <span>{value} von {total} Unterlagen</span>
          <span style={{ fontWeight: 600, color: '#1D1D1F' }}>{pct}%</span>
        </div>
      )}
      <div
        className="w-full overflow-hidden"
        style={{ height: '6px', borderRadius: '999px', background: '#F3F4F6' }}
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
  );
}
