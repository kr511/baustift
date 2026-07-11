-- Vorbereitung für weitere Firmen: handle_new_user() liest firma_id jetzt
-- aus den Einladungs-Metadaten statt sie hart auf den Seed-Mandanten
-- (Swietelsky Faber) zu verdrahten. Fällt firma_id nicht mit, bleibt der
-- Seed-Mandant der Fallback — bestehende Invite-Flows ändern sich also
-- nicht.
--
-- Neue Firma onboarden (weiterhin nur durch den Betreiber, kein
-- öffentliches Formular):
--   1. insert into public.firmen (name, wordmark, land) values (...);
--   2. insert into public.niederlassungen (firma_id, name) values (...);
--   3. Ersten Admin per Dashboard einladen (Authentication → Invite user)
--      mit User-Metadata: { "firma_id": "<neue-firma-uuid>",
--      "display_name": "...", "role": "admin" }.
-- In-App-Einladungen (/admin/nutzer, lib/actions/admin.ts) setzen firma_id
-- weiterhin explizit auf die Firma des einladenden Admins — ein Admin kann
-- also über die App nie eine andere Firma als seine eigene befüllen.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, firma_id, display_name, role)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'firma_id', '')::uuid,
      'c0a1f5e0-0000-4000-8000-000000000001'
    ),
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
