-- Bautagesbericht-Generator: initial schema
-- v1 has no login/auth. RLS is enabled on every table with permissive
-- "anon" policies so the app works without auth today, and swapping to
-- auth.uid()-scoped policies later is a policy change, not a schema rewrite.

create extension if not exists "pgcrypto";
create extension if not exists moddatetime schema extensions;

create table public.baustellen (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  adresse text,
  auftraggeber text,
  status text not null default 'aktiv'
    check (status in ('aktiv', 'pausiert', 'abgeschlossen')),
  notiz text,
  created_by text,
  created_at timestamptz not null default now()
);

create table public.tagesberichte (
  id uuid primary key default gen_random_uuid(),
  baustelle_id uuid not null references public.baustellen(id) on delete restrict,
  datum date not null,
  wetter text not null,
  stichpunkte text not null,
  bericht_text text,
  status text not null default 'entwurf'
    check (status in ('entwurf', 'final')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tagesberichte_baustelle_datum_idx
  on public.tagesberichte (baustelle_id, datum desc);
create index tagesberichte_datum_idx
  on public.tagesberichte (datum desc);

create trigger tagesberichte_set_updated_at
  before update on public.tagesberichte
  for each row execute function extensions.moddatetime(updated_at);

create table public.tagesbericht_personal (
  id uuid primary key default gen_random_uuid(),
  tagesbericht_id uuid not null references public.tagesberichte(id) on delete cascade,
  name text not null,
  stunden numeric(5, 2) not null,
  taetigkeit text
);

create index tagesbericht_personal_bericht_idx
  on public.tagesbericht_personal (tagesbericht_id);

create table public.tagesbericht_material (
  id uuid primary key default gen_random_uuid(),
  tagesbericht_id uuid not null references public.tagesberichte(id) on delete cascade,
  bezeichnung text not null,
  menge text,
  typ text not null default 'material' check (typ in ('material', 'geraet'))
);

create index tagesbericht_material_bericht_idx
  on public.tagesbericht_material (tagesbericht_id);

create table public.tagesbericht_fotos (
  id uuid primary key default gen_random_uuid(),
  tagesbericht_id uuid not null references public.tagesberichte(id) on delete cascade,
  storage_path text not null,
  dateiname text,
  created_at timestamptz not null default now()
);

create index tagesbericht_fotos_bericht_idx
  on public.tagesbericht_fotos (tagesbericht_id);

-- Storage bucket for report photos. Private: served via short-lived signed
-- URLs generated server-side, never a public bucket, even without auth.
insert into storage.buckets (id, name, public)
values ('tagesbericht-fotos', 'tagesbericht-fotos', false)
on conflict (id) do nothing;

alter table public.baustellen enable row level security;
alter table public.tagesberichte enable row level security;
alter table public.tagesbericht_personal enable row level security;
alter table public.tagesbericht_material enable row level security;
alter table public.tagesbericht_fotos enable row level security;

-- TEMPORARY v1 policies (no auth yet): allow all access via the anon key.
-- Replace with auth.uid()-scoped policies once Supabase Auth is added.
create policy "anon_all_baustellen" on public.baustellen
  for all using (true) with check (true);
create policy "anon_all_tagesberichte" on public.tagesberichte
  for all using (true) with check (true);
create policy "anon_all_tagesbericht_personal" on public.tagesbericht_personal
  for all using (true) with check (true);
create policy "anon_all_tagesbericht_material" on public.tagesbericht_material
  for all using (true) with check (true);
create policy "anon_all_tagesbericht_fotos" on public.tagesbericht_fotos
  for all using (true) with check (true);

-- TEMPORARY v1 storage policies (no auth yet): allow anon read/write within
-- the tagesbericht-fotos bucket. Photos are still only reachable via
-- signed URLs generated server-side, never a public URL.
create policy "anon_all_tagesbericht_fotos_storage" on storage.objects
  for all using (bucket_id = 'tagesbericht-fotos')
  with check (bucket_id = 'tagesbericht-fotos');
