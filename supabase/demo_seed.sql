-- Ausschließlich für eine leere, dedizierte Präsentationsinstanz.
-- Alle Namen, Orte und Auftragsdaten in dieser Datei sind fiktiv.
-- Der Guard bricht ab, sobald bereits andere Baustellen oder Berichte existieren.

begin;

do $$
begin
  if exists (
    select 1
    from public.baustellen
    where id not in (
      '10000000-0000-4000-8000-000000000001'::uuid,
      '10000000-0000-4000-8000-000000000002'::uuid
    )
  ) or exists (
    select 1
    from public.tagesberichte
    where id not in (
      '20000000-0000-4000-8000-000000000001'::uuid,
      '20000000-0000-4000-8000-000000000002'::uuid,
      '20000000-0000-4000-8000-000000000003'::uuid
    )
  ) then
    raise exception 'Demo-Seed abgebrochen: Die Datenbank enthält bereits andere Baustellen oder Tagesberichte.'
      using errcode = '55000';
  end if;
end;
$$;

insert into public.baustellen (
  id,
  name,
  adresse,
  auftraggeber,
  status,
  notiz,
  created_by,
  created_at
) values
  (
    '10000000-0000-4000-8000-000000000001',
    'Kanalsanierung Hauptsammler Nord – BA 2',
    'Musterstraße 12, 12345 Musterstadt',
    'Stadtwerke Musterstadt',
    'aktiv',
    'Fiktives Demonstrationsprojekt: grabenlose Sanierung mehrerer Haltungen.',
    'Demo-Bauleitung',
    now() - interval '14 days'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Schachtsanierung Industriepark West',
    'Werkstraße 8, 12345 Musterstadt',
    'Abwasserverband Musterregion',
    'aktiv',
    'Fiktives Demonstrationsprojekt: Sanierung von Revisionsschächten.',
    'Demo-Bauleitung',
    now() - interval '10 days'
  )
on conflict (id) do nothing;

-- Ein vorbereiteter Entwurf ermöglicht in der Vorführung das Finalisieren,
-- auch wenn der externe KI-Dienst gerade nicht erreichbar sein sollte.
insert into public.tagesberichte (
  id,
  baustelle_id,
  datum,
  wetter,
  stichpunkte,
  bericht_text,
  ki_generiert_am,
  status,
  finalized_at,
  finalized_by,
  baustelle_name_snapshot,
  created_by,
  created_at,
  updated_at
) values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    current_date,
    'Heiter, 22 °C, trocken',
    'Arbeitsstelle eingerichtet; Haltung DN 600 gereinigt; TV-Inspektion durchgeführt; GFK-Schlauchliner eingezogen; UV-Aushärtung abgeschlossen; Dichtheitsprüfung vorbereitet',
    'Nach der vollständigen Einrichtung und Sicherung der Arbeitsstelle wurde die Haltung DN 600 gereinigt und mittels TV-Inspektion kontrolliert. Anschließend wurde der vorbereitete GFK-Schlauchliner planmäßig eingezogen und mit der UV-Lichterkette ausgehärtet. Die Arbeiten verliefen ohne besondere Vorkommnisse. Die abschließende Dichtheitsprüfung wurde für den folgenden Arbeitsschritt vorbereitet.',
    now() - interval '20 minutes',
    'entwurf',
    null,
    null,
    null,
    'Demo-Bauleitung',
    now() - interval '45 minutes',
    now() - interval '20 minutes'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    current_date - 1,
    'Bewölkt, 18 °C, zeitweise leichter Regen',
    'Wasserhaltung aufgebaut; Haltung DN 500 gefräst; Hindernisse beseitigt; Reinigung und Kalibrierung abgeschlossen; Liner für Folgetag vorbereitet',
    'Zu Arbeitsbeginn wurde die Wasserhaltung eingerichtet und auf Funktion geprüft. In der Haltung DN 500 wurden vorhandene Ablagerungen und einragende Hindernisse mit dem Fräsroboter beseitigt. Nach der anschließenden Hochdruckreinigung erfolgte die Kalibrierung der Haltung. Der Schlauchliner wurde kontrolliert, vorbereitet und für den Einbau am Folgetag bereitgestellt.',
    now() - interval '1 day 2 hours',
    'final',
    now() - interval '1 day 1 hour',
    null,
    'Kanalsanierung Hauptsammler Nord – BA 2',
    'Demo-Bauleitung',
    now() - interval '1 day 9 hours',
    now() - interval '1 day 1 hour'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    current_date - 3,
    'Sonnig, 25 °C, trocken',
    'Schachtbauwerk gereinigt; Untergrund vorbereitet; Schadstellen reprofilert; Beschichtung zweilagig aufgebracht; Baustelle geräumt',
    'Das Schachtbauwerk wurde gereinigt und der Untergrund für die Sanierung vorbereitet. Lokale Schadstellen wurden fachgerecht reprofilert. Nach der erforderlichen Wartezeit wurde die zugelassene Beschichtung in zwei Arbeitsgängen gleichmäßig aufgebracht. Die abschließende Sichtkontrolle ergab keine Beanstandungen. Der Arbeitsbereich wurde gereinigt und ordnungsgemäß verlassen.',
    now() - interval '3 days 2 hours',
    'final',
    now() - interval '3 days 1 hour',
    null,
    'Schachtsanierung Industriepark West',
    'Demo-Bauleitung',
    now() - interval '3 days 8 hours',
    now() - interval '3 days 1 hour'
  )
on conflict (id) do nothing;

insert into public.tagesbericht_personal (
  id,
  tagesbericht_id,
  name,
  stunden,
  taetigkeit
) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Max Mustermann', 8.0, 'Kolonnenführung und UV-Aushärtung'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Erika Musterfrau', 8.0, 'TV-Inspektion und Dokumentation'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'Tim Beispiel', 7.5, 'Reinigung und Linereinbau'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'Max Mustermann', 8.5, 'Kolonnenführung und Fräsarbeiten'),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'Tim Beispiel', 8.0, 'Wasserhaltung und Reinigung'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'Erika Musterfrau', 8.0, 'Untergrundprüfung und Dokumentation'),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 'Tim Beispiel', 8.0, 'Reprofilierung und Beschichtung')
on conflict (id) do nothing;

insert into public.tagesbericht_material (
  id,
  tagesbericht_id,
  bezeichnung,
  menge,
  typ
) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'GFK-Schlauchliner DN 600', '48 m', 'material'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'UV-Aushärtungsanlage', '1 Stk.', 'geraet'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'TV-Inspektionsanlage', '1 Stk.', 'geraet'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'Fräsroboter', '1 Stk.', 'geraet'),
  ('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'Absperrblasen DN 500', '2 Stk.', 'material'),
  ('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'Reprofilierungsmörtel', '8 Sack', 'material'),
  ('40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 'Schachtbeschichtung', '42 kg', 'material')
on conflict (id) do nothing;

commit;
