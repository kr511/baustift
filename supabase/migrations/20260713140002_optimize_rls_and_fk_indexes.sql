-- Advisor-Nachlauf: Auth-Helfer in RLS-Policies als InitPlans auswerten,
-- Fremdschluessel-Pruefungen indizieren und interne KI-Ledger explizit sperren.

alter policy "firmenkonto_select_baustellen" on public.baustellen
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  );

alter policy "firmenkonto_insert_baustellen" on public.baustellen
  with check (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  );

alter policy "firmenkonto_update_baustellen" on public.baustellen
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  )
  with check (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  );

alter policy "firmenkonto_select_tagesberichte" on public.tagesberichte
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  );

alter policy "firmenkonto_select_tagesbericht_personal" on public.tagesbericht_personal
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  );

alter policy "firmenkonto_select_tagesbericht_material" on public.tagesbericht_material
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  );

alter policy "firmenkonto_select_tagesbericht_fotos" on public.tagesbericht_fotos
  using (
    (select auth.uid()) is not null
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  );

-- Die Storage-Policies waren nicht Teil der Advisor-Warnung, verwenden aber
-- dieselben Auth-Helfer und bleiben so konsistent mit dem optimierten Muster.
alter policy "firmenkonto_select_foto_storage" on storage.objects
  using (
    bucket_id = 'tagesbericht-fotos'
    and (
      owner_id = (select auth.uid())::text
      or exists (
        select 1 from public.tagesbericht_fotos as foto
        where foto.storage_path = name
      )
    )
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  );

alter policy "firmenkonto_insert_foto_storage" on storage.objects
  with check (
    bucket_id = 'tagesbericht-fotos'
    and (storage.foldername(name))[1] = 'entwuerfe'
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  );

alter policy "firmenkonto_delete_foto_storage" on storage.objects
  using (
    bucket_id = 'tagesbericht-fotos'
    and (storage.foldername(name))[1] = 'entwuerfe'
    and (owner_id = (select auth.uid())::text or owner_id is null)
    and not exists (
      select 1
      from public.tagesbericht_fotos as foto
      where foto.storage_path = name
    )
    and coalesce((select auth.jwt()) ->> 'is_anonymous', 'false') <> 'true'
  );

create index if not exists ki_aufrufe_created_by_idx
  on public.ki_aufrufe (created_by);

create index if not exists ki_importe_created_by_idx
  on public.ki_importe (created_by);

-- Der lokale Spaltenname lautet storage_bucket; zusammen mit storage_path
-- deckt er den FK auf storage.objects(bucket_id, name) in FK-Reihenfolge ab.
create index if not exists tagesbericht_fotos_storage_objekt_idx
  on public.tagesbericht_fotos (storage_bucket, storage_path);

-- Beide Tabellen sind ausschliesslich interne Rate-Limit-Ledger. Die
-- SECURITY-DEFINER-RPCs arbeiten weiterhin als Eigentuemer; Data-API-Rollen
-- erhalten selbst bei versehentlich spaeter erteilten Tabellenrechten keine
-- Zeilenfreigabe.
create policy "interne_ki_aufrufe_sperren" on public.ki_aufrufe
  for all to anon, authenticated
  using (false)
  with check (false);

create policy "interne_ki_importe_sperren" on public.ki_importe
  for all to anon, authenticated
  using (false)
  with check (false);
