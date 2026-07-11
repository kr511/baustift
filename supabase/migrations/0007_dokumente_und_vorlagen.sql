-- Dokument-Import: Ablage pro Baustelle (Menschen), optionaler KI-Kontext
-- (nur PDFs, als native Document-Blocks zur Generierungszeit) und
-- firmenweite Stil-Vorlagen für den KI-Ton.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'baustellen-dokumente',
  'baustellen-dokumente',
  false,
  20971520,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do nothing;

create table public.baustelle_dokumente (
  id uuid primary key default gen_random_uuid(),
  baustelle_id uuid not null references public.baustellen(id) on delete cascade,
  firma_id uuid not null,
  storage_path text not null,
  dateiname text not null,
  mime_type text not null,
  groesse_bytes bigint,
  ki_kontext boolean not null default false,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index baustelle_dokumente_baustelle_idx
  on public.baustelle_dokumente (baustelle_id);
create index baustelle_dokumente_firma_idx
  on public.baustelle_dokumente (firma_id);

create function public.set_dokument_firma_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select firma_id into new.firma_id
  from public.baustellen
  where id = new.baustelle_id;
  return new;
end;
$$;

create trigger baustelle_dokumente_set_firma_id
  before insert or update of baustelle_id on public.baustelle_dokumente
  for each row execute function public.set_dokument_firma_id();

alter table public.baustelle_dokumente enable row level security;

create policy "firma_all_baustelle_dokumente" on public.baustelle_dokumente
  for all to authenticated
  using (firma_id = public.get_user_firma_id())
  with check (firma_id = public.get_user_firma_id());

-- Storage-Pfadkonvention von Anfang an firma-gescoped:
-- {firma_id}/{baustelle_id}/{uuid}-{dateiname}
create policy "firma_all_baustellen_dokumente_storage" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'baustellen-dokumente'
    and (storage.foldername(name))[1] = public.get_user_firma_id()::text
  )
  with check (
    bucket_id = 'baustellen-dokumente'
    and (storage.foldername(name))[1] = public.get_user_firma_id()::text
  );

-- Firmenweite Stil-Vorlagen: Beispieltexte, die dem KI-Prompt als
-- Ton-/Gliederungsreferenz mitgegeben werden (nie als Inhaltsquelle).
create table public.stil_vorlagen (
  id uuid primary key default gen_random_uuid(),
  firma_id uuid not null references public.firmen(id) on delete cascade,
  titel text not null,
  beispiel_text text not null check (char_length(beispiel_text) <= 6000),
  aktiv boolean not null default true,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index stil_vorlagen_firma_idx on public.stil_vorlagen (firma_id);

alter table public.stil_vorlagen enable row level security;

-- Lesen für alle Mitglieder der Firma (wird beim Generieren gebraucht),
-- Schreiben nur für Admins der eigenen Firma.
create policy "stil_vorlagen_select_own_firma" on public.stil_vorlagen
  for select to authenticated
  using (firma_id = public.get_user_firma_id());

create policy "stil_vorlagen_write_admin" on public.stil_vorlagen
  for all to authenticated
  using (firma_id = public.get_user_firma_id() and public.get_user_role() = 'admin')
  with check (firma_id = public.get_user_firma_id() and public.get_user_role() = 'admin');
