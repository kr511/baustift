-- Rate-Limit für den Dokument-Import (KI-Extraktion aus Word/PDF): zählt
-- Importe pro Tag, unabhängig von einem konkreten Tagesbericht (der beim
-- Import ja noch nicht existiert).
create table if not exists public.ki_importe (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ki_importe enable row level security;

-- Bewusst nur select+insert (nicht "for all" wie in 0002) — diese Tabelle
-- ist ein Rate-Limit-Zähler, kein Nutzdaten-Objekt. Update/Delete für
-- authenticated freizugeben würde einem Client erlauben, eigene Zeilen zu
-- löschen und damit das Tageslimit im Dokument-Import zu umgehen.
create policy "authenticated_select_ki_importe" on public.ki_importe
  for select to authenticated using (true);
create policy "authenticated_insert_ki_importe" on public.ki_importe
  for insert to authenticated with check (true);
