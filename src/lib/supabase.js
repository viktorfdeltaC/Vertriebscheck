import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const IS_MOCK = !url || !anon;

if (IS_MOCK) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Mock-Modus aktiv – setze VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY in .env für echtes Backend.');
}

export const supabase = createClient(url ?? 'http://placeholder.local', anon ?? 'placeholder', {
  auth: { persistSession: true, autoRefreshToken: true },
});
