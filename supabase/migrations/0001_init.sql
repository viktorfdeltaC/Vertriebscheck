-- Unterlagen-Check schema, RLS, RPCs
-- Apply in Supabase SQL editor or via `supabase db push`.

create extension if not exists "pgcrypto";

-- =====================================================================
-- profiles
-- =====================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- helper: is_admin()
-- =====================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- =====================================================================
-- checklist tables
-- =====================================================================
create table if not exists public.checklist_sections (
  id serial primary key,
  label text not null,
  sort_order int not null default 0
);

create table if not exists public.checklist_items (
  id serial primary key,
  section_id int not null references public.checklist_sections(id) on delete cascade,
  label text not null,
  description text,
  sort_order int not null default 0,
  only_if_existing_property boolean not null default false
);

-- =====================================================================
-- leads
-- =====================================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete restrict,
  client_name text not null,
  client_email text,
  client_phone text,
  share_uuid uuid not null unique default gen_random_uuid(),
  status text not null default 'offen' check (status in ('offen','vollständig')),
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists leads_created_by_idx on public.leads(created_by);
create index if not exists leads_share_uuid_idx on public.leads(share_uuid);

-- =====================================================================
-- lead_items
-- =====================================================================
create table if not exists public.lead_items (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  item_id int not null references public.checklist_items(id) on delete cascade,
  checked boolean not null default false,
  note text,
  file_path text,
  updated_at timestamptz not null default now(),
  unique (lead_id, item_id)
);
create index if not exists lead_items_lead_idx on public.lead_items(lead_id);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_items enable row level security;
alter table public.checklist_sections enable row level security;
alter table public.checklist_items enable row level security;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- leads
drop policy if exists leads_select on public.leads;
create policy leads_select on public.leads
  for select using (created_by = auth.uid() or public.is_admin());

drop policy if exists leads_insert on public.leads;
create policy leads_insert on public.leads
  for insert with check (created_by = auth.uid());

drop policy if exists leads_update on public.leads;
create policy leads_update on public.leads
  for update using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

drop policy if exists leads_delete on public.leads;
create policy leads_delete on public.leads
  for delete using (created_by = auth.uid() or public.is_admin());

-- lead_items
drop policy if exists lead_items_select on public.lead_items;
create policy lead_items_select on public.lead_items
  for select using (
    exists (
      select 1 from public.leads l
      where l.id = lead_items.lead_id
        and (l.created_by = auth.uid() or public.is_admin())
    )
  );

drop policy if exists lead_items_update on public.lead_items;
create policy lead_items_update on public.lead_items
  for update using (
    exists (
      select 1 from public.leads l
      where l.id = lead_items.lead_id
        and (l.created_by = auth.uid() or public.is_admin())
    )
  );

-- checklist (public read)
drop policy if exists sections_read on public.checklist_sections;
create policy sections_read on public.checklist_sections for select using (true);

drop policy if exists items_read on public.checklist_items;
create policy items_read on public.checklist_items for select using (true);

grant select on public.checklist_sections to anon, authenticated;
grant select on public.checklist_items to anon, authenticated;

-- =====================================================================
-- RPCs
-- =====================================================================

-- Atomically create a lead and seed its lead_items.
create or replace function public.create_lead(
  p_client_name text,
  p_client_email text,
  p_client_phone text
) returns public.leads
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_lead public.leads;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.leads (created_by, client_name, client_email, client_phone)
  values (auth.uid(), p_client_name, nullif(p_client_email,''), nullif(p_client_phone,''))
  returning * into new_lead;

  insert into public.lead_items (lead_id, item_id)
  select new_lead.id, ci.id from public.checklist_items ci;

  return new_lead;
end;
$$;

-- Public read for client share page. Returns lead + items as json.
create or replace function public.get_lead_by_share(p_share uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'lead', to_jsonb(l) - 'created_by',
    'sections', (
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'label', s.label,
        'sort_order', s.sort_order,
        'items', (
          select jsonb_agg(jsonb_build_object(
            'id', ci.id,
            'label', ci.label,
            'description', ci.description,
            'sort_order', ci.sort_order,
            'only_if_existing_property', ci.only_if_existing_property,
            'lead_item', (
              select jsonb_build_object(
                'id', li.id,
                'checked', li.checked,
                'note', li.note,
                'file_path', li.file_path,
                'updated_at', li.updated_at
              )
              from public.lead_items li
              where li.lead_id = l.id and li.item_id = ci.id
            )
          ) order by ci.sort_order)
          from public.checklist_items ci where ci.section_id = s.id
        )
      ) order by s.sort_order)
      from public.checklist_sections s
    )
  ) into result
  from public.leads l where l.share_uuid = p_share;

  if result is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;
  return result;
end;
$$;

grant execute on function public.get_lead_by_share(uuid) to anon, authenticated;

-- Block edits on submitted leads.
create or replace function public.update_lead_item_public(
  p_share uuid,
  p_item_id int,
  p_checked boolean,
  p_note text,
  p_file_path text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead_id uuid;
  v_status text;
begin
  select id, status into v_lead_id, v_status
  from public.leads where share_uuid = p_share;
  if v_lead_id is null then raise exception 'lead not found'; end if;
  if v_status = 'vollständig' then raise exception 'already submitted'; end if;

  update public.lead_items
  set checked = coalesce(p_checked, checked),
      note = case when p_note is null then note else nullif(p_note,'') end,
      file_path = case when p_file_path is null then file_path else nullif(p_file_path,'') end,
      updated_at = now()
  where lead_id = v_lead_id and item_id = p_item_id;
end;
$$;

grant execute on function public.update_lead_item_public(uuid, int, boolean, text, text) to anon, authenticated;

-- Mint a signed upload URL for a client uploading a doc, validated by share_uuid.
create or replace function public.request_upload_url(
  p_share uuid,
  p_item_id int,
  p_filename text
) returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_lead_id uuid;
  v_status text;
  v_clean_name text;
  v_path text;
  v_signed jsonb;
begin
  select id, status into v_lead_id, v_status
  from public.leads where share_uuid = p_share;
  if v_lead_id is null then raise exception 'lead not found'; end if;
  if v_status = 'vollständig' then raise exception 'already submitted'; end if;

  v_clean_name := regexp_replace(coalesce(p_filename,'datei'), '[^a-zA-Z0-9._-]', '_', 'g');
  v_path := v_lead_id::text || '/' || p_item_id::text || '/' || extract(epoch from now())::bigint || '_' || v_clean_name;

  -- storage.create_signed_upload_url returns (signed_url, token, path)
  select to_jsonb(t) into v_signed
  from storage.create_signed_upload_url('lead-docs', v_path) t;

  return jsonb_build_object('path', v_path, 'signed', v_signed);
end;
$$;

grant execute on function public.request_upload_url(uuid, int, text) to anon, authenticated;

-- Mint a short signed download URL for a stored file (used by reps in /leads/:id and clients in /check).
create or replace function public.request_download_url(
  p_path text
) returns text
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_url text;
  v_lead_id uuid;
begin
  -- restrict reps: must own the lead whose id is the first path segment, OR be admin, OR caller is anon/authenticated for a path that resolves to a current lead
  v_lead_id := nullif(split_part(p_path, '/', 1), '')::uuid;
  if auth.uid() is not null and not public.is_admin() then
    if not exists (
      select 1 from public.leads where id = v_lead_id and created_by = auth.uid()
    ) then
      raise exception 'forbidden';
    end if;
  end if;

  select signed_url into v_url
  from storage.create_signed_url('lead-docs', p_path, 600);
  return v_url;
end;
$$;

grant execute on function public.request_download_url(text) to anon, authenticated;

-- Delete an uploaded file (client-side undo).
create or replace function public.delete_item_file(
  p_share uuid,
  p_item_id int
) returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_lead_id uuid;
  v_status text;
  v_path text;
begin
  select id, status into v_lead_id, v_status
  from public.leads where share_uuid = p_share;
  if v_lead_id is null then raise exception 'lead not found'; end if;
  if v_status = 'vollständig' then raise exception 'already submitted'; end if;

  select file_path into v_path
  from public.lead_items where lead_id = v_lead_id and item_id = p_item_id;

  if v_path is not null then
    perform storage.delete_object('lead-docs', v_path);
  end if;

  update public.lead_items
  set file_path = null, updated_at = now()
  where lead_id = v_lead_id and item_id = p_item_id;
end;
$$;

grant execute on function public.delete_item_file(uuid, int) to anon, authenticated;

-- Mark lead as submitted.
create or replace function public.submit_lead(p_share uuid)
returns public.leads
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.leads;
begin
  update public.leads
  set status = 'vollständig', submitted_at = now()
  where share_uuid = p_share and status <> 'vollständig'
  returning * into result;
  if result.id is null then
    select * into result from public.leads where share_uuid = p_share;
  end if;
  return result;
end;
$$;

grant execute on function public.submit_lead(uuid) to anon, authenticated;
