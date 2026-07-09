-- Replaces the temporary v1 open policies with authenticated-only access.
-- Data stays company-shared (one shared account), so no auth.uid() scoping —
-- the gate is simply: you must be logged in.
-- IMPORTANT: signups must be disabled in the Supabase dashboard, otherwise
-- anyone could self-register and become "authenticated".

drop policy "anon_all_baustellen" on public.baustellen;
drop policy "anon_all_tagesberichte" on public.tagesberichte;
drop policy "anon_all_tagesbericht_personal" on public.tagesbericht_personal;
drop policy "anon_all_tagesbericht_material" on public.tagesbericht_material;
drop policy "anon_all_tagesbericht_fotos" on public.tagesbericht_fotos;
drop policy "anon_all_tagesbericht_fotos_storage" on storage.objects;

create policy "authenticated_all_baustellen" on public.baustellen
  for all to authenticated using (true) with check (true);
create policy "authenticated_all_tagesberichte" on public.tagesberichte
  for all to authenticated using (true) with check (true);
create policy "authenticated_all_tagesbericht_personal" on public.tagesbericht_personal
  for all to authenticated using (true) with check (true);
create policy "authenticated_all_tagesbericht_material" on public.tagesbericht_material
  for all to authenticated using (true) with check (true);
create policy "authenticated_all_tagesbericht_fotos" on public.tagesbericht_fotos
  for all to authenticated using (true) with check (true);

create policy "authenticated_all_tagesbericht_fotos_storage" on storage.objects
  for all to authenticated
  using (bucket_id = 'tagesbericht-fotos')
  with check (bucket_id = 'tagesbericht-fotos');
