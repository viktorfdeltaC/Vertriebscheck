-- Berater-interne Vorqualifizierung pro Lead.
-- Wird nur Beratern (created_by oder Admin) angezeigt; nicht über share_uuid sichtbar.

create table if not exists public.lead_qualifications (
  lead_id uuid primary key references public.leads(id) on delete cascade,
  familienstand text not null default 'ledig' check (familienstand in ('ledig','verheiratet')),
  beschaeftigung text not null default 'angestellt' check (beschaeftigung in ('angestellt','selbststaendig')),
  haushaltseinkommen numeric,
  gewinn_3j numeric,
  zve numeric,
  kinder int not null default 0,
  eigenkapital numeric,
  flags jsonb not null default '{}'::jsonb,
  kategorien jsonb not null default '{}'::jsonb,
  potential jsonb not null default '{}'::jsonb,
  notiz text,
  updated_at timestamptz not null default now()
);

alter table public.lead_qualifications enable row level security;

drop policy if exists lq_select on public.lead_qualifications;
create policy lq_select on public.lead_qualifications
  for select using (
    exists (select 1 from public.leads l where l.id = lead_qualifications.lead_id and (l.created_by = auth.uid() or public.is_admin()))
  );

drop policy if exists lq_upsert on public.lead_qualifications;
create policy lq_upsert on public.lead_qualifications
  for insert with check (
    exists (select 1 from public.leads l where l.id = lead_qualifications.lead_id and (l.created_by = auth.uid() or public.is_admin()))
  );

drop policy if exists lq_update on public.lead_qualifications;
create policy lq_update on public.lead_qualifications
  for update using (
    exists (select 1 from public.leads l where l.id = lead_qualifications.lead_id and (l.created_by = auth.uid() or public.is_admin()))
  );
