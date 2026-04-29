export default function ProgressBar({ value, total, showLabel = true }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
          <span>{value} von {total} Unterlagen</span>
          <span className="font-semibold text-wert-navy">{pct}%</span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
        <div
          className="h-full bg-wert-blue transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
