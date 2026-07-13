# Vorführ- und Cutover-Checkliste

Diese Checkliste ist die Freigabegrundlage für die Swietelsky-Faber-Vorführung. Sie gilt für die Web-App und den Electron-Wrapper im aktuellen Repository. Ein Haken bedeutet: Der Schritt wurde am Zielsystem ausgeführt und das genannte Ergebnis wurde geprüft — nicht nur konfiguriert.

## Aktueller Ausgangspunkt

- Die App verwendet Next.js, Supabase Auth/Postgres/Storage und serverseitig Anthropic (`claude-sonnet-5`).
- Das Datenmodell ist ein **gemeinsam genutztes Firmenkonto**, keine Mehrmandanten-Architektur. Jeder regulär authentifizierte Nutzer sieht die gemeinsamen Firmendaten.
- Das bisher in der Live-App konfigurierte Supabase-Ziel ist nicht erreichbar. Das vorhandene Projekt „Baustift“ hat ein anderes Mehrmandanten-Schema und darf nicht wiederverwendet werden.
- Benötigt wird deshalb ein **neues, leeres und ausschließlich für diese Vorführung bestimmtes Supabase-Projekt**. Der Seed enthält nur fiktive Daten.
- Der Electron-Wrapper lädt die gehostete Vercel-App. Er ist kein Offline-Client.
- Der aktuelle Windows-Workflow baut Installer und Portable-EXE, enthält aber noch keine explizite Code-Signing-Konfiguration. Ein gebautes Artefakt ist daher nicht automatisch signiert.

## 1. Verbindliche Freigaben vor externen Änderungen

- [ ] Zielorganisation, Projektname, Region und aktueller Monatspreis wurden unmittelbar vor der Erstellung erneut abgefragt.
- [ ] Die kostenverantwortliche Person hat **Organisation und Preis ausdrücklich bestätigt**. Vorgeschlagener Stand: Organisation „kr511’s Org“, Projekt `swietelsky-faber-tagesbericht-demo`, EU-Region, zuletzt 0 EUR/Monat. Kosten niemals aus dieser Doku ableiten, sondern frisch bestätigen.
- [ ] Festgehalten: ausschließlich fiktive Vorführdaten; keine Migration oder Kopie von Kunden-/„Baustift“-Daten.
- [ ] Datenverarbeitung mit Supabase, Vercel und Anthropic ist für die Vorführung intern freigegeben.

**No-Go:** Ohne explizite Kosten-/Organisationsfreigabe kein Projekt anlegen. Das bestehende „Baustift“-Projekt weder umstellen noch mit diesen Migrationen verändern.

## 2. Lokaler Release-Gate

Aus dem Repository-Root ausführen. Die CLI-Versionen sind die für diese Checkliste geprüften Versionen.

```bash
npm ci
npm run check
npm audit --omit=dev
cd desktop
npm ci
npm audit
cd ..
git status --short
```

- [ ] Lint, TypeScript und Produktions-Build sind grün.
- [ ] Beide Audits haben keine ungeklärte produktive Schwachstelle.
- [ ] `git status --short` und der vollständige Diff wurden geprüft; keine fremde, geheime oder unbeabsichtigte Datei wird ausgerollt.
- [ ] `.env.local`, Tokens, Passwörter und API-Keys sind nicht versioniert.
- [ ] Für ein reproduzierbares Release existiert ein geprüfter Commit; Tag und Deployment beziehen sich auf genau diesen Stand.

## 3. Dediziertes Supabase-Projekt

- [ ] Projekt erst nach Abschnitt 1 in der bestätigten Organisation und EU-Region erstellen.
- [ ] Datenbankpasswort in einem Passwortmanager speichern, nicht in Doku, Chat, Shell-History oder Repository.
- [ ] Projekt-Ref notieren; keine geheimen Keys in dieses Dokument schreiben.
- [ ] Prüfen, dass das Ziel neu und leer ist. Bei vorhandenen fachlichen Tabellen abbrechen.

Falls `supabase/config.toml` noch fehlt, einmalig initialisieren. Danach das neue Projekt verbinden:

```bash
npx --yes supabase@2.109.1 init
npx --yes supabase@2.109.1 link --project-ref <project-ref>
npx --yes supabase@2.109.1 migration list --linked
npx --yes supabase@2.109.1 db push --linked --include-all --dry-run
```

Der Dry-Run darf ausschließlich diese fünf Migrationen in dieser Reihenfolge ankündigen:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_auth_policies.sql`
3. `supabase/migrations/0003_ki_rate_limit_und_upload_limits.sql`
4. `supabase/migrations/0004_dokument_import_rate_limit.sql`
5. `supabase/migrations/20260713083654_harden_reports_auth_and_ai_limits.sql`

Dann gemeinsam und vor jeder öffentlichen Freigabe anwenden:

```bash
npx --yes supabase@2.109.1 db push --linked --include-all
npx --yes supabase@2.109.1 migration list --linked
npx --yes supabase@2.109.1 db lint --linked --schema public --level warning --fail-on error
npx --yes supabase@2.109.1 db advisors --linked --type security --level info --fail-on error
npx --yes supabase@2.109.1 db advisors --linked --type performance --level info --fail-on error
```

- [ ] Lokal und remote werden alle fünf Migrationen übereinstimmend angezeigt.
- [ ] Keine DB-Lint-/Advisor-Fehler; jedes Warning wurde fachlich geprüft, behoben oder mit Begründung und Verantwortlichem akzeptiert. Kein ungeprüftes Security-Warning bleibt offen.
- [ ] Im Table Editor sind RLS für alle `public`-Tabellen und der private Bucket `tagesbericht-fotos` sichtbar.
- [ ] Bucket: `public = false`, Limit 10 MiB, nur JPEG/PNG/WebP/HEIC/HEIF.
- [ ] `anon` hat keine Tabellenrechte. `authenticated` darf Baustellen lesen/anlegen/ändern, Berichte und Details direkt nur lesen; Berichtsschreibvorgänge laufen über die vier freigegebenen RPCs.
- [ ] Die vier `SECURITY DEFINER`-RPCs prüfen `auth.uid()`, schließen anonyme Auth-Nutzer aus, setzen einen leeren `search_path` und sind nicht für `anon`/`PUBLIC` ausführbar.

Der April-2026-Wechsel von Supabase exponiert neue Tabellen nicht mehr automatisch über die Data API. Die letzte Migration erteilt die benötigten Rechte ausdrücklich; trotzdem den echten App-Zugriff testen und nicht nur RLS im Dashboard ansehen.

## 4. Auth und Demo-Account härten

Im Supabase-Dashboard:

- [ ] Unter Authentication die öffentliche Registrierung deaktivieren.
- [ ] Anonyme Sign-ins deaktivieren; unbenutzte Provider ebenfalls deaktivieren.
- [ ] Eine starke Passwort-Richtlinie und „Secure password change“ aktivieren.
- [ ] Genau **einen** bestätigten Demo-Firmenaccount über die administrative Benutzerverwaltung anlegen. Keine Zugangsdaten in Repository, Screenshots oder Präsentationsnotizen schreiben.
- [ ] Site URL auf die endgültige Produktionsdomain setzen; nur tatsächlich benötigte Redirect-URLs erlauben.
- [ ] CAPTCHA derzeit **nicht** aktivieren: Die vorhandene Login-UI übermittelt noch kein CAPTCHA-Token. Erst nach Frontend-Integration einschalten.
- [ ] Login mit falschem Passwort scheitert neutral; Login mit Demo-Account funktioniert; nach Logout ist `/berichte` wieder geschützt.

**No-Go:** Signup offen, anonyme Logins aktiv, mehr als der bewusst angelegte Demo-Nutzer oder ein im Browser verwendeter `service_role`-/Secret-Key.

## 5. Keine Demodaten

Die Instanz startet leer. Es werden **keine** Beispiel-/Vorführdaten eingespielt — Baustellen und Berichte entstehen ausschließlich durch echte Nutzung in der App.

```bash
npx --yes supabase@2.109.1 db query --linked "select (select count(*) from public.baustellen) as baustellen, (select count(*) from public.tagesberichte) as berichte;"
```

Erwartet: `0` Baustellen und `0` Berichte auf einer frisch migrierten Instanz.

- [ ] Zählwerte sind `0`/`0` (keine Fremd- oder Altdaten).
- [ ] Erste Baustelle und erster Bericht werden live über die App angelegt.

## 6. Env-Vars und Vercel-Cutover

Erforderlich gemäß `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL` — öffentliche Projekt-URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Browser-/Publishable-Key, niemals `service_role`
- `ANTHROPIC_API_KEY` — ausschließlich serverseitig und in Vercel als sensitive Variable

Variablen interaktiv setzen, damit Werte weder im Befehl noch in Logs stehen:

```bash
npx --yes vercel@54.21.1 env add NEXT_PUBLIC_SUPABASE_URL production --no-sensitive
npx --yes vercel@54.21.1 env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --no-sensitive
npx --yes vercel@54.21.1 env add ANTHROPIC_API_KEY production --sensitive
npx --yes vercel@54.21.1 env ls production
```

Für einen Preview-Test dieselben Befehle mit `preview` nur dann ausführen, wenn das Preview ebenfalls ausschließlich auf die dedizierte Demo-Datenbank zeigen darf. Spätere Kunden-Production-Daten niemals an allgemeine Preview-Deployments hängen.

Hinweis: `vercel env pull .env.local` überschreibt die Datei vollständig. Vorher lokale Sonderwerte sichern. Änderungen an `NEXT_PUBLIC_*` wirken erst nach einem neuen Build/Deployment.

- [ ] Vercel-Projektverknüpfung in `.vercel/project.json` zeigt auf `swietelsky-faber-tagesbericht`.
- [ ] Alle drei Variablennamen sind im richtigen Environment vorhanden; Werte werden nicht ausgegeben oder dokumentiert.
- [ ] Der Anthropic-Key ist echt, aktiv und budgetiert. „Vorhanden“ allein reicht nicht: die Generierung im E2E-Test muss erfolgreich sein.

Deployment des geprüften Stands:

```bash
npx --yes vercel@54.21.1 deploy --prod
npx --yes vercel@54.21.1 ls
npx --yes vercel@54.21.1 inspect <deployment-url>
```

- [ ] Deployment-Status `READY`, Produktionsalias korrekt, Build-Commit notiert.
- [ ] Öffentliche Startseite und Login liefern 200; `/berichte` leitet ohne Session zum Login um.
- [ ] Vercel-Logs nach dem E2E-Test enthalten keine ungeklärten Auth-, Supabase-, Anthropic- oder 5xx-Fehler.
- [ ] Eine bekannte vorherige Deployment-ID ist notiert. Rollback im Ernstfall: `npx --yes vercel@54.21.1 rollback <deployment-id>`.

## 7. Kern-E2E auf dem Produktionsalias

In einem frischen privaten Browserfenster und anschließend im Electron-Wrapper prüfen:

- [ ] Landingpage, Datenschutz, Impressum und Nutzungsbedingungen öffnen ohne Fehler.
- [ ] Ohne Session wird `/berichte` geschützt; Demo-Login funktioniert.
- [ ] Die zwei Demo-Baustellen und drei Seed-Berichte erscheinen korrekt; Filter funktionieren.
- [ ] Neue Baustelle erstellen und Status ändern.
- [ ] Neuen Bericht mit Wetter, Stichpunkten, Personal und Material speichern; Seite neu laden und Persistenz prüfen.
- [ ] Ein gültiges Foto hochladen; Anzeige über kurzlebige signierte URL prüfen. Unzulässigen Dateityp bzw. übergroße Datei ablehnen lassen.
- [ ] KI-Text erzeugen. Erfolg beweist zugleich einen verwendbaren `ANTHROPIC_API_KEY`; unmittelbar wiederholter Aufruf respektiert den Cooldown.
- [ ] KI-Text bearbeiten/speichern, Bericht finalisieren und prüfen, dass finaler Bericht nicht mehr änderbar ist.
- [ ] Druckansicht öffnen und über „Drucken / Als PDF speichern“ eine lesbare PDF erzeugen.
- [ ] Versandbuttons öffnen mit korrektem Betreff/Text; PDF wird bewusst separat angehängt.
- [ ] Optionaler Dokumentimport: eine harmlose Test-DOCX und Test-PDF importieren; Grenz-/Fehlerfall wird verständlich abgewiesen.
- [ ] Logout; geschützte Route erneut aufrufen und Weiterleitung prüfen.

**Go-Gate:** Der komplette Weg Login → Speichern → KI → Finalisieren → Druck/PDF ist auf dem endgültigen Produktionsalias erfolgreich. Ein lokaler Build oder einzelne API-Checks ersetzen diesen Durchlauf nicht.

## 8. Screenshots und Terminmaterial

- [ ] Nach bestandenem E2E aktuelle Screenshots in einem lokalen Ordner `audit-YYYY-MM-DD/` sichern: Landingpage, Login, Übersicht, Entwurf, finaler Bericht, Druckansicht, mobile Login-/Übersichtsansicht und Electron-Fenster.
- [ ] Keine Browserleisten mit Tokens, keine Zugangsdaten, E-Mails, Projekt-Refs oder echte Personen-/Kundendaten sichtbar.
- [ ] Marketing-Screenshots `public/screenshots/bericht.png` und `public/screenshots/druckansicht.png` entsprechen der aktuellen UI; veraltete Bilder vor Release ersetzen.
- [ ] Eine aus der Druckansicht erzeugte Demo-PDF sowie ein kurzer Ablaufzettel liegen lokal/offline bereit.

## 9. Windows-Release und Signierung

Vor dem Tag:

- [ ] `desktop/package.json`-Version entspricht dem geplanten Tag `v<version>`.
- [ ] `desktop/build/icon.png`, `desktop/build/license.txt`, `LICENSE`, `desktop/main.js` und `.github/workflows/release.yml` sind im geprüften Commit enthalten.
- [ ] `DEFAULT_APP_URL` in `desktop/main.js` zeigt auf den getesteten Produktionsalias.
- [ ] Der Workflow baut `Tagesberichte-Setup.exe` und `Tagesberichte-Portable.exe` erst nach erfolgreichem `npm run check`.

Release auslösen:

```bash
git tag -a v<version> -m "Tagesberichte v<version>"
git push origin v<version>
gh run watch
gh release view v<version>
```

Auf einem sauberen Windows-System beide Assets herunterladen und prüfen:

```powershell
Get-FileHash .\Tagesberichte-Setup.exe -Algorithm SHA256
Get-FileHash .\Tagesberichte-Portable.exe -Algorithm SHA256
Get-AuthenticodeSignature .\Tagesberichte-Setup.exe | Format-List Status,StatusMessage,SignerCertificate,TimeStamperCertificate
Get-AuthenticodeSignature .\Tagesberichte-Portable.exe | Format-List Status,StatusMessage,SignerCertificate,TimeStamperCertificate
```

- [ ] Setup installieren, starten, Login/E2E-Rauchtest, deinstallieren; Portable-EXE separat starten.
- [ ] SHA-256-Werte intern zum Release dokumentieren.
- [ ] Für externe Übergabe ist Authenticode-Status `Valid` für beide EXEs Pflicht. Zertifikat und Passwort nur als geschützte GitHub-Secrets hinterlegen und den Workflow entsprechend konfigurieren; niemals ins Repository schreiben.
- [ ] Solange Signierung nicht eingerichtet und als `Valid` geprüft ist, Artefakte ausdrücklich als **unsigniert** behandeln. Ein lokales Öffnen trotz SmartScreen ist kein Signierungsnachweis.
- [ ] Stabile Downloadpfade funktionieren: `releases/latest/download/Tagesberichte-Setup.exe` und `releases/latest/download/Tagesberichte-Portable.exe`.

## 10. Termin-Fallback

Am Vortag und 30 Minuten vor dem Termin:

- [ ] Browser- und Electron-Login testen, Session danach sauber abmelden; Zugang im Passwortmanager verfügbar.
- [ ] Seed-Entwurf, Demo-PDF, aktuelle Screenshots und beide Windows-Artefakte lokal auf dem Vorführgerät speichern.
- [ ] Netzwerk, Beamer/Skalierung, Druckdialog/PDF-Ziel und Browser-Popups prüfen.
- [ ] KI verfügbar: kompletter Live-Ablauf. Anthropic gestört: Seed-Entwurf bearbeiten, finalisieren und drucken; KI-Ausfall transparent benennen.
- [ ] Vercel/Supabase oder Internet gestört: keine Offline-Funktion behaupten. Screenshots und vorbereitete PDF zeigen, Architektur/Ablauf erklären und einen Nachholtermin für den Live-Durchlauf festhalten.
- [ ] Windows-SmartScreen bei unsigniertem Build: für eine externe Vorführung nicht umgehen; stattdessen Browser-App verwenden und Signierung nachholen.

## Finale Freigabe

Freigabe nur, wenn alle drei Aussagen wahr und belegt sind:

1. **Daten/Auth:** dedizierte Demo-Instanz, Signup/Anonymous aus, Advisors ausgewertet, ausschließlich fiktive Seed-Daten.
2. **Produkt:** Kern-E2E auf dem endgültigen Produktionsalias einschließlich echter KI-Generierung und PDF bestanden.
3. **Auslieferung:** aktuelle Terminmaterialien vorhanden; Windows-Artefakte getestet und für externe Übergabe gültig signiert oder bewusst nicht als Übergabeartefakt verwendet.

Freigegeben von: ____________________  Datum/Uhrzeit: ____________________  Deployment: ____________________
