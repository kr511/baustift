-- RLS-Cutover: von "eingeloggt = sieht alles" (0002) auf Firma-Scoping.
--
-- ============================= RUNBOOK =====================================
-- Diese Migration ist der riskanteste Schritt des Releases. Reihenfolge:
--   1. Migrationen 0004 + 0005 anwenden — rein additiv, die alte App läuft
--      unverändert weiter (firma_id setzen Trigger, neue Spalten stören nicht).
--   2. Neuen App-Code deployen (schreibt created_by_user_id, liest Profile;
--      funktioniert unter alten UND neuen Policies).
--   3. Persönliche Konten einladen. Danach per SQL prüfen, dass JEDER
--      Auth-User ein Profil hat (0004 legt sie per Trigger + Backfill an):
--        select u.email from auth.users u
--        left join public.profiles p on p.id = u.id
--        where p.id is null;
--      -- muss leer sein (oder bewusst leer gelassen).
--   4. ERST DANN diese Migration anwenden. Nutzer ohne Profil können sich
--      weiter einloggen, sehen aber leere Listen (get_user_firma_id() gibt
--      null zurück, alle Policies werden false) — kein Fehler, kein Crash.
--   5. Nach 1–2 Wochen Übergang: geteiltes Konto im Dashboard stilllegen.
-- Rollback: Policies aus 0002 wieder anlegen (dieser Cutover ist rein
-- policy-basiert, keine Schemaänderung).
-- ===========================================================================

drop policy "authenticated_all_baustellen" on public.baustellen;
drop policy "authenticated_all_tagesberichte" on public.tagesberichte;
drop policy "authenticated_all_tagesbericht_personal" on public.tagesbericht_personal;
drop policy "authenticated_all_tagesbericht_material" on public.tagesbericht_material;
drop policy "authenticated_all_tagesbericht_fotos" on public.tagesbericht_fotos;

create policy "firma_all_baustellen" on public.baustellen
  for all to authenticated
  using (firma_id = public.get_user_firma_id())
  with check (firma_id = public.get_user_firma_id());

-- tagesberichte.firma_id wird vom BEFORE-Trigger (0004) aus der Baustelle
-- gesetzt, bevor WITH CHECK greift — Inserts ohne explizite firma_id passen.
create policy "firma_all_tagesberichte" on public.tagesberichte
  for all to authenticated
  using (firma_id = public.get_user_firma_id())
  with check (firma_id = public.get_user_firma_id());

create policy "firma_all_tagesbericht_personal" on public.tagesbericht_personal
  for all to authenticated
  using (exists (
    select 1 from public.tagesberichte t
    where t.id = tagesbericht_id
      and t.firma_id = public.get_user_firma_id()
  ))
  with check (exists (
    select 1 from public.tagesberichte t
    where t.id = tagesbericht_id
      and t.firma_id = public.get_user_firma_id()
  ));

create policy "firma_all_tagesbericht_material" on public.tagesbericht_material
  for all to authenticated
  using (exists (
    select 1 from public.tagesberichte t
    where t.id = tagesbericht_id
      and t.firma_id = public.get_user_firma_id()
  ))
  with check (exists (
    select 1 from public.tagesberichte t
    where t.id = tagesbericht_id
      and t.firma_id = public.get_user_firma_id()
  ));

create policy "firma_all_tagesbericht_fotos" on public.tagesbericht_fotos
  for all to authenticated
  using (exists (
    select 1 from public.tagesberichte t
    where t.id = tagesbericht_id
      and t.firma_id = public.get_user_firma_id()
  ))
  with check (exists (
    select 1 from public.tagesberichte t
    where t.id = tagesbericht_id
      and t.firma_id = public.get_user_firma_id()
  ));

-- Die Storage-Policy auf dem Foto-Bucket (0002) bleibt für 1.0 bewusst
-- bucket-weit: Foto-Objekte sind nur über serverseitig signierte URLs aus
-- Zeilen erreichbar, die selbst firma-gescoped sind, und die bestehenden
-- Objektpfade (entwuerfe/…) tragen kein Firma-Segment. Dokumentierte
-- Einschränkung; der neue Dokumente-Bucket (0007) nutzt von Anfang an
-- firma-präfixierte Pfade.
