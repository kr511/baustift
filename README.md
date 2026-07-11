# Baustift

Copyright © 2026 Elias Kümmel. Alle Rechte vorbehalten — proprietäre Software, siehe [LICENSE](./LICENSE). Dieses Repository ist öffentlich, um die Windows-Downloads (Releases) bereitzustellen; es gewährt keine Rechte am Quellcode.

Baustift ist eine Web-App, die aus Stichpunkten fertige Bautagesberichte erstellt. Poliere/Bauleiter erfassen Baustelle, Personal, Material, Wetter und ein paar Stichpunkte — die KI formuliert daraus einen einheitlichen, professionellen Tagesbericht mit Druckansicht und PDF-Export. Erster Kunde: Swietelsky Faber (Niederlassung Leipzig); die App ist mandantenfähig angelegt, um auf weitere Niederlassungen und Firmen zu wachsen.

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind 4
- **Supabase** — Datenbank, Auth, Foto-/Dokumenten-Storage
- **Anthropic API** (`claude-sonnet-5`, konfigurierbar) — Textgenerierung, inkl. PDF-Dokumente als Kontext
- **@react-pdf/renderer** — serverseitiger PDF-Export der Berichte
- **Electron** (`desktop/`) — Windows-Exe als Wrapper um die gehostete App
- **Vitest** — Unit-Tests für sicherheits-/datenschutzrelevante reine Funktionen

## Setup (lokal)

```bash
npm install
cp .env.example .env.local   # echte Werte eintragen
npm run dev                  # http://localhost:3000
```

```bash
npm run lint   # ESLint
npm test       # Vitest
npm run build  # Produktions-Build
```

Benötigte Env-Vars (`.env.local`):

| Variable | Zweck |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL des Supabase-Projekts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/Anon-Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-Role-Key, nur serverseitig — für Nutzer-Einladungen (`lib/supabase/admin.ts`). **Niemals** mit `NEXT_PUBLIC_`-Prefix verwenden. |
| `ANTHROPIC_API_KEY` | Key für die KI-Generierung (nur serverseitig) |
| `ANTHROPIC_MODEL` | Optional, überschreibt das Standardmodell `claude-sonnet-5` |

## Datenbank

Migrationen liegen in `supabase/migrations/` und werden in Reihenfolge auf das Supabase-Projekt angewendet:

- `0001_init.sql` — Tabellen (baustellen, tagesberichte, personal, material, fotos), Storage-Bucket, RLS
- `0002_auth_policies.sql` — ersetzt die offenen v1-Policies durch `authenticated`-Policies
- `0003_ki_rate_limit_und_upload_limits.sql` — Rate-Limit-Spalte, Upload-Härtung Foto-Bucket
- `0004_firmen_niederlassungen_profiles.sql` — Mandantenfähigkeit: `firmen`, `niederlassungen`, `profiles`, `firma_id` auf Bestandstabellen, Seed-Mandant Swietelsky Faber/Leipzig
- `0005_created_by_user.sql` — `created_by_user_id` auf `baustellen`/`tagesberichte`
- `0006_rls_firma_scope.sql` — **RLS-Cutover** auf Firma-Scoping (siehe Runbook unten)
- `0007_dokumente_und_vorlagen.sql` — Dokumenten-Bucket, `baustelle_dokumente`, `stil_vorlagen`
- `0008_firma_aus_invite_metadata.sql` — `handle_new_user()` liest `firma_id` aus den Einladungs-Metadaten statt sie hart auf den Seed-Mandanten zu verdrahten (Vorbereitung für weitere Firmen)

### Auth: persönliche Konten (Invite-only)

Jeder Nutzer bekommt ein eigenes Konto. Es gibt **keine Selbstregistrierung** — Konten werden per Einladung angelegt:

- **Dashboard**: Authentication → Users → Invite user. `display_name`/`role`/`firma_id` können als User-Metadata mitgegeben werden, sonst greift der Fallback (E-Mail-Präfix, Rolle `nutzer`, Seed-Firma).
- **In-App**: `/admin/nutzer` (nur für Administratoren) sendet die Einladung über `lib/actions/admin.ts#inviteNutzer` mit dem Service-Role-Key. `firma_id` wird dabei immer auf die Firma des einladenden Admins gesetzt — über die App kann niemand einen Nutzer einer anderen Firma zuordnen.

**Signups müssen im Supabase-Dashboard deaktiviert bleiben** (Authentication → Sign In / Providers → "Allow new users to sign up" aus).

### Neue Firma onboarden (weiterhin nur durch den Betreiber)

Die Windows-Exe und die Web-App sind für jede Firma identisch — welche Daten ein Nutzer sieht, entscheidet allein sein Profil (Firma-Scoping per RLS). Es gibt bewusst **kein öffentliches Registrierungsformular** für neue Firmen (Spam-/Missbrauchsschutz, keine ungeprüften Mandanten). Eine neue Firma kommt so ins System:

1. Firma + Niederlassung anlegen:
   ```sql
   insert into public.firmen (name, wordmark, land) values ('Musterbau GmbH', 'MUSTERBAU', 'DE') returning id;
   insert into public.niederlassungen (firma_id, name) values ('<firma-id>', 'Hauptsitz');
   ```
2. Ersten Admin per Dashboard einladen (Authentication → Invite user) mit User-Metadata:
   ```json
   { "firma_id": "<firma-id>", "display_name": "...", "role": "admin" }
   ```
3. Dieser Admin lädt seine Kolleg:innen danach selbst über `/admin/nutzer` ein — sie landen automatisch in derselben Firma.

**E-Mail-Templates** (Authentication → Email Templates) müssen auf `app/auth/confirm/route.ts` zeigen, z. B. für "Invite user" und "Reset Password":

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type wobei recovery/invite }}&next=/passwort-zuruecksetzen
```

### RLS-Cutover-Runbook (Migration 0006)

`0006` ist der riskanteste Schritt: sie ersetzt "eingeloggt = sieht alles" durch Firma-Scoping. Reihenfolge, um niemanden auszusperren:

1. `0004` + `0005` anwenden (rein additiv, alte App läuft unverändert weiter).
2. Neuen App-Code deployen.
3. Persönliche Konten einladen. Per SQL prüfen, dass **jeder** `auth.users`-Eintrag ein Profil hat:
   ```sql
   select u.email from auth.users u
   left join public.profiles p on p.id = u.id
   where p.id is null;
   -- muss leer sein
   ```
4. Erst dann `0006` anwenden. Nutzer ohne Profil sehen danach leere Listen statt eines Fehlers.
5. Nach 1–2 Wochen Übergang: das alte geteilte Konto im Dashboard stilllegen.

## Struktur

- `app/(marketing)/` — öffentliche Landingpage, Impressum, Datenschutz, Nutzungsbedingungen unter `/`
- `app/(app)/berichte`, `app/(app)/baustellen`, `app/(app)/konto`, `app/(app)/admin/*` — die eigentliche App (Login erforderlich)
- `app/login/`, `app/passwort-vergessen/`, `app/passwort-zuruecksetzen/`, `app/auth/confirm/` — Auth-Flows
- `proxy.ts` — Session-Refresh + Auth-Gate (Next 16: `proxy.ts` statt `middleware.ts`)
- `lib/actions/` — Server Actions (CRUD), `lib/anthropic/` — KI-Generierung, `lib/pdf/` — PDF-Export
- `lib/data/firma.ts`, `lib/data/profile.ts` — Mandant/Nutzer des eingeloggten Requests (React `cache()`-dedupliziert)
- `docs/rechtliches-checkliste.md` — interner Tracker für Verträge/Freigaben vor dem produktiven Einsatz
- `desktop/` — Electron-Wrapper (eigenes `package.json`)

## Deployment

- **Web**: Vercel. Env-Vars am Vercel-Projekt setzen (inkl. `SUPABASE_SERVICE_ROLE_KEY` als serverseitiges Secret), Supabase Auth Site-URL auf die Produktions-Domain stellen.
- **Windows-Exe**: Git-Tag `v*` pushen → GitHub Actions (`.github/workflows/release.yml`) baut auf `windows-latest` per electron-builder, setzt die `desktop/package.json`-Version automatisch aus dem Tag (`vX.Y.Z` → `X.Y.Z`) und erstellt ein GitHub Release. Stabile Download-URL: `releases/latest/download/Baustift-Setup.exe`.
- **Auto-Update**: die installierte (NSIS-)Version prüft per `electron-updater` automatisch kurz nach dem Start und danach alle 4 Stunden auf neue GitHub-Releases, lädt ein gefundenes Update im Hintergrund herunter und fragt nach dem Download, ob sofort neu gestartet werden soll (sonst installiert es sich beim nächsten regulären Neustart). Manuell auslösbar über Menü „Hilfe → Nach Updates suchen". Voraussetzung: jedes Release muss über den Tag-Workflow gebaut werden, damit `latest.yml` (Update-Metadaten) mit hochgeladen wird — ein manuell erstelltes Release ohne diese Datei wird von bestehenden Installationen nicht erkannt. Die **portable** Version aktualisiert sich nicht automatisch (electron-updater unterstützt das Portable-Zielformat nicht) — dort bleibt nur der manuelle Neu-Download.
- Lokaler Test des Wrappers (Linux): `cd desktop && npm run dist:linux` → AppImage.
- PDF-Download in Electron: läuft über den nativen Download-Handler des `BrowserWindow`; Passwort-Reset-Links öffnen im System-Browser (dort Passwort setzen, danach in der App anmelden).

## Bekannte Grenzen (Stand 1.0)

- Kein öffentliches Self-Service-Registrierungsformular für neue Firmen — Onboarding läuft weiterhin über den Betreiber (siehe „Neue Firma onboarden" oben).
- RLS scoped nur per Firma, nicht zusätzlich per Niederlassung.
- Foto-Bucket (`tagesbericht-fotos`) bleibt bucket-weit statt firma-präfixiert (Bestandsdaten); der neue Dokumenten-Bucket ist von Anfang an firma-präfixiert.
- HEIC/WebP-Fotos werden im PDF-Export durch eine Hinweiszeile ersetzt (react-pdf unterstützt nur JPEG/PNG); Druckansicht im Browser zeigt sie weiterhin.
- KI-Kontext aus Baustellen-Dokumenten ist auf PDFs sowie max. 3 Dokumente/~10 MB pro Generierung begrenzt.
