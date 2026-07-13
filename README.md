# Tagesberichte — Swietelsky Faber

Copyright © 2026 Elias Kümmel. Alle Rechte vorbehalten — proprietäre Software, siehe [LICENSE](./LICENSE). Dieses Repository ist öffentlich, um die Windows-Downloads (Releases) bereitzustellen; es gewährt keine Rechte am Quellcode.

Web-App, die aus Stichpunkten fertige Bautagesberichte erstellt. Poliere/Bauleiter erfassen Baustelle, Personal, Material, Wetter und ein paar Stichpunkte — die KI formuliert daraus einen einheitlichen, professionellen Tagesbericht mit Druckansicht.

## Stack

- **Next.js 16** (App Router) + React 19 + Tailwind 4
- **Supabase** — Datenbank, Auth, Foto-Storage (privater Bucket `tagesbericht-fotos`)
- **Anthropic API** (`claude-sonnet-5`) — Textgenerierung
- **Electron** (`desktop/`) — Windows-Exe als Wrapper um die gehostete App

## Setup (lokal)

```bash
npm install
cp .env.example .env.local   # echte Werte eintragen
npm run dev                  # http://localhost:3000
npm run check                # Lint, Typen und Produktions-Build prüfen
```

Benötigte Env-Vars (`.env.local`):

| Variable | Zweck |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL des Supabase-Projekts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/Anon-Key |
| `ANTHROPIC_API_KEY` | Key für die KI-Generierung (nur serverseitig) |
| `APP_URL` | Optional: öffentliche URL für den Präsentations-Preflight |

## Präsentations-Preflight

Vor einer Kundenvorführung prüft ein read-only Node-Skript die in `.env.local`
konfigurierte Umgebung. Es validiert die öffentlichen Supabase-Zugangsdaten,
DNS und Auth-Einstellungen, bestätigt API-Key und Modell über die kostenlose
Anthropic Models API und prüft bei gesetzter `APP_URL` Erreichbarkeit sowie
Security-Header der Live-App. Zugangsdaten werden dabei nie ausgegeben.

```bash
npm run preflight:presentation
```

Der Befehl endet nur bei einer vorführbereiten Umgebung mit Exit-Code `0`.
Registrierung und anonyme Supabase-Anmeldung müssen deaktiviert, E-Mail-Login
muss aktiviert sein. Die isolierten Mock-Tests laufen mit `npm run test:preflight`.

## Datenbank

Migrationen liegen in `supabase/migrations/` und werden in Reihenfolge auf das Supabase-Projekt angewendet:

- `0001_init.sql` — Tabellen (baustellen, tagesberichte, personal, material, fotos), Storage-Bucket, RLS
- `0002_auth_policies.sql` — ersetzt die offenen v1-Policies durch `authenticated`-Policies
- `0003_ki_rate_limit_und_upload_limits.sql` — erster KI-Cooldown und Upload-Limits
- `0004_dokument_import_rate_limit.sql` — Ausgangsschema für Dokumentimporte
- `20260713083654_harden_reports_auth_and_ai_limits.sql` — transaktionales Speichern, unveränderliche finale Berichte, atomare KI-Limits und gehärtete Storage-Policies
- `20260713140002_optimize_rls_and_fk_indexes.sql` — RLS-Auth-Helfer als InitPlan, Fremdschlüssel-Indizes und explizite Sperr-Policies für die internen KI-Ledger

Vor dem ersten Deployment die Supabase CLI initialisieren und mit dem vorgesehenen Projekt verbinden:

```bash
npx supabase init
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
```

Vor `db push` immer ein aktuelles Backup sicherstellen und den Dry-Run prüfen. Die letzte Migration und der aktuelle Web-Code müssen gemeinsam ausgerollt werden: Die Migration sperrt die alten Schreibpfade, während der Web-Code die neuen RPCs voraussetzt.

Auth: ein gemeinsamer Firmen-Account (Supabase Auth, E-Mail + Passwort). **Signups und anonyme Logins müssen im Supabase-Dashboard deaktiviert sein**. Empfohlen sind außerdem eine starke Passwort-Richtlinie und die Option für sichere Passwortänderungen. CAPTCHA darf erst nach Integration des erforderlichen Tokens in die Login-UI aktiviert werden.

Die App startet ohne Beispiel-/Demodaten: Baustellen und Berichte werden ausschließlich über die App angelegt.

## Struktur

- `app/(marketing)/` — öffentliche Landingpage unter `/`
- `app/(app)/berichte`, `app/(app)/baustellen` — die eigentliche App (Login erforderlich)
- `app/login/` — Login-Seite
- `proxy.ts` — Session-Refresh + Auth-Gate (Next 16: `proxy.ts` statt `middleware.ts`)
- `lib/actions/` — Server Actions (CRUD), `lib/anthropic/` — KI-Generierung
- `desktop/` — Electron-Wrapper (eigenes `package.json`)

## Deployment

- **Web**: Vercel. Env-Vars am Vercel-Projekt setzen, Supabase Auth Site-URL auf die Produktions-Domain stellen und nach dem Deployment Login sowie einen vollständigen Berichtslauf prüfen.
- **Windows-Exe**: Git-Tag `v*` pushen → GitHub Actions (`.github/workflows/release.yml`) prüft zuerst die Web-App, baut danach auf `windows-latest` per electron-builder und erstellt ein GitHub Release. Stabile Download-URL: `releases/latest/download/Tagesberichte-Setup.exe`.
- Lokaler Test des Wrappers (Linux): `cd desktop && npm run dist:linux` → AppImage.
