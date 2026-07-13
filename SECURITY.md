# Sicherheit

Dieses Dokument beschreibt das Sicherheitsmodell der Tagesbericht-App, die
bewussten Design-Entscheidungen und die Betriebsanforderungen. Es ist die
Referenz, gegen die Änderungen geprüft werden sollten, damit keine der unten
genannten Schutzmaßnahmen versehentlich aufgeweicht wird.

## Schwachstelle melden

Sicherheitsprobleme bitte **nicht** über öffentliche Issues melden, sondern
direkt an eliaskummel@gmail.com. Bitte eine Beschreibung, Reproduktionsschritte
und die betroffene Version angeben.

## Vertrauensmodell

- **Ein gemeinsamer Firmen-Account** (Supabase Auth, E-Mail + Passwort). Alle
  angemeldeten Personen sind vertrauenswürdige Mitarbeitende und teilen sich den
  Datenbestand. Es gibt bewusst **keine** `auth.uid()`-Zeilentrennung zwischen
  Nutzern — das Gate ist „angemeldet sein".
- Anonyme Supabase-Auth-Nutzer sind auf allen Ebenen (Proxy, RLS, RPC)
  ausgeschlossen.

## Betriebsanforderungen (kritisch)

Diese Einstellungen liegen außerhalb des Codes und **müssen** im Supabase-Projekt
gesetzt sein — sonst ist das Vertrauensmodell wirkungslos:

- **Signups deaktiviert** und **anonyme Logins deaktiviert** im Supabase-Dashboard.
  Sonst könnte sich jede beliebige Person selbst registrieren und würde
  „authenticated".
- Starke Passwort-Richtlinie aktivieren.
- CAPTCHA erst aktivieren, nachdem das erforderliche Token in die Login-UI
  integriert ist.
- `SUPABASE_SERVICE_ROLE_KEY` niemals im Client/Frontend verwenden. Der
  Präsentations-Preflight weist service-role-Keys aktiv ab.

## Netzwerk- und Transport-Sicherheit

- **HSTS** (`max-age=63072000; includeSubDomains`) erzwingt HTTPS.
- **CSP** in Produktion mit gemeinsamer Basis (`default-src 'self'`,
  `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `upgrade-insecure-requests`; `connect-`/`img-src` nur
  `self` + das eigene Supabase-Projekt), aber zweistufigem `script-src`:
  - **Authentifizierte App-Routen** (`/berichte`, `/baustellen`,
    `/einstellungen`, `/api`): strikt **nonce-basiert**
    (`script-src 'self' 'nonce-…' 'strict-dynamic'`, **kein** `'unsafe-inline'`).
    Der Proxy erzeugt pro Request eine Nonce; Next injiziert sie in seine
    Skripte. Diese Routen werden ohnehin dynamisch gerendert.
  - **Öffentliche Routen** (Marketing, Login, Root): lenient
    (`script-src 'self' 'unsafe-inline'`), damit sie statisch/CDN-cachebar
    bleiben. Sie enthalten keine sensiblen Daten und keine Injection-Sinks.

  `style-src 'unsafe-inline'` bleibt überall bewusst erhalten (CSS-Injection ist
  gegenüber Skript-Ausführung harmlos und bewahrt die von Tailwind/Next
  injizierten Inline-Styles).
- Weitere Header: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-origin`,
  `X-Permitted-Cross-Domain-Policies: none`,
  `Referrer-Policy: strict-origin-when-cross-origin`.
- **Permissions-Policy** deaktiviert alle nicht genutzten mächtigen Features
  (Kamera, Mikrofon, Standort, Payment, USB, Serial, Bluetooth, HID, Sensoren,
  `browsing-topics` u. a.).
- **`X-Powered-By` entfernt** (kein Framework-Fingerprinting).
- Authentifizierte Antworten sind `Cache-Control: no-store` — auf geteilten
  Geräten zeigt der Zurück-Button nach dem Abmelden keine Daten mehr.

### Designentscheidung: geteilte `script-src`-Policy

Skripte werden auf den datenführenden App-Routen strikt per Nonce abgesichert,
während die statischen Marketing-/Login-Seiten `'unsafe-inline'` behalten. So
erhält die eigentliche XSS-Angriffsfläche (eingeloggte Seiten mit Berichtsdaten)
den stärksten Schutz, ohne dass die App das Static-/CDN-Caching der öffentlichen
Seiten verliert. Zusätzlich abgesichert: React escaped alle Ausgaben, es gibt
keine Injection-Sinks (siehe unten), und Framing/Objekte/Base-URI sind gesperrt.

Verifikationshinweis: Die Nonce-Injektion in eingeloggte Seiten sollte nach
Deployments einmal im Browser (DevTools-Konsole, keine CSP-Verstöße) bestätigt
werden — sie hängt vom automatischen Nonce-Handling von Next.js ab.

## Anwendungs-Ebene

- **CSRF:** Zustandsändernde `/api`-Aufrufe werden im Proxy per
  `Sec-Fetch-Site`/`Origin`-Prüfung gegen Cross-Site-Requests abgesichert
  (`lib/security/originGuard.ts`). Server Actions sind durch Next.js zusätzlich
  origin-geprüft. Session-Cookies sind `SameSite=Lax`.
- **Kein Injection-Sink:** Keine Nutzung von `dangerouslySetInnerHTML`,
  `innerHTML`, `eval`, `new Function` oder `document.write`. Angreifer- bzw.
  KI-kontrollierte Inhalte (Berichtstexte, importierte Dokumente) werden von
  React escaped gerendert → kein Stored XSS.
- **Eingabevalidierung:** Server Actions und Route Handler validieren jede
  Eingabe mit Zod (Längen, Enums, UUIDs, Array-Obergrenzen). `storage_path`
  ist streng auf den eigenen Entwurfs-Namespace gemustert.
- **Auth-Prüfung serverseitig:** Der Proxy ist nur die Navigations-Schranke;
  jeder Datenzugriff/jede Mutation ruft `getAuthenticatedClient()` erneut auf
  (Server Actions und Route Handler sind direkt erreichbar).

## Datei-Uploads

- **Foto-Upload:** direkt in einen **privaten** Supabase-Bucket mit
  MIME-Whitelist und 10-MB-Limit; RLS erlaubt Insert nur in `entwuerfe/`,
  Select nur eigene/verknüpfte Objekte, Delete nur eigene *unverknüpfte* Objekte.
- **Dokument-Import (PDF/DOCX):** serverseitige Magic-Byte-Signaturprüfung, ein
  vollständiger ZIP-Parser gegen Zip-Bombs/verschlüsselte Einträge, ein
  Dekompressions-Limit gegen Decompression-Bombs sowie ein PDF-Seitenlimit.

## Datenbank (Supabase / Postgres)

- **RLS** auf allen Tabellen; Least-Privilege-Grants (Berichtstabellen sind für
  den Client read-only, Schreibzugriffe laufen ausschließlich über RPCs).
- **RPCs** sind `SECURITY DEFINER` mit `set search_path = ''` (Schutz gegen
  search-path-Hijacking), voll qualifizierten Objektnamen, Auth-Check am Eingang,
  `auth.uid()` statt Client-Werten und `pg_advisory_xact_lock` gegen
  TOCTOU-Races beim KI-Rate-Limit. EXECUTE-Rechte sind `public`/`anon` entzogen.
- **KI-Rate-Limits:** Cooldown pro Bericht + Tageslimits, transaktional
  reserviert, bevor teure/aufwändige Verarbeitung beginnt.

## Session & Logout

- Auth-Cookies von `@supabase/ssr` sind konstruktionsbedingt **nicht HttpOnly**
  (der Browser-Client liest den Token). Das Rest-XSS-Risiko wird über CSP und die
  fehlenden Injection-Sinks adressiert.
- Logout nutzt bewusst `scope: "local"`: Beim geteilten Firmen-Account würde
  `global` alle Feldgeräte gleichzeitig abmelden.

## Abhängigkeiten & Secret-Hygiene

- `npm run security:audit` (`npm audit --omit=dev --audit-level=high`) läuft im
  CI vor jedem Release und blockiert bei hohen/kritischen Prod-Schwachstellen.
- `npm run security:secrets` (`scripts/secret-scan.mjs`) durchsucht alle
  getrackten Dateien nach echten Key-/Token-Mustern und ist Teil von
  `npm run check` (läuft damit auch im CI vor jedem Release).
- **Pre-Commit-Schutz (empfohlen):** einmalig pro Klon aktivieren mit
  `git config core.hooksPath .githooks` — dann läuft der Secret-Scan vor jedem
  Commit und verhindert, dass Zugangsdaten überhaupt in den Verlauf gelangen.

## Auditierte Angriffsflächen

Folgende Flächen wurden geprüft und als abgesichert bzw. unbedenklich bewertet:

| Fläche | Status |
| --- | --- |
| Auth-Gate (Proxy + serverseitig pro Zugriff) | abgesichert |
| CSRF auf Route Handlern | abgesichert (Origin-Guard) |
| XSS-Sinks (`dangerouslySetInnerHTML` etc.) | keine vorhanden |
| Prompt-Injection (KI-Extraktion/-Generierung) | abgesichert (Delimiter + Tool/Schema) |
| Datei-Upload (Magic-Bytes, Zip-/Decompression-Bomb) | abgesichert |
| RLS + RPC (`SECURITY DEFINER`, `search_path=''`) | abgesichert |
| Storage-Buckets (privat, MIME/Größe, Pfad-RLS) | abgesichert |
| Session/Cookies/Logout | dem Konto-Modell angemessen |
| Secret-Handling (`server-only`, Client-Bundle) | abgesichert |
| Secrets im Git (Tree + Verlauf + Inhalt) | sauber |
| SSRF (`next/image`-Optimizer) | kein Vektor |
| Egress (`VersandButtons`, `target=_blank`) | minimal, `noopener` |
| Info-Leakage (`error`/`not-found`/`manifest`) | generisch, kein Leak |
| Electron `webPreferences` | Sandbox + Isolation |
| Sicherheits-Header (Laufzeit im Prod-Build) | verifiziert |
| Abhängigkeiten (`npm audit`) | 0 Schwachstellen |

Nonce-basierte `script-src`-CSP für die App-Routen umgesetzt (siehe
„Designentscheidung: geteilte `script-src`-Policy").

## Automatisierte Prüfungen

- `npm run check` (Lint, Typecheck, Preflight-Tests, Build).
- `scripts/presentation-preflight.mjs` verifiziert gegen die Live-App u. a. die
  Sicherheits-Header, die Abwesenheit von `X-Powered-By`, deaktivierte Signups
  und dass keine Secrets ausgegeben werden.
