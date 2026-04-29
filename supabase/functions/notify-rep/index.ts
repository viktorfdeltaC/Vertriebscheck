// Supabase Edge Function: notify-rep
// Deploy:  supabase functions deploy notify-rep
// Secrets: supabase secrets set RESEND_API_KEY=... EMAIL_FROM="Wertentwickler <noreply@example.com>" APP_URL=https://your-vercel-app.vercel.app
//
// Currently STUBBED: logs the would-be email payload and returns ok.
// Flip RESEND_ENABLED to true once the secrets are set.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_ENABLED = false; // TODO: set to true after Resend is configured

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }
  try {
    const { share_uuid } = await req.json();
    if (!share_uuid) return json({ error: 'share_uuid required' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supa = createClient(supabaseUrl, serviceKey);

    const { data: lead, error: leadErr } = await supa
      .from('leads')
      .select('id, client_name, submitted_at, created_by')
      .eq('share_uuid', share_uuid)
      .maybeSingle();
    if (leadErr || !lead) return json({ error: 'lead not found' }, 404);

    const { data: items } = await supa
      .from('lead_items')
      .select('checked, item_id, checklist_items(label)')
      .eq('lead_id', lead.id);

    const checked = (items ?? []).filter((i: any) => i.checked).map((i: any) => i.checklist_items?.label).filter(Boolean);
    const missing = (items ?? []).filter((i: any) => !i.checked).map((i: any) => i.checklist_items?.label).filter(Boolean);

    const { data: rep } = await supa.auth.admin.getUserById(lead.created_by);
    const repEmail = rep?.user?.email;
    const repName = rep?.user?.user_metadata?.full_name ?? '';

    const appUrl = Deno.env.get('APP_URL') ?? '';
    const subject = `Neue Unterlagen eingereicht – ${lead.client_name}`;
    const submittedAt = lead.submitted_at ? new Date(lead.submitted_at).toLocaleString('de-DE') : '';
    const html = `
      <p>Hallo${repName ? ' ' + repName : ''},</p>
      <p>Ihr Klient <strong>${escapeHtml(lead.client_name)}</strong> hat die Unterlagen eingereicht.</p>
      <p><strong>Eingereicht am:</strong> ${submittedAt}</p>
      ${appUrl ? `<p><a href="${appUrl}/leads/${lead.id}">Lead in Unterlagen-Check öffnen</a></p>` : ''}
      <h3>Bestätigt (${checked.length})</h3>
      <ul>${checked.map((l) => `<li>${escapeHtml(l)}</li>`).join('') || '<li><em>keine</em></li>'}</ul>
      <h3>Fehlt (${missing.length})</h3>
      <ul>${missing.map((l) => `<li>${escapeHtml(l)}</li>`).join('') || '<li><em>keine</em></li>'}</ul>
    `;

    const payload = { from: Deno.env.get('EMAIL_FROM'), to: repEmail, subject, html };

    if (!RESEND_ENABLED) {
      console.log('[notify-rep stub] would send email:', JSON.stringify({ ...payload, html: '[omitted]' }));
      return json({ ok: true, stubbed: true });
    }

    // TODO: Enable once RESEND_API_KEY is set.
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const text = await resp.text();
      console.error('resend error', resp.status, text);
      return json({ error: 'email send failed', status: resp.status }, 500);
    }
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
