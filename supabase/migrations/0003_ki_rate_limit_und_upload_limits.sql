-- Rate-Limit für die KI-Generierung: Zeitstempel der letzten Generierung pro Bericht
alter table public.tagesberichte
  add column if not exists ki_generiert_am timestamptz;

-- Upload-Härtung: Größenlimit (10 MB) und erlaubte Bildformate für den Foto-Bucket
update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
where id = 'tagesbericht-fotos';
