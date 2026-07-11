-- Mandantenfähigkeit (Schritt 1 von 2): Firmen, Niederlassungen, Profile.
-- Diese Migration ändert NUR das Schema und legt den Seed-Mandanten an.
-- Die bestehenden authenticated_all_*-Policies aus 0002 bleiben unangetastet —
-- der RLS-Cutover auf Firma-Scoping folgt separat in 0006, damit das heute
-- genutzte geteilte Konto zu keinem Zeitpunkt ausgesperrt wird.

create table public.firmen (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Anzeige in Kopfzeile von App und Druck/PDF, z. B. "SWIETELSKY FABER"
  wordmark text not null,
  -- ISO-3166-1 alpha-2; steuert die Persona im KI-Prompt ("österreichische Baufirma …")
  land text not null default 'AT',
  created_at timestamptz not null default now()
);

create table public.niederlassungen (
  id uuid primary key default gen_random_uuid(),
  firma_id uuid not null references public.firmen(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (firma_id, name)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  firma_id uuid not null references public.firmen(id),
  niederlassung_id uuid references public.niederlassungen(id),
  display_name text not null,
  role text not null default 'nutzer' check (role in ('admin', 'nutzer')),
  created_at timestamptz not null default now()
);

create index profiles_firma_idx on public.profiles (firma_id);

-- Tenant-Spalten auf den Bestandstabellen. tagesberichte.firma_id ist bewusst
-- denormalisiert (per Trigger aus der Baustelle kopiert), damit die späteren
-- RLS-Policies auf tagesberichte und seinen Kind-Tabellen ohne Join auskommen.
alter table public.baustellen
  add column firma_id uuid references public.firmen(id),
  add column niederlassung_id uuid references public.niederlassungen(id);

alter table public.tagesberichte
  add column firma_id uuid references public.firmen(id);

create index baustellen_firma_idx on public.baustellen (firma_id);
create index tagesberichte_firma_idx on public.tagesberichte (firma_id);

create function public.set_tagesbericht_firma_id()
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

create trigger tagesberichte_set_firma_id
  before insert or update of baustelle_id on public.tagesberichte
  for each row execute function public.set_tagesbericht_firma_id();

-- baustellen.firma_id kommt standardmäßig aus dem Profil des Einloggten.
-- Dadurch muss der App-Code die Spalte beim Insert nie mitschicken — er
-- funktioniert unverändert vor UND nach dieser Migration (Deploy-Reihenfolge
-- damit unkritisch). Beim Insert per SQL-Konsole (auth.uid() ist null) muss
-- firma_id explizit angegeben werden.
create function public.set_baustelle_firma_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.firma_id is null then
    select firma_id, niederlassung_id
      into new.firma_id, new.niederlassung_id
    from public.profiles
    where id = auth.uid();
  end if;
  return new;
end;
$$;

create trigger baustellen_set_firma_id
  before insert on public.baustellen
  for each row execute function public.set_baustelle_firma_id();

-- Seed-Mandant mit festen UUIDs, damit spätere Migrationen/Skripte
-- deterministisch darauf verweisen können.
insert into public.firmen (id, name, wordmark, land)
values (
  'c0a1f5e0-0000-4000-8000-000000000001',
  'Swietelsky Faber',
  'SWIETELSKY FABER',
  'AT'
)
on conflict (id) do nothing;

insert into public.niederlassungen (id, firma_id, name)
values (
  'c0a1f5e0-0000-4000-8000-000000000002',
  'c0a1f5e0-0000-4000-8000-000000000001',
  'Leipzig'
)
on conflict (id) do nothing;

-- Backfill: alle Bestandsdaten gehören dem Seed-Mandanten.
update public.baustellen
set
  firma_id = 'c0a1f5e0-0000-4000-8000-000000000001',
  niederlassung_id = 'c0a1f5e0-0000-4000-8000-000000000002'
where firma_id is null;

update public.tagesberichte
set firma_id = 'c0a1f5e0-0000-4000-8000-000000000001'
where firma_id is null;

alter table public.baustellen alter column firma_id set not null;
alter table public.tagesberichte alter column firma_id set not null;

-- security definer, damit Policies (auch auf profiles selbst) die Firma des
-- eingeloggten Nutzers nachschlagen können, ohne rekursiv in die
-- profiles-RLS zu laufen — das kanonische Supabase-Muster.
create function public.get_user_firma_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select firma_id from public.profiles where id = auth.uid()
$$;

create function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid()
$$;

revoke execute on function public.get_user_firma_id() from anon;
revoke execute on function public.get_user_role() from anon;
grant execute on function public.get_user_firma_id() to authenticated;
grant execute on function public.get_user_role() to authenticated;

alter table public.firmen enable row level security;
alter table public.niederlassungen enable row level security;
alter table public.profiles enable row level security;

create policy "firmen_select_own" on public.firmen
  for select to authenticated
  using (id = public.get_user_firma_id());

create policy "niederlassungen_select_own" on public.niederlassungen
  for select to authenticated
  using (firma_id = public.get_user_firma_id());

-- Eigenes Profil + Profile der eigenen Firma lesen (z. B. Nutzerverwaltung).
create policy "profiles_select_own_firma" on public.profiles
  for select to authenticated
  using (id = auth.uid() or firma_id = public.get_user_firma_id());

-- Eigenes Profil ändern; die Beschränkung auf display_name erzwingt die
-- Server Action (Spalten-Whitelisting), die Policy sichert nur die Zeile.
create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Auto-Profil bei jedem neuen Auth-User (Dashboard-Invite oder In-App-Invite;
-- display_name/role kommen aus den Invite-Metadaten).
-- ACHTUNG: firma_id ist hier fest der Seed-Mandant. Vor dem Onboarding einer
-- zweiten Firma MUSS diese Funktion die Firma aus den Invite-Metadaten lesen.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, firma_id, display_name, role)
  values (
    new.id,
    'c0a1f5e0-0000-4000-8000-000000000001',
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    ),
    case
      when new.raw_user_meta_data ->> 'role' = 'admin' then 'admin'
      else 'nutzer'
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill für bereits existierende Auth-User (das heutige geteilte Konto):
-- bekommt ein Admin-Profil im Seed-Mandanten, damit es nach dem RLS-Cutover
-- in 0006 weiter alle Daten sieht.
insert into public.profiles (id, firma_id, display_name, role)
select
  u.id,
  'c0a1f5e0-0000-4000-8000-000000000001',
  coalesce(
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    split_part(u.email, '@', 1)
  ),
  'admin'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
