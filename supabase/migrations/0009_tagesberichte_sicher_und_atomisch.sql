-- Datenintegrität und Mandantentrennung für Tagesberichte.
-- Rollout-Reihenfolge: diese Migration unmittelbar VOR dem App-Code deployen.
-- In dem kurzen Intervall sind nur neue Foto-Uploads der alten App abgewiesen;
-- alle sonstigen Berichtsvorgänge bleiben funktional. Der neue App-Code nutzt
-- direkt danach die hier erzwungenen firma-präfixierten Fotopfadnamen.

-- Die Anwendung begrenzt Arbeitsstunden auf einen Kalendertag. NOT VALID
-- schützt alle neuen Zeilen ohne möglicherweise historische Daten zu sperren.
alter table public.tagesbericht_personal
  add constraint tagesbericht_personal_stunden_bereich
  check (stunden >= 0 and stunden <= 24) not valid;

-- Alte Fotos hatten keinen Firmenpräfix. Die einmalige Zuordnung hält ihre
-- Lesbarkeit für die richtige Firma aufrecht, ohne neue unpräfixierte Objekte
-- zuzulassen.
create table public.legacy_tagesbericht_foto_pfade (
  storage_path text primary key,
  firma_id uuid not null references public.firmen(id) on delete cascade
);

insert into public.legacy_tagesbericht_foto_pfade (storage_path, firma_id)
select distinct on (f.storage_path) f.storage_path, t.firma_id
from public.tagesbericht_fotos f
join public.tagesberichte t on t.id = f.tagesbericht_id
where f.storage_path like 'entwuerfe/%'
order by f.storage_path, t.firma_id
on conflict (storage_path) do nothing;

alter table public.legacy_tagesbericht_foto_pfade enable row level security;

create policy "firma_select_legacy_tagesbericht_foto_pfade"
  on public.legacy_tagesbericht_foto_pfade
  for select to authenticated
  using (firma_id = public.get_user_firma_id());

revoke all on table public.legacy_tagesbericht_foto_pfade from anon;
grant select on table public.legacy_tagesbericht_foto_pfade to authenticated;

create function public.pruefe_tagesbericht_foto_pfad()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_firma_id uuid;
begin
  select firma_id into v_firma_id
  from public.tagesberichte
  where id = new.tagesbericht_id;

  if v_firma_id is null then
    raise exception 'Tagesbericht für Foto nicht gefunden';
  end if;

  if new.storage_path like v_firma_id::text || '/%' then
    return new;
  end if;

  -- Bereits vorhandene Altobjekte dürfen nur in ihrer ursprünglich ermittelten
  -- Firma weiter referenziert werden; neue Altpfade können nicht entstehen.
  if new.storage_path like 'entwuerfe/%' and exists (
    select 1
    from public.legacy_tagesbericht_foto_pfade p
    where p.storage_path = new.storage_path
      and p.firma_id = v_firma_id
  ) then
    return new;
  end if;

  raise exception 'Foto muss mit der Firmen-ID beginnen';
end;
$$;

create trigger tagesbericht_fotos_pruefe_storage_pfad
  before insert or update of tagesbericht_id, storage_path
  on public.tagesbericht_fotos
  for each row execute function public.pruefe_tagesbericht_foto_pfad();

drop policy "authenticated_all_tagesbericht_fotos_storage" on storage.objects;

create policy "firma_all_tagesbericht_fotos_storage" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'tagesbericht-fotos'
    and (
      (storage.foldername(name))[1] = public.get_user_firma_id()::text
      or exists (
        select 1
        from public.legacy_tagesbericht_foto_pfade p
        where p.storage_path = name
          and p.firma_id = public.get_user_firma_id()
      )
    )
  )
  with check (
    bucket_id = 'tagesbericht-fotos'
    and (storage.foldername(name))[1] = public.get_user_firma_id()::text
  );

-- Alle Zeilen eines Berichts werden innerhalb einer PostgreSQL-Transaktion
-- geschrieben. Ein fehlgeschlagener Insert rollt damit auch Update und Deletes
-- zurück; kein Bericht kann mehr mit halben Listen gespeichert werden.
create function public.create_tagesbericht_mit_zeilen(
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
set search_path = ''
as $$
declare
  v_tagesbericht_id uuid;
begin
  insert into public.tagesberichte (
    baustelle_id, datum, wetter, stichpunkte, created_by, created_by_user_id
  )
  values (
    p_baustelle_id, p_datum, p_wetter, p_stichpunkte, p_created_by, p_created_by_user_id
  )
  returning id into v_tagesbericht_id;

  insert into public.tagesbericht_personal (tagesbericht_id, name, stunden, taetigkeit)
  select v_tagesbericht_id, p.name, p.stunden, nullif(p.taetigkeit, '')
  from pg_catalog.jsonb_to_recordset(p_personal) as p(name text, stunden numeric, taetigkeit text);

  insert into public.tagesbericht_material (tagesbericht_id, bezeichnung, menge, typ)
  select v_tagesbericht_id, m.bezeichnung, nullif(m.menge, ''), m.typ
  from pg_catalog.jsonb_to_recordset(p_material) as m(bezeichnung text, menge text, typ text);

  insert into public.tagesbericht_fotos (tagesbericht_id, storage_path, dateiname)
  select v_tagesbericht_id, f.storage_path, nullif(f.dateiname, '')
  from pg_catalog.jsonb_to_recordset(p_fotos) as f(storage_path text, dateiname text);

  return v_tagesbericht_id;
end;
$$;

create function public.update_tagesbericht_mit_zeilen(
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
set search_path = ''
as $$
begin
  update public.tagesberichte
  set
    baustelle_id = p_baustelle_id,
    datum = p_datum,
    wetter = p_wetter,
    stichpunkte = p_stichpunkte
  where id = p_tagesbericht_id
    and status = 'entwurf';

  if not found then
    return false;
  end if;

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
  select p_tagesbericht_id, f.storage_path, nullif(f.dateiname, '')
  from pg_catalog.jsonb_to_recordset(p_fotos) as f(storage_path text, dateiname text);

  return true;
end;
$$;

revoke all on function public.create_tagesbericht_mit_zeilen(uuid, date, text, text, text, uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.update_tagesbericht_mit_zeilen(uuid, uuid, date, text, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.create_tagesbericht_mit_zeilen(uuid, date, text, text, text, uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.update_tagesbericht_mit_zeilen(uuid, uuid, date, text, text, jsonb, jsonb, jsonb) to authenticated;

-- Die Zählertabelle bildet jede reservierte KI-Anfrage ab (nicht nur den
-- letzten Zeitstempel eines Berichts) und wird ausschließlich über die
-- atomare Funktion unten verändert.
create table public.ki_generierung_limits (
  firma_id uuid not null references public.firmen(id) on delete cascade,
  tag date not null,
  anzahl integer not null default 0 check (anzahl >= 0 and anzahl <= 100),
  primary key (firma_id, tag)
);

alter table public.ki_generierung_limits enable row level security;

create function public.reserviere_ki_generierung(p_tagesbericht_id uuid)
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

  if v_status <> 'entwurf' then
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

revoke all on function public.reserviere_ki_generierung(uuid) from public;
grant execute on function public.reserviere_ki_generierung(uuid) to authenticated;
