-- Härtet Auth, Datenintegrität und KI-Limits. Alle Berichtsmutationen laufen
-- danach über eng freigegebene, transaktionale RPCs; direkte Tabellenwrites
-- bleiben für den Browser gesperrt.

alter table public.tagesberichte
  add column if not exists finalized_at timestamptz,
  add column if not exists finalized_by uuid,
  add column if not exists baustelle_name_snapshot text;

-- Frühere App-Versionen konnten leere Berichte finalisieren. Solche Zeilen
-- werden wieder zu bearbeitbaren Entwürfen, bevor die Unveränderlichkeit greift.
update public.tagesberichte
set status = 'entwurf', finalized_at = null, finalized_by = null
where status = 'final'
  and nullif(btrim(coalesce(bericht_text, '')), '') is null;

update public.tagesberichte as bericht
set baustelle_name_snapshot = baustelle.name
from public.baustellen as baustelle
where bericht.baustelle_id = baustelle.id
  and bericht.status = 'final'
  and bericht.baustelle_name_snapshot is null;

alter table public.tagesbericht_fotos
  add column if not exists storage_bucket text not null default 'tagesbericht-fotos',
  add constraint tagesbericht_fotos_storage_bucket_fest
    check (storage_bucket = 'tagesbericht-fotos') not valid,
  add constraint tagesbericht_fotos_storage_objekt_fkey
    foreign key (storage_bucket, storage_path)
    references storage.objects (bucket_id, name)
    on delete restrict
    not valid;

alter table public.tagesbericht_personal
  add constraint tagesbericht_personal_stunden_plausibel
  check (stunden >= 0 and stunden <= 24) not valid;

alter table public.baustellen
  add constraint baustellen_name_plausibel
    check (length(btrim(name)) between 1 and 300) not valid,
  add constraint baustellen_adresse_plausibel
    check (adresse is null or length(adresse) <= 500) not valid,
  add constraint baustellen_auftraggeber_plausibel
    check (auftraggeber is null or length(auftraggeber) <= 300) not valid,
  add constraint baustellen_notiz_plausibel
    check (notiz is null or length(notiz) <= 5000) not valid,
  add constraint baustellen_created_by_plausibel
    check (created_by is null or length(created_by) <= 200) not valid;

do $$
begin
  if exists (
    select 1
    from public.tagesbericht_fotos
    group by storage_path
    having count(*) > 1
  ) then
    raise exception 'Migration abgebrochen: Ein Foto-Pfad ist mehreren Tagesberichten zugeordnet. Duplikate vor dem erneuten Ausführen manuell bereinigen.'
      using errcode = '23505';
  end if;
end;
$$;

create unique index if not exists tagesbericht_fotos_storage_path_eindeutig_idx
  on public.tagesbericht_fotos (storage_path);

update storage.buckets
set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif'
  ]
where id = 'tagesbericht-fotos';

create table if not exists public.ki_aufrufe (
  id uuid primary key default gen_random_uuid(),
  typ text not null check (typ in ('bericht', 'import')),
  tagesbericht_id uuid references public.tagesberichte (id) on delete cascade,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (typ = 'bericht' and tagesbericht_id is not null)
    or (typ = 'import' and tagesbericht_id is null)
  )
);

create index if not exists ki_aufrufe_typ_zeit_idx
  on public.ki_aufrufe (typ, created_at desc);
create index if not exists ki_aufrufe_bericht_zeit_idx
  on public.ki_aufrufe (tagesbericht_id, created_at desc)
  where tagesbericht_id is not null;

alter table public.ki_aufrufe enable row level security;

-- Die früheren "authenticated_all"-Policies machten jedes Auth-Token zum
-- Vollzugriffs-Token. Lesen bleibt firmenweit, Schreiben wird auf die wirklich
-- benötigten Wege reduziert. Anonyme Supabase-Auth-Nutzer sind ausgeschlossen.
drop policy if exists "authenticated_all_baustellen" on public.baustellen;
drop policy if exists "authenticated_all_tagesberichte" on public.tagesberichte;
drop policy if exists "authenticated_all_tagesbericht_personal" on public.tagesbericht_personal;
drop policy if exists "authenticated_all_tagesbericht_material" on public.tagesbericht_material;
drop policy if exists "authenticated_all_tagesbericht_fotos" on public.tagesbericht_fotos;
drop policy if exists "authenticated_all_tagesbericht_fotos_storage" on storage.objects;
drop policy if exists "authenticated_select_ki_importe" on public.ki_importe;
drop policy if exists "authenticated_insert_ki_importe" on public.ki_importe;

create policy "firmenkonto_select_baustellen" on public.baustellen
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy "firmenkonto_insert_baustellen" on public.baustellen
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy "firmenkonto_update_baustellen" on public.baustellen
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  )
  with check (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

create policy "firmenkonto_select_tagesberichte" on public.tagesberichte
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy "firmenkonto_select_tagesbericht_personal" on public.tagesbericht_personal
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy "firmenkonto_select_tagesbericht_material" on public.tagesbericht_material
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy "firmenkonto_select_tagesbericht_fotos" on public.tagesbericht_fotos
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

create policy "firmenkonto_select_foto_storage" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tagesbericht-fotos'
    and (
      owner_id = (select auth.uid())::text
      or exists (
        select 1 from public.tagesbericht_fotos as foto
        where foto.storage_path = name
      )
    )
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy "firmenkonto_insert_foto_storage" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'tagesbericht-fotos'
    and (storage.foldername(name))[1] = 'entwuerfe'
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );
create policy "firmenkonto_delete_foto_storage" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'tagesbericht-fotos'
    and (storage.foldername(name))[1] = 'entwuerfe'
    and (owner_id = (select auth.uid())::text or owner_id is null)
    and not exists (
      select 1
      from public.tagesbericht_fotos as foto
      where foto.storage_path = name
    )
    and coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') <> 'true'
  );

-- Explizite Data-API-Rechte für neue Supabase-Projekte. Berichtstabellen sind
-- read-only; die SECURITY-DEFINER-RPCs unten besitzen die Schreibrechte.
revoke all on table public.baustellen from anon, authenticated;
grant select, insert, update on table public.baustellen to authenticated;

revoke all on table public.tagesberichte from anon, authenticated;
revoke all on table public.tagesbericht_personal from anon, authenticated;
revoke all on table public.tagesbericht_material from anon, authenticated;
revoke all on table public.tagesbericht_fotos from anon, authenticated;
grant select on table public.tagesberichte to authenticated;
grant select on table public.tagesbericht_personal to authenticated;
grant select on table public.tagesbericht_material to authenticated;
grant select on table public.tagesbericht_fotos to authenticated;

revoke all on table public.ki_importe from anon, authenticated;
revoke all on table public.ki_aufrufe from anon, authenticated;

create or replace function public.sperre_finale_tagesberichte()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.status = 'final' then
    raise exception 'Finalisierte Tagesberichte können nicht mehr verändert oder gelöscht werden.'
      using errcode = '55000';
  end if;

  if tg_op = 'UPDATE'
    and new.status = 'final'
    and nullif(btrim(coalesce(new.bericht_text, '')), '') is null
  then
    raise exception 'Ein Tagesbericht benötigt vor dem Finalisieren einen Berichtstext.'
      using errcode = '23514';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists tagesberichte_final_sperre on public.tagesberichte;
create trigger tagesberichte_final_sperre
  before update or delete on public.tagesberichte
  for each row execute function public.sperre_finale_tagesberichte();

create or replace function public.speichere_tagesbericht(
  p_id uuid,
  p_erwartete_updated_at timestamptz,
  p_baustelle_id uuid,
  p_datum date,
  p_wetter text,
  p_stichpunkte text,
  p_created_by text,
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
  v_id uuid;
  v_status text;
  v_updated_at timestamptz;
  v_personal jsonb := coalesce(p_personal, '[]'::jsonb);
  v_material jsonb := coalesce(p_material, '[]'::jsonb);
  v_fotos jsonb := coalesce(p_fotos, '[]'::jsonb);
begin
  if auth.uid() is null
    or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
  then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;

  if p_baustelle_id is null
    or p_datum is null
    or nullif(btrim(coalesce(p_wetter, '')), '') is null
    or nullif(btrim(coalesce(p_stichpunkte, '')), '') is null
    or length(p_wetter) > 500
    or length(p_stichpunkte) > 20000
    or length(coalesce(p_created_by, '')) > 200
  then
    raise exception 'Ungültige Tagesbericht-Eckdaten.' using errcode = '22023';
  end if;

  if (p_id is null and p_erwartete_updated_at is not null)
    or (p_id is not null and p_erwartete_updated_at is null)
  then
    raise exception 'Ungültige Versionsangabe.' using errcode = '22023';
  end if;

  if jsonb_typeof(v_personal) <> 'array'
    or jsonb_typeof(v_material) <> 'array'
    or jsonb_typeof(v_fotos) <> 'array'
    or jsonb_array_length(v_personal) > 100
    or jsonb_array_length(v_material) > 100
    or jsonb_array_length(v_fotos) > 30
  then
    raise exception 'Ungültige oder zu lange Detail-Liste.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_personal)
      as x(name text, stunden numeric, taetigkeit text)
    where nullif(btrim(coalesce(x.name, '')), '') is null
      or x.stunden is null
      or x.stunden < 0
      or x.stunden > 24
      or length(x.name) > 200
      or length(coalesce(x.taetigkeit, '')) > 500
  ) then
    raise exception 'Ungültige Personalzeile.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_material)
      as x(bezeichnung text, menge text, typ text)
    where nullif(btrim(coalesce(x.bezeichnung, '')), '') is null
      or x.typ not in ('material', 'geraet')
      or length(x.bezeichnung) > 300
      or length(coalesce(x.menge, '')) > 300
  ) then
    raise exception 'Ungültige Material- oder Gerätezeile.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_fotos)
      as x(storage_path text, dateiname text)
    where x.storage_path !~ '^entwuerfe/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[A-Za-z0-9._-]+$'
      or x.storage_path like '%..%'
      or length(x.storage_path) > 1000
      or length(coalesce(x.dateiname, '')) > 500
  ) then
    raise exception 'Ungültiger Foto-Pfad.' using errcode = '22023';
  end if;

  if (
    select count(*)
    from jsonb_to_recordset(v_fotos) as x(storage_path text)
  ) <> (
    select count(distinct x.storage_path)
    from jsonb_to_recordset(v_fotos) as x(storage_path text)
  ) then
    raise exception 'Ein Foto darf nur einmal zugeordnet werden.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_fotos) as x(storage_path text)
    join public.tagesbericht_fotos as foto on foto.storage_path = x.storage_path
    where p_id is null or foto.tagesbericht_id <> p_id
  ) then
    raise exception 'Ein Foto ist bereits einem anderen Tagesbericht zugeordnet.'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(v_fotos) as x(storage_path text)
    where not exists (
      select 1
      from storage.objects as objekt
      where objekt.bucket_id = 'tagesbericht-fotos'
        and objekt.name = x.storage_path
        and (
          objekt.owner_id = auth.uid()::text
          or exists (
            select 1
            from public.tagesbericht_fotos as bestehendes_foto
            where bestehendes_foto.tagesbericht_id = p_id
              and bestehendes_foto.storage_path = x.storage_path
          )
        )
    )
  ) then
    raise exception 'Ein Foto wurde nicht gefunden oder gehört nicht zur Sitzung.'
      using errcode = 'P0004';
  end if;

  perform 1 from public.baustellen where id = p_baustelle_id;
  if not found then
    raise exception 'Baustelle wurde nicht gefunden.' using errcode = '23503';
  end if;

  if p_id is null then
    insert into public.tagesberichte (
      baustelle_id,
      datum,
      wetter,
      stichpunkte,
      created_by
    ) values (
      p_baustelle_id,
      p_datum,
      btrim(p_wetter),
      btrim(p_stichpunkte),
      nullif(btrim(coalesce(p_created_by, '')), '')
    )
    returning id into v_id;
  else
    select status, updated_at into v_status, v_updated_at
    from public.tagesberichte
    where id = p_id
    for update;

    if not found then
      raise exception 'Tagesbericht wurde nicht gefunden.' using errcode = 'P0002';
    end if;
    if v_status = 'final' then
      raise exception 'Finalisierte Tagesberichte können nicht bearbeitet werden.'
        using errcode = '55000';
    end if;
    if v_updated_at <> p_erwartete_updated_at then
      raise exception 'Der Tagesbericht wurde zwischenzeitlich geändert.'
        using errcode = '40001';
    end if;

    update public.tagesberichte
    set
      baustelle_id = p_baustelle_id,
      datum = p_datum,
      wetter = btrim(p_wetter),
      stichpunkte = btrim(p_stichpunkte),
      created_by = nullif(btrim(coalesce(p_created_by, '')), ''),
      bericht_text = null,
      ki_generiert_am = null,
      baustelle_name_snapshot = null
    where id = p_id;
    v_id := p_id;

    delete from public.tagesbericht_personal where tagesbericht_id = v_id;
    delete from public.tagesbericht_material where tagesbericht_id = v_id;
    delete from public.tagesbericht_fotos where tagesbericht_id = v_id;
  end if;

  insert into public.tagesbericht_personal (
    tagesbericht_id,
    name,
    stunden,
    taetigkeit
  )
  select
    v_id,
    btrim(x.name),
    x.stunden,
    nullif(btrim(coalesce(x.taetigkeit, '')), '')
  from jsonb_to_recordset(v_personal)
    as x(name text, stunden numeric, taetigkeit text);

  insert into public.tagesbericht_material (
    tagesbericht_id,
    bezeichnung,
    menge,
    typ
  )
  select
    v_id,
    btrim(x.bezeichnung),
    nullif(btrim(coalesce(x.menge, '')), ''),
    x.typ
  from jsonb_to_recordset(v_material)
    as x(bezeichnung text, menge text, typ text);

  insert into public.tagesbericht_fotos (
    tagesbericht_id,
    storage_path,
    dateiname
  )
  select
    v_id,
    x.storage_path,
    nullif(btrim(coalesce(x.dateiname, '')), '')
  from jsonb_to_recordset(v_fotos)
    as x(storage_path text, dateiname text);

  return v_id;
end;
$$;

create or replace function public.speichere_bericht_text(
  p_id uuid,
  p_bericht_text text,
  p_erwartete_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_updated_at timestamptz;
begin
  if auth.uid() is null
    or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
  then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_bericht_text, '')), '') is null
    or length(p_bericht_text) > 50000
  then
    raise exception 'Der Berichtstext ist leer oder zu lang.' using errcode = '22023';
  end if;

  select status, updated_at into v_status, v_updated_at
  from public.tagesberichte
  where id = p_id
  for update;

  if not found then
    raise exception 'Tagesbericht wurde nicht gefunden.' using errcode = 'P0002';
  end if;
  if v_status = 'final' then
    raise exception 'Finalisierte Tagesberichte können nicht verändert werden.'
      using errcode = '55000';
  end if;
  if p_erwartete_updated_at is null or v_updated_at <> p_erwartete_updated_at then
    raise exception 'Der Tagesbericht wurde zwischenzeitlich geändert.'
      using errcode = '40001';
  end if;

  update public.tagesberichte
  set
    bericht_text = btrim(p_bericht_text)
  where id = p_id
  returning updated_at into v_updated_at;

  return v_updated_at;
end;
$$;

create or replace function public.finalisiere_tagesbericht(
  p_id uuid,
  p_erwartete_updated_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_bericht_text text;
  v_updated_at timestamptz;
  v_baustelle_name text;
begin
  if auth.uid() is null
    or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
  then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;

  select bericht.status, bericht.bericht_text, bericht.updated_at, baustelle.name
  into v_status, v_bericht_text, v_updated_at, v_baustelle_name
  from public.tagesberichte as bericht
  join public.baustellen as baustelle on baustelle.id = bericht.baustelle_id
  where bericht.id = p_id
  for update;

  if not found then
    raise exception 'Tagesbericht wurde nicht gefunden.' using errcode = 'P0002';
  end if;
  if v_status = 'final' then
    raise exception 'Der Tagesbericht ist bereits final.' using errcode = '55000';
  end if;
  if p_erwartete_updated_at is null or v_updated_at <> p_erwartete_updated_at then
    raise exception 'Der Tagesbericht wurde zwischenzeitlich geändert.'
      using errcode = '40001';
  end if;
  if nullif(btrim(coalesce(v_bericht_text, '')), '') is null then
    raise exception 'Vor dem Finalisieren muss ein Berichtstext gespeichert sein.'
      using errcode = '23514';
  end if;

  update public.tagesberichte
  set
    status = 'final',
    finalized_at = now(),
    finalized_by = auth.uid(),
    baustelle_name_snapshot = v_baustelle_name
  where id = p_id
  returning updated_at into v_updated_at;

  return v_updated_at;
end;
$$;

create or replace function public.reserviere_ki_aufruf(
  p_typ text,
  p_tagesbericht_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_heute date := (clock_timestamp() at time zone 'Europe/Vienna')::date;
  v_anzahl integer;
  v_letzter_aufruf timestamptz;
  v_seit_letztem integer;
  v_status text;
  v_tageslimit integer;
  v_cooldown_sekunden integer;
begin
  if auth.uid() is null
    or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true'
  then
    raise exception 'Nicht autorisiert.' using errcode = '42501';
  end if;

  if p_typ not in ('bericht', 'import')
    or (p_typ = 'bericht' and p_tagesbericht_id is null)
    or (p_typ = 'import' and p_tagesbericht_id is not null)
  then
    raise exception 'Ungültige Rate-Limit-Parameter.' using errcode = '22023';
  end if;

  -- Serialisiert nur den sehr kurzen Prüf-/Insert-Abschnitt und verhindert,
  -- dass parallele Requests gemeinsam durch Count/Cooldown schlüpfen.
  perform pg_advisory_xact_lock(hashtext('tagesbericht-ki-rate-limit'));

  v_tageslimit := case when p_typ = 'bericht' then 100 else 30 end;
  v_cooldown_sekunden := case when p_typ = 'bericht' then 30 else 0 end;

  if p_typ = 'bericht' then
    select status into v_status
    from public.tagesberichte
    where id = p_tagesbericht_id;

    if not found then
      return jsonb_build_object('allowed', false, 'reason', 'not_found');
    end if;
    if v_status = 'final' then
      return jsonb_build_object('allowed', false, 'reason', 'final');
    end if;

    select max(created_at) into v_letzter_aufruf
    from public.ki_aufrufe
    where typ = 'bericht' and tagesbericht_id = p_tagesbericht_id;

    if v_letzter_aufruf is not null then
      v_seit_letztem := floor(
        extract(epoch from (clock_timestamp() - v_letzter_aufruf))
      )::integer;
      if v_seit_letztem < v_cooldown_sekunden then
        return jsonb_build_object(
          'allowed', false,
          'reason', 'cooldown',
          'retry_after', v_cooldown_sekunden - v_seit_letztem
        );
      end if;
    end if;
  end if;

  select count(*)::integer into v_anzahl
  from public.ki_aufrufe
  where typ = p_typ
    and (created_at at time zone 'Europe/Vienna')::date = v_heute;

  if v_anzahl >= v_tageslimit then
    return jsonb_build_object('allowed', false, 'reason', 'daily_limit');
  end if;

  insert into public.ki_aufrufe (typ, tagesbericht_id, created_by)
  values (p_typ, p_tagesbericht_id, auth.uid());

  return jsonb_build_object('allowed', true, 'reason', 'reserved');
end;
$$;

revoke all on function public.sperre_finale_tagesberichte() from public, anon, authenticated;
revoke all on function public.speichere_tagesbericht(uuid, timestamptz, uuid, date, text, text, text, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.speichere_bericht_text(uuid, text, timestamptz) from public, anon;
revoke all on function public.finalisiere_tagesbericht(uuid, timestamptz) from public, anon;
revoke all on function public.reserviere_ki_aufruf(text, uuid) from public, anon;

grant execute on function public.speichere_tagesbericht(uuid, timestamptz, uuid, date, text, text, text, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.speichere_bericht_text(uuid, text, timestamptz) to authenticated;
grant execute on function public.finalisiere_tagesbericht(uuid, timestamptz) to authenticated;
grant execute on function public.reserviere_ki_aufruf(text, uuid) to authenticated;
