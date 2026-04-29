export default function StatusBadge({ status }) {
  const isDone = status === 'vollständig';
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ' +
        (isDone
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-amber-100 text-amber-700')
      }
    >
      <span className={'h-1.5 w-1.5 rounded-full ' + (isDone ? 'bg-emerald-500' : 'bg-amber-500')} />
      {isDone ? 'Vollständig' : 'Offen'}
    </span>
  );
}
