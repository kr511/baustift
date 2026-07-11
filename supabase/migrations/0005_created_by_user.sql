-- Persönliche Konten: echter Ersteller-Verweis neben dem Anzeigenamen.
-- created_by (text) bleibt bewusst als denormalisierter Anzeigename erhalten:
-- Altdaten (Freitext) bleiben lesbar und Druckansicht/PDF brauchen keinen
-- Join. Die Server Actions befüllen ab jetzt beide Spalten aus der Session.

alter table public.baustellen
  add column created_by_user_id uuid references auth.users(id) on delete set null;

alter table public.tagesberichte
  add column created_by_user_id uuid references auth.users(id) on delete set null;
