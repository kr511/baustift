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

### Auth: persönliche Konten (Invite-only)

Jeder Nutzer bekommt ein eigenes Konto. Es gibt **keine Selbstregistrierung** — Konten werden per Einladung angelegt:

- **Dashboard**: Authentication → Users → Invite user. `display_name`/`role` können als User-Metadata (`display_name`, `role: "admin"|"nutzer"`) mitgegeben werden, sonst greift der Fallback (E-Mail-Präfix, Rolle `nutzer`).
- **In-App**: `/admin/nutzer` (nur für Administratoren) sendet die Einladung über `lib/actions/admin.ts#inviteNutzer` mit dem Service-Role-Key.

**Signups müssen im Supabase-Dashboard deaktiviert bleiben** (Authentication → Sign In / Providers → "Allow new users to sign up" aus).

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
- **Windows-Exe**: Git-Tag `v*` pushen → GitHub Actions (`.github/workflows/release.yml`) baut auf `windows-latest` per electron-builder und erstellt ein GitHub Release. Stabile Download-URL: `releases/latest/download/Baustift-Setup.exe`.
- Lokaler Test des Wrappers (Linux): `cd desktop && npm run dist:linux` → AppImage.
- PDF-Download in Electron: läuft über den nativen Download-Handler des `BrowserWindow`; Passwort-Reset-Links öffnen im System-Browser (dort Passwort setzen, danach in der App anmelden).

## Bekannte Grenzen (Stand 1.0)

- Kein Self-Service-Onboarding weiterer Firmen (Seed-Firma ist fest in Migration `0004` verdrahtet — vor Firma Nr. 2 anpassen).
- RLS scoped nur per Firma, nicht zusätzlich per Niederlassung.
- Foto-Bucket (`tagesbericht-fotos`) bleibt bucket-weit statt firma-präfixiert (Bestandsdaten); der neue Dokumenten-Bucket ist von Anfang an firma-präfixiert.
- HEIC/WebP-Fotos werden im PDF-Export durch eine Hinweiszeile ersetzt (react-pdf unterstützt nur JPEG/PNG); Druckansicht im Browser zeigt sie weiterhin.
- KI-Kontext aus Baustellen-Dokumenten ist auf PDFs sowie max. 3 Dokumente/~10 MB pro Generierung begrenzt.
