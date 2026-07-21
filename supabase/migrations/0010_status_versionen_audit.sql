-- Release 1.1: nachvollziehbarer Status-Workflow, unveränderliche
-- Finalisierungs-Snapshots und Audit-Verlauf.
--
-- Rollout: Migration unmittelbar vor dem zugehörigen App-Code anwenden. Der
-- bestehende finale Statuswert `final` bleibt aus Abwärtskompatibilität erhalten;
-- neu sind `generiert` und `geprueft`.

alter table public.tagesberichte
  drop constraint if exists tagesberichte_status_check;

alter table public.tagesberichte
  add column if not exists finalisiert_am timestamptz,
  add column if not exists finalisiert_von_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists aktuelle_version integer not null default 0,
  add column if not exists offener_korrekturgrund text;

alter table public.tagesberichte
  add constraint tagesberichte_status_check
    check (status in ('entwurf', 'generiert', 'geprueft', 'final')),
  add constraint tagesberichte_aktuelle_version_check
    check (aktuelle_version >= 0);

create index if not exists tagesberichte_status_idx
  on public.tagesberichte (firma_id, status, datum desc);

create table public.tagesbericht_versionen (
  id uuid primary key default gen_random_uuid(),
  tagesbericht_id uuid not null references public.tagesberichte(id) on delete cascade,
  firma_id uuid not null references public.firmen(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  grund text,
  erstellt_von_user_id uuid references public.profiles(id) on delete set null,
  erstellt_at timestamptz not null default now(),
  unique (tagesbericht_id, version)
);

create index tagesbericht_versionen_bericht_idx
  on public.tagesbericht_versionen (tagesbericht_id, version desc);
create index tagesbericht_versionen_firma_idx
  on public.tagesbericht_versionen (firma_id, erstellt_at desc);

create table public.tagesbericht_audit_log (
  id uuid primary key default gen_random_uuid(),
  tagesbericht_id uuid not null references public.tagesberichte(id) on delete cascade,
  firma_id uuid not null references public.firmen(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  aktion text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tagesbericht_audit_log_bericht_idx
  on public.tagesbericht_audit_log (tagesbericht_id, created_at desc);
create index tagesbericht_audit_log_firma_idx
  on public.tagesbericht_audit_log (firma_id, created_at desc);

alter table public.tagesbericht_versionen enable row level security;
alter table public.tagesbericht_audit_log enable row level security;

create policy "firma_select_tagesbericht_versionen"
  on public.tagesbericht_versionen
  for select to authenticated
  using (firma_id = (select public.get_user_firma_id()));

create policy "firma_select_tagesbericht_audit_log"
  on public.tagesbericht_audit_log
  for select to authenticated
  using (firma_id = (select public.get_user_firma_id()));

-- Die Data API benötigt seit 2026 je nach Projekt explizite Grants. Normale
-- Nutzer dürfen Historie nur lesen; Schreiben erfolgt ausschließlich über die
-- kontrollierten Funktionen weiter unten.
revoke all on table public.tagesbericht_versionen from anon, authenticated;
revoke all on table public.tagesbericht_audit_log from anon, authenticated;
grant select on table public.tagesbericht_versionen to authenticated;
grant select on table public.tagesbericht_audit_log to authenticated;
grant all on table public.tagesbericht_versionen to service_role;
grant all on table public.tagesbericht_audit_log to service_role;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.baue_tagesbericht_snapshot(
  p_tagesbericht_id uuid,
  p_firma_id uuid,
  p_version integer,
  p_finalisiert_am timestamptz,
  p_finalisiert_von_user_id uuid,
  p_grund text
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'schema_version', 1,
    'version', p_version,
    'bericht', jsonb_build_object(
      'id', t.id,
      'datum', t.datum,
      'wetter', t.wetter,
      'stichpunkte', t.stichpunkte,
      'bericht_text', t.bericht_text,
      'status', 'final',
      'created_by', t.created_by,
      'created_by_user_id', t.created_by_user_id,
      'created_at', t.created_at,
      'updated_at', t.updated_at,
      'baustelle', jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'adresse', b.adresse,
        'auftraggeber', b.auftraggeber
      ),
      'firma', jsonb_build_object(
        'id', f.id,
        'name', f.name,
        'wordmark', f.wordmark,
        'land', f.land
      ),
      'personal', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'name', p.name,
            'stunden', p.stunden,
            'taetigkeit', p.taetigkeit
          ) order by p.id
        )
        from public.tagesbericht_personal p
        where p.tagesbericht_id = t.id
      ), '[]'::jsonb),
      'material', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'bezeichnung', m.bezeichnung,
            'menge', m.menge,
            'typ', m.typ
          ) order by m.id
        )
        from public.tagesbericht_material m
        where m.tagesbericht_id = t.id
      ), '[]'::jsonb),
      'fotos', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'storage_path', fo.storage_path,
            'dateiname', fo.dateiname
          ) order by fo.created_at, fo.id
        )
        from public.tagesbericht_fotos fo
        where fo.tagesbericht_id = t.id
      ), '[]'::jsonb)
    ),
    'finalisierung', jsonb_build_object(
      'am', p_finalisiert_am,
      'von_user_id', p_finalisiert_von_user_id,
      'von_name', finalisierer.display_name,
      'grund', p_grund
    )
  )
  from public.tagesberichte t
  join public.baustellen b on b.id = t.baustelle_id
  join public.firmen f on f.id = t.firma_id
  left join public.profiles finalisierer on finalisierer.id = p_finalisiert_von_user_id
  where t.id = p_tagesbericht_id
    and t.firma_id = p_firma_id
$$;

revoke all on function private.baue_tagesbericht_snapshot(uuid, uuid, integer, timestamptz, uuid, text) from public;

-- Bestehende atomare Schreibfunktionen härten: Firma und Benutzer werden nicht
-- aus Client-Parametern vertraut, sondern aus dem eingeloggten Profil ermittelt.
create or replace function public.create_tagesbericht_mit_zeilen(
  p_baustelle_id uuid,
  p_datum date,
  p_wetter text,
  p_stichpunkte text,
  p_created_by text,
  p_created_by_user_id uuid,
  p_personal jsonb,
  p_material jsonb,
  p_fotos jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tagesbericht_id uuid;
  v_user_id uuid := auth.uid();
  v_firma_id uuid;
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'Nicht angemeldet' using errcode = '42501';
  end if;

  select firma_id, display_name
    into v_firma_id, v_display_name
  from public.profiles
  where id = v_user_id;

  if v_firma_id is null then
    raise exception 'Kein gültiges Firmenprofil' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.baustellen
    where id = p_baustelle_id and firma_id = v_firma_id
  ) then
    raise exception 'Baustelle nicht gefunden' using errcode = '42501';
  end if;

  insert into public.tagesberichte (
    baustelle_id, datum, wetter, stichpunkte, created_by, created_by_user_id
  )
  values (
    p_baustelle_id, p_datum, p_wetter, p_stichpunkte, v_display_name, v_user_id
  )
  returning id into v_tagesbericht_id;

  insert into public.tagesbericht_personal (tagesbericht_id, name, stunden, taetigkeit)
  select v_tagesbericht_id, p.name, p.stunden, nullif(p.taetigkeit, '')
  from pg_catalog.jsonb_to_recordset(p_personal) as p(name text, stunden numeric, taetigkeit text);

  insert into public.tagesbericht_material (tagesbericht_id, bezeichnung, menge, typ)
  select v_tagesbericht_id, m.bezeichnung, nullif(m.menge, ''), m.typ
  from pg_catalog.jsonb_to_recordset(p_material) as m(bezeichnung text, menge text, typ text);

  insert into public.tagesbericht_fotos (tagesbericht_id, storage_path, dateiname)
  select v_tagesbericht_id, fo.storage_path, nullif(fo.dateiname, '')
  from pg_catalog.jsonb_to_recordset(p_fotos) as fo(storage_path text, dateiname text);

  insert into public.tagesbericht_audit_log (
    tagesbericht_id, firma_id, user_id, aktion, details
  ) values (
    v_tagesbericht_id, v_firma_id, v_user_id, 'bericht_erstellt', '{}'::jsonb
  );

  return v_tagesbericht_id;
end;
$$;

create or replace function public.update_tagesbericht_mit_zeilen(
  p_tagesbericht_id uuid,
  p_baustelle_id uuid,
  p_datum date,
  p_wetter text,
  p_stichpunkte text,
  p_personal jsonb,
  p_material jsonb,
  p_fotos jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_firma_id uuid;
  v_status text;
begin
  if v_user_id is null then
    return false;
  end if;

  select firma_id into v_firma_id
  from public.profiles
  where id = v_user_id;

  select status into v_status
  from public.tagesberichte
  where id = p_tagesbericht_id
    and firma_id = v_firma_id
  for update;

  if not found or v_status = 'final' then
    return false;
  end if;

  if not exists (
    select 1 from public.baustellen
    where id = p_baustelle_id and firma_id = v_firma_id
  ) then
    return false;
  end if;

  update public.tagesberichte
  set
    baustelle_id = p_baustelle_id,
    datum = p_datum,
    wetter = p_wetter,
    stichpunkte = p_stichpunkte,
    status = 'entwurf'
  where id = p_tagesbericht_id;

  delete from public.tagesbericht_personal where tagesbericht_id = p_tagesbericht_id;
  insert into public.tagesbericht_personal (tagesbericht_id, name, stunden, taetigkeit)
  select p_tagesbericht_id, p.name, p.stunden, nullif(p.taetigkeit, '')
  from pg_catalog.jsonb_to_recordset(p_personal) as p(name text, stunden numeric, taetigkeit text);

  delete from public.tagesbericht_material where tagesbericht_id = p_tagesbericht_id;
  insert into public.tagesbericht_material (tagesbericht_id, bezeichnung, menge, typ)
  select p_tagesbericht_id, m.bezeichnung, nullif(m.menge, ''), m.typ
  from pg_catalog.jsonb_to_recordset(p_material) as m(bezeichnung text, menge text, typ text);

  delete from public.tagesbericht_fotos where tagesbericht_id = p_tagesbericht_id;
  insert into public.tagesbericht_fotos (tagesbericht_id, storage_path, dateiname)
  select p_tagesbericht_id, fo.storage_path, nullif(fo.dateiname, '')
  from pg_catalog.jsonb_to_recordset(p_fotos) as fo(storage_path text, dateiname text);

  insert into public.tagesbericht_audit_log (
    tagesbericht_id, firma_id, user_id, aktion, details
  ) values (
    p_tagesbericht_id,
    v_firma_id,
    v_user_id,
    'bericht_bearbeitet',
    jsonb_build_object('vorheriger_status', v_status, 'neuer_status', 'entwurf')
  );

  return true;
end;
$$;

create function public.speichere_tagesbericht_text(
  p_tagesbericht_id uuid,
  p_bericht_text text
)
returns table (ok boolean, neuer_status text, fehler text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_firma_id uuid;
  v_status text;
  v_neuer_status text;
begin
  if v_user_id is null then
    return query select false, null::text, 'nicht_gefunden'::text;
    return;
  end if;

  select firma_id into v_firma_id from public.profiles where id = v_user_id;

  select status into v_status
  from public.tagesberichte
  where id = p_tagesbericht_id and firma_id = v_firma_id
  for update;

  if not found then
    return query select false, null::text, 'nicht_gefunden'::text;
    return;
  end if;
  if v_status = 'final' then
    return query select false, v_status, 'finalisiert'::text;
    return;
  end if;

  v_neuer_status := case
    when nullif(btrim(coalesce(p_bericht_text, '')), '') is null then 'entwurf'
    else 'generiert'
  end;

  update public.tagesberichte
  set bericht_text = p_bericht_text, status = v_neuer_status
  where id = p_tagesbericht_id;

  insert into public.tagesbericht_audit_log (
    tagesbericht_id, firma_id, user_id, aktion, details
  ) values (
    p_tagesbericht_id,
    v_firma_id,
    v_user_id,
    'bericht_text_bearbeitet',
    jsonb_build_object('vorheriger_status', v_status, 'neuer_status', v_neuer_status)
  );

  return query select true, v_neuer_status, null::text;
end;
$$;

create function public.speichere_ki_bericht_text(
  p_tagesbericht_id uuid,
  p_bericht_text text
)
returns table (ok boolean, neuer_status text, fehler text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_firma_id uuid;
  v_status text;
begin
  if v_user_id is null then
    return query select false, null::text, 'nicht_gefunden'::text;
    return;
  end if;

  select firma_id into v_firma_id from public.profiles where id = v_user_id;

  select status into v_status
  from public.tagesberichte
  where id = p_tagesbericht_id and firma_id = v_firma_id
  for update;

  if not found then
    return query select false, null::text, 'nicht_gefunden'::text;
    return;
  end if;
  if v_status = 'final' then
    return query select false, v_status, 'finalisiert'::text;
    return;
  end if;
  if nullif(btrim(coalesce(p_bericht_text, '')), '') is null then
    return query select false, v_status, 'text_leer'::text;
    return;
  end if;

  update public.tagesberichte
  set bericht_text = p_bericht_text, status = 'generiert'
  where id = p_tagesbericht_id;

  insert into public.tagesbericht_audit_log (
    tagesbericht_id, firma_id, user_id, aktion, details
  ) values (
    p_tagesbericht_id,
    v_firma_id,
    v_user_id,
    'ki_generiert',
    jsonb_build_object('vorheriger_status', v_status, 'neuer_status', 'generiert')
  );

  return query select true, 'generiert'::text, null::text;
end;
$$;

create function public.pruefe_tagesbericht(p_tagesbericht_id uuid)
returns table (ok boolean, neuer_status text, fehler text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_firma_id uuid;
  v_status text;
  v_bericht_text text;
begin
  if v_user_id is null then
    return query select false, null::text, 'nicht_gefunden'::text;
    return;
  end if;

  select firma_id into v_firma_id from public.profiles where id = v_user_id;

  select status, bericht_text into v_status, v_bericht_text
  from public.tagesberichte
  where id = p_tagesbericht_id and firma_id = v_firma_id
  for update;

  if not found then
    return query select false, null::text, 'nicht_gefunden'::text;
    return;
  end if;
  if v_status = 'final' then
    return query select false, v_status, 'finalisiert'::text;
    return;
  end if;
  if v_status <> 'generiert' or nullif(btrim(coalesce(v_bericht_text, '')), '') is null then
    return query select false, v_status, 'nicht_pruefbar'::text;
    return;
  end if;

  update public.tagesberichte set status = 'geprueft'
  where id = p_tagesbericht_id;

  insert into public.tagesbericht_audit_log (
    tagesbericht_id, firma_id, user_id, aktion, details
  ) values (
    p_tagesbericht_id,
    v_firma_id,
    v_user_id,
    'bericht_geprueft',
    jsonb_build_object('vorheriger_status', v_status, 'neuer_status', 'geprueft')
  );

  return query select true, 'geprueft'::text, null::text;
end;
$$;

create function public.finalisiere_tagesbericht(p_tagesbericht_id uuid)
returns table (ok boolean, version integer, fehler text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_firma_id uuid;
  v_status text;
  v_bericht_text text;
  v_aktuelle_version integer;
  v_neue_version integer;
  v_grund text;
  v_finalisiert_am timestamptz := now();
  v_snapshot jsonb;
begin
  if v_user_id is null then
    return query select false, null::integer, 'nicht_gefunden'::text;
    return;
  end if;

  select firma_id into v_firma_id from public.profiles where id = v_user_id;

  select status, bericht_text, aktuelle_version, offener_korrekturgrund
    into v_status, v_bericht_text, v_aktuelle_version, v_grund
  from public.tagesberichte
  where id = p_tagesbericht_id and firma_id = v_firma_id
  for update;

  if not found then
    return query select false, null::integer, 'nicht_gefunden'::text;
    return;
  end if;
  if v_status <> 'geprueft' then
    return query select false, null::integer, 'nicht_geprueft'::text;
    return;
  end if;
  if nullif(btrim(coalesce(v_bericht_text, '')), '') is null then
    return query select false, null::integer, 'text_leer'::text;
    return;
  end if;

  v_neue_version := v_aktuelle_version + 1;

  update public.tagesberichte
  set
    status = 'final',
    finalisiert_am = v_finalisiert_am,
    finalisiert_von_user_id = v_user_id,
    aktuelle_version = v_neue_version,
    offener_korrekturgrund = null
  where id = p_tagesbericht_id;

  v_snapshot := private.baue_tagesbericht_snapshot(
    p_tagesbericht_id,
    v_firma_id,
    v_neue_version,
    v_finalisiert_am,
    v_user_id,
    v_grund
  );

  if v_snapshot is null then
    raise exception 'Snapshot konnte nicht erstellt werden';
  end if;

  insert into public.tagesbericht_versionen (
    tagesbericht_id, firma_id, version, snapshot, grund, erstellt_von_user_id, erstellt_at
  ) values (
    p_tagesbericht_id,
    v_firma_id,
    v_neue_version,
    v_snapshot,
    v_grund,
    v_user_id,
    v_finalisiert_am
  );

  insert into public.tagesbericht_audit_log (
    tagesbericht_id, firma_id, user_id, aktion, details
  ) values (
    p_tagesbericht_id,
    v_firma_id,
    v_user_id,
    'bericht_finalisiert',
    jsonb_build_object('version', v_neue_version, 'grund', v_grund)
  );

  return query select true, v_neue_version, null::text;
end;
$$;

create function public.erstelle_tagesbericht_korrektur(
  p_tagesbericht_id uuid,
  p_grund text
)
returns table (ok boolean, neuer_status text, fehler text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_firma_id uuid;
  v_status text;
  v_grund text := btrim(coalesce(p_grund, ''));
begin
  if v_user_id is null then
    return query select false, null::text, 'nicht_gefunden'::text;
    return;
  end if;

  if char_length(v_grund) < 5 then
    return query select false, null::text, 'grund_zu_kurz'::text;
    return;
  end if;

  select firma_id into v_firma_id from public.profiles where id = v_user_id;

  select status into v_status
  from public.tagesberichte
  where id = p_tagesbericht_id and firma_id = v_firma_id
  for update;

  if not found then
    return query select false, null::text, 'nicht_gefunden'::text;
    return;
  end if;
  if v_status <> 'final' then
    return query select false, v_status, 'nicht_final'::text;
    return;
  end if;

  update public.tagesberichte
  set
    status = 'generiert',
    finalisiert_am = null,
    finalisiert_von_user_id = null,
    offener_korrekturgrund = v_grund
  where id = p_tagesbericht_id;

  insert into public.tagesbericht_audit_log (
    tagesbericht_id, firma_id, user_id, aktion, details
  ) values (
    p_tagesbericht_id,
    v_firma_id,
    v_user_id,
    'korrekturversion_erstellt',
    jsonb_build_object('aus_version', (
      select aktuelle_version from public.tagesberichte where id = p_tagesbericht_id
    ), 'grund', v_grund)
  );

  return query select true, 'generiert'::text, null::text;
end;
$$;

-- KI darf in Entwurf, generiert und geprüft erneut laufen. Nur finalisierte
-- Berichte sind gesperrt; ein geprüfter Bericht fällt durch den neuen KI-Text
-- anschließend wieder auf `generiert` zurück.
create or replace function public.reserviere_ki_generierung(p_tagesbericht_id uuid)
returns table (
  erlaubt boolean,
  grund text,
  verbleibende_sekunden integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_firma_id uuid;
  v_status text;
  v_letzte_generierung timestamptz;
  v_heute date := (timezone('Europe/Berlin', now()))::date;
  v_anzahl integer;
begin
  if auth.uid() is null then
    return query select false, 'nicht_berechtigt'::text, null::integer;
    return;
  end if;

  v_firma_id := public.get_user_firma_id();
  if v_firma_id is null then
    return query select false, 'nicht_berechtigt'::text, null::integer;
    return;
  end if;

  select status, ki_generiert_am
  into v_status, v_letzte_generierung
  from public.tagesberichte
  where id = p_tagesbericht_id
    and firma_id = v_firma_id
  for update;

  if not found then
    return query select false, 'nicht_gefunden'::text, null::integer;
    return;
  end if;

  if v_status = 'final' then
    return query select false, 'final'::text, null::integer;
    return;
  end if;

  if v_letzte_generierung is not null
    and v_letzte_generierung > now() - interval '30 seconds' then
    return query select
      false,
      'cooldown'::text,
      greatest(1, ceil(extract(epoch from (v_letzte_generierung + interval '30 seconds' - now())))::integer);
    return;
  end if;

  insert into public.ki_generierung_limits (firma_id, tag, anzahl)
  values (v_firma_id, v_heute, 1)
  on conflict (firma_id, tag) do update
    set anzahl = public.ki_generierung_limits.anzahl + 1
    where public.ki_generierung_limits.anzahl < 100
  returning anzahl into v_anzahl;

  if not found then
    return query select false, 'tageslimit'::text, null::integer;
    return;
  end if;

  update public.tagesberichte
  set ki_generiert_am = now()
  where id = p_tagesbericht_id;

  return query select true, 'ok'::text, null::integer;
end;
$$;

-- Bestands-Finalisierungen werden als Version 1 konserviert. Die historischen
-- Daten sind rekonstruierbar, auch wenn für alte Berichte kein Finalisierer
-- hinterlegt war.
update public.tagesberichte
set
  finalisiert_am = coalesce(finalisiert_am, updated_at, created_at),
  finalisiert_von_user_id = coalesce(finalisiert_von_user_id, created_by_user_id),
  aktuelle_version = case when aktuelle_version = 0 then 1 else aktuelle_version end
where status = 'final';

insert into public.tagesbericht_versionen (
  tagesbericht_id, firma_id, version, snapshot, grund, erstellt_von_user_id, erstellt_at
)
select
  t.id,
  t.firma_id,
  1,
  private.baue_tagesbericht_snapshot(
    t.id,
    t.firma_id,
    1,
    coalesce(t.finalisiert_am, t.updated_at, t.created_at),
    t.finalisiert_von_user_id,
    'Übernahme eines vor Release 1.1 finalisierten Berichts'
  ),
  'Übernahme eines vor Release 1.1 finalisierten Berichts',
  t.finalisiert_von_user_id,
  coalesce(t.finalisiert_am, t.updated_at, t.created_at)
from public.tagesberichte t
where t.status = 'final'
  and not exists (
    select 1 from public.tagesbericht_versionen v
    where v.tagesbericht_id = t.id and v.version = 1
  );

insert into public.tagesbericht_audit_log (
  tagesbericht_id, firma_id, user_id, aktion, details, created_at
)
select
  t.id,
  t.firma_id,
  t.finalisiert_von_user_id,
  'bestand_finalisiert_importiert',
  jsonb_build_object('version', 1),
  coalesce(t.finalisiert_am, t.updated_at, t.created_at)
from public.tagesberichte t
where t.status = 'final'
  and not exists (
    select 1 from public.tagesbericht_audit_log a
    where a.tagesbericht_id = t.id
      and a.aktion = 'bestand_finalisiert_importiert'
  );

-- Direkte Mutationen der Berichtstabellen werden geschlossen. Lesen bleibt über
-- die bestehenden Grants möglich; alle Schreibwege laufen ab jetzt atomar über
-- die oben definierten, mandantengeprüften Funktionen.
revoke insert, update, delete on table public.tagesberichte from authenticated;
revoke insert, update, delete on table public.tagesbericht_personal from authenticated;
revoke insert, update, delete on table public.tagesbericht_material from authenticated;
revoke insert, update, delete on table public.tagesbericht_fotos from authenticated;

-- Security-Definer-Funktionen sind in Postgres standardmäßig für PUBLIC
-- ausführbar. Deshalb immer zuerst vollständig entziehen und gezielt freigeben.
revoke all on function public.get_user_firma_id() from public;
revoke all on function public.get_user_role() from public;
revoke all on function public.set_tagesbericht_firma_id() from public;
revoke all on function public.set_baustelle_firma_id() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.pruefe_tagesbericht_foto_pfad() from public;
revoke all on function public.create_tagesbericht_mit_zeilen(uuid, date, text, text, text, uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.update_tagesbericht_mit_zeilen(uuid, uuid, date, text, text, jsonb, jsonb, jsonb) from public;
revoke all on function public.reserviere_ki_generierung(uuid) from public;
revoke all on function public.speichere_tagesbericht_text(uuid, text) from public;
revoke all on function public.speichere_ki_bericht_text(uuid, text) from public;
revoke all on function public.pruefe_tagesbericht(uuid) from public;
revoke all on function public.finalisiere_tagesbericht(uuid) from public;
revoke all on function public.erstelle_tagesbericht_korrektur(uuid, text) from public;

grant execute on function public.get_user_firma_id() to authenticated;
grant execute on function public.get_user_role() to authenticated;
grant execute on function public.create_tagesbericht_mit_zeilen(uuid, date, text, text, text, uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.update_tagesbericht_mit_zeilen(uuid, uuid, date, text, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.reserviere_ki_generierung(uuid) to authenticated;
grant execute on function public.speichere_tagesbericht_text(uuid, text) to authenticated;
grant execute on function public.speichere_ki_bericht_text(uuid, text) to authenticated;
grant execute on function public.pruefe_tagesbericht(uuid) to authenticated;
grant execute on function public.finalisiere_tagesbericht(uuid) to authenticated;
grant execute on function public.erstelle_tagesbericht_korrektur(uuid, text) to authenticated;
