// Deadline parsing/status helpers for leads.
// deadline is stored as ISO date string "YYYY-MM-DD" (no time).

export function parseDeadline(d) {
  if (!d) return null;
  const [y, m, day] = d.split('-').map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

function startOfToday() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

export function deadlineStatus(d) {
  const dt = parseDeadline(d);
  if (!dt) return null;
  const today = startOfToday();
  const diffDays = Math.floor((dt.getTime() - today.getTime()) / 86400000);
  let level;
  if (diffDays < 0) level = 'expired';
  else if (diffDays <= 3) level = 'warning';
  else level = 'normal';
  return { date: dt, level, daysLeft: diffDays };
}

export function formatDeadline(d, opts = {}) {
  const dt = parseDeadline(d);
  if (!dt) return '';
  if (opts.short) {
    return `${String(dt.getDate()).padStart(2, '0')}.${String(dt.getMonth() + 1).padStart(2, '0')}.`;
  }
  return dt.toLocaleDateString('de-DE');
}
