// Local-only state for push notifications. Replaced by Supabase persistence later.
//
// TODO: push_subscriptions (id, rep_id, lead_id nullable, subscription jsonb, active bool)
// TODO: rep_preferences (rep_id, notify_on_upload, notify_on_submit, notify_on_open)
// TODO: VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY in .env
// TODO: Edge Functions: send-push, log-event

const PREFS_KEY = 'unterlagen-check-push-prefs';
const BANNER_KEY = 'unterlagen-check-push-banner-dismissed';
const LEAD_KEY_PREFIX = 'push_'; // full key: push_${userId}_lead_${leadId}

const DEFAULT_PREFS = {
  active: false,
  on_upload: true,
  on_submit: true,
  on_open: false,
};

export function getPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function setPrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

function leadKey(userId, leadId) {
  return `${LEAD_KEY_PREFIX}${userId}_lead_${leadId}`;
}

export function getLeadSubscriptions(userId) {
  const out = {};
  if (!userId) return out;
  const prefix = `${LEAD_KEY_PREFIX}${userId}_lead_`;
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix) && localStorage.getItem(k) === '1') {
      out[k.slice(prefix.length)] = true;
    }
  }
  return out;
}

export function isLeadSubscribed(userId, leadId) {
  if (!userId || !leadId) return false;
  return localStorage.getItem(leadKey(userId, leadId)) === '1';
}

export function setLeadSubscribed(userId, leadId, active) {
  if (!userId || !leadId) return;
  const key = leadKey(userId, leadId);
  if (active) localStorage.setItem(key, '1');
  else localStorage.removeItem(key);
  // TODO: when Supabase is connected, replace localStorage with
  // push_subscriptions table filtered by rep_id — same logic, just persisted
}

export function bannerDismissed() {
  return localStorage.getItem(BANNER_KEY) === '1';
}

export function dismissBanner() {
  localStorage.setItem(BANNER_KEY, '1');
}

export async function requestPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  const result = await Notification.requestPermission();
  // TODO: generate push subscription with VAPID public key
  // TODO: store subscription in Supabase table push_subscriptions
  return result;
}

export function showTestNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    alert('Bitte zuerst Browser-Benachrichtigungen erlauben.');
    return;
  }
  new Notification('Unterlagen-Check', {
    body: 'Frau Klein hat den Personalausweis hochgeladen.',
    icon: '/logo.png',
  });
}
