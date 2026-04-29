// Supabase Edge Function: invite-user
//
// Sends an invitation email to a new advisor and creates their profile entry.
//
// Required env (supabase secrets set …):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  – service-role key, NEVER expose to clients
//
// Caller must be authenticated as an admin. The function verifies is_admin via
// the caller's JWT before performing privileged work.

// @ts-nocheck — this file targets the Deno runtime on Supabase Edge.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return json({ error: 'Server misconfigured' }, 500);

  // Verify caller is admin
  const authHeader = req.headers.get('Authorization') ?? '';
  const callerClient = createClient(url, serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) return json({ error: 'Not authenticated' }, 401);
  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('is_admin')
    .eq('id', caller.id)
    .maybeSingle();
  if (!callerProfile?.is_admin) return json({ error: 'Not authorized' }, 403);

  let body: { email?: string; full_name?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const email = (body.email ?? '').trim();
  const full_name = (body.full_name ?? '').trim();
  if (!email || !full_name) return json({ error: 'email and full_name are required' }, 400);

  const admin = createClient(url, serviceKey);

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name, is_admin: false },
  });
  if (inviteErr) return json({ error: inviteErr.message }, 400);

  // Profile row is normally created by the handle_new_user trigger; if not,
  // upsert here as a safety net so the user appears in the team list immediately.
  await admin.from('profiles').upsert({
    id: invited.user.id,
    full_name,
    email,
    is_admin: false,
  });

  return json({ success: true, user_id: invited.user.id });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
