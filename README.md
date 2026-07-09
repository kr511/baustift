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
```

Benötigte Env-Vars (`.env.local`):

| Variable | Zweck |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL des Supabase-Projekts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/Anon-Key |
| `ANTHROPIC_API_KEY` | Key für die KI-Generierung (nur serverseitig) |

## Datenbank

Migrationen liegen in `supabase/migrations/` und werden in Reihenfolge auf das Supabase-Projekt angewendet:

- `0001_init.sql` — Tabellen (baustellen, tagesberichte, personal, material, fotos), Storage-Bucket, RLS
- `0002_auth_policies.sql` — ersetzt die offenen v1-Policies durch `authenticated`-Policies

Auth: ein gemeinsamer Firmen-Account (Supabase Auth, E-Mail + Passwort). **Signups müssen im Supabase-Dashboard deaktiviert sein** (Authentication → Sign In / Providers → "Allow new users to sign up" aus).

## Struktur

- `app/(marketing)/` — öffentliche Landingpage unter `/`
- `app/(app)/berichte`, `app/(app)/baustellen` — die eigentliche App (Login erforderlich)
- `app/login/` — Login-Seite
- `proxy.ts` — Session-Refresh + Auth-Gate (Next 16: `proxy.ts` statt `middleware.ts`)
- `lib/actions/` — Server Actions (CRUD), `lib/anthropic/` — KI-Generierung
- `desktop/` — Electron-Wrapper (eigenes `package.json`)

## Deployment

- **Web**: Vercel. Env-Vars am Vercel-Projekt setzen, Supabase Auth Site-URL auf die Produktions-Domain stellen.
- **Windows-Exe**: Git-Tag `v*` pushen → GitHub Actions (`.github/workflows/release.yml`) baut auf `windows-latest` per electron-builder und erstellt ein GitHub Release. Stabile Download-URL: `releases/latest/download/Tagesberichte-Setup.exe`.
- Lokaler Test des Wrappers (Linux): `cd desktop && npm run dist:linux` → AppImage.
