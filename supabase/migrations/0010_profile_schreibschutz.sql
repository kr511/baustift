-- Spalten-Schutz auf profiles: "profiles_update_self" (0004) sichert nur die
-- Zeile (id = auth.uid()), nicht die Spalten. Die Beschränkung auf
-- display_name existierte bisher nur in der Server Action
-- (lib/actions/profile.ts) — der Browser-Client verwendet aber Anon-Key +
-- Nutzer-Session direkt gegen PostgREST, kann die Server Action also
-- umgehen und role/firma_id auf der eigenen Zeile beliebig setzen. Da
-- get_user_firma_id()/get_user_role() (Basis aller anderen RLS-Policies)
-- direkt aus profiles lesen, wäre das eine vollständige
-- Rechteausweitung/Mandanten-Ausbruch. Fix: role/firma_id werden bei jedem
-- Update unabhängig vom Payload auf ihren bisherigen Wert zurückgepinnt.
--
-- Achtung: das blockiert auch beabsichtigte künftige Rollen-/Firmenwechsel
-- durch einen Admin-Flow. Aktuell gibt es keine solche Funktion in der App
-- (Rolle wird nur einmalig bei der Einladung via raw_user_meta_data
-- gesetzt, siehe handle_new_user in 0004/0008). Sollte das gebraucht
-- werden, muss der Trigger für diesen Fall gezielt umgangen werden (z. B.
-- Service-Role-RPC mit "alter table ... disable trigger" im selben
-- Statement, oder eine Ausnahme für auth.jwt()->>'role' = 'service_role').
create function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.role := old.role;
  new.firma_id := old.firma_id;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();
