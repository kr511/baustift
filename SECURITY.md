# Sicherheit

Dieses Dokument beschreibt das Sicherheitsmodell von Baustift, die bewussten
Design-Entscheidungen und die Betriebsanforderungen. Es ist die Referenz, gegen
die Änderungen geprüft werden sollten, damit keine der unten genannten
Schutzmaßnahmen versehentlich aufgeweicht wird.

## Schwachstelle melden

Sicherheitsprobleme bitte **nicht** über öffentliche Issues melden, sondern
direkt an eliaskummel@gmail.com. Bitte eine Beschreibung, Reproduktionsschritte
und die betroffene Version angeben.

## Vertrauensmodell (mandantenfähig)

Baustift ist eine **Multi-Tenant-SaaS**: mehrere Firmen teilen sich dieselbe
Instanz, sehen aber ausschließlich ihre eigenen Daten.

- Jede angemeldete Person hat ein **Profil** (`public.profiles`), das sie genau
  einer **Firma** (`firma_id`) zuordnet.
- Die Mandantentrennung wird **in der Datenbank per Row Level Security (RLS)**
  erzwungen, nicht im App-Code: Jede fachliche Tabelle (`baustellen`,
  `tagesberichte`, `tagesbericht_personal/-material/-fotos`, Vorlagen,
  KI-Kontextdokumente) hat Policies der Form `firma_id = public.get_user_firma_id()`
  (siehe `supabase/migrations/0006_rls_firma_scope.sql`). Kind-Tabellen prüfen die
  Zugehörigkeit über ihren Tagesbericht.
- `get_user_firma_id()` leitet die Firma **serverseitig aus `auth.uid()` → Profil**
  ab, nie aus Client-Eingaben. Eine Person ohne Profil erhält `null` → alle
  Policies werden `false` → sie sieht leere Listen statt fremder Daten (kein
  Fehler, kein Leak).
- Anonyme Supabase-Auth-Nutzer sind ausgeschlossen (kein Profil → keine Firma).

## Betriebsanforderungen (kritisch)

Diese Einstellungen liegen außerhalb des Codes und **müssen** im Supabase-Projekt
gesetzt sein — sonst ist das Vertrauensmodell wirkungslos:

- **Anonyme Logins deaktiviert.** Neue Nutzer entstehen ausschließlich über
  Einladungen (die ein Profil mit `firma_id` anlegen), nicht über offene Signups.
- Starke Passwort-Richtlinie aktivieren.
- **`SUPABASE_SERVICE_ROLE_KEY` niemals im Client/Frontend verwenden.** Der Key
  umgeht RLS vollständig. Er wird nur im Service-Role-Client
  (`lib/supabase/admin.ts`) gelesen, der über `import "server-only"` gegen
  versehentliche Client-Bundle-Einbindung abgesichert ist, und hat bewusst kein
  `NEXT_PUBLIC_`-Prefix.

## Netzwerk- und Transport-Sicherheit

- **HSTS** (`max-age=63072000; includeSubDomains`) erzwingt HTTPS.
- **Zweistufige CSP** (nur in Produktion), gemeinsame Basis: `default-src 'self'`,
  `object-src 'none'`, `frame-ancestors 'none'`, `base-uri 'self'`,
  `form-action 'self'`, `upgrade-insecure-requests`; `img-`/`connect-src` nur
  `self` + das eigene Supabase-Projekt (inkl. Realtime-WebSocket). Zweistufig im
  `script-src`:
  - **Authentifizierte App-Routen** (`/berichte`, `/baustellen`, `/konto`,
    `/admin`, `/api`): strikt **nonce-basiert**
    (`script-src 'self' 'nonce-…' 'strict-dynamic'`, **kein** `'unsafe-inline'`).
    Der Proxy (`proxy.ts`) erzeugt pro Request eine Nonce, legt sie als
    Request-Header ab (Next injiziert sie beim SSR in seine Skripte) und erzwingt
    die Policy als Antwort-Header. Diese Routen werden ohnehin dynamisch gerendert.
  - **Öffentliche Routen** (Marketing, Login, Auth, Root): lenient
    (`script-src 'self' 'unsafe-inline'`) via `next.config.ts`, damit sie
    statisch/CDN-cachebar bleiben. Sie führen keine sensiblen Daten und haben
    keine Injection-Sinks.

  `style-src 'unsafe-inline'` bleibt überall bewusst erhalten (CSS-Injection ist
  gegenüber Skript-Ausführung harmlos und bewahrt die von Tailwind/Next
  injizierten Inline-Styles).
- Weitere Header: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`; in Produktion zusätzlich
  `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-origin`,
  `X-Permitted-Cross-Domain-Policies: none`.
- **Permissions-Policy** deaktiviert alle nicht genutzten mächtigen Features
  (Kamera, Mikrofon, Standort, Payment, USB, Serial, Bluetooth, HID, Sensoren,
  `browsing-topics` u. a.). Foto-Aufnahme läuft über `<input capture>` (native
  Kamera-App), nicht `getUserMedia`.
- **`X-Powered-By` entfernt** (`poweredByHeader: false`) — kein
  Framework-Fingerprinting.
- Authentifizierte Antworten sind `Cache-Control: no-store, must-revalidate` — auf
  geteilten Baustellen-Geräten zeigt der Zurück-Button nach dem Abmelden keine
  Daten mehr.

## Anwendungs-Ebene

- **CSRF:** Zustandsändernde `/api`-Aufrufe werden im Proxy per
  `Sec-Fetch-Site`/`Origin`-Prüfung gegen Cross-Site-Requests abgesichert
  (`lib/security/originGuard.ts`), bevor Cookies gelesen oder Supabase
  kontaktiert werden. Sichere Methoden (GET/HEAD/OPTIONS) sind ausgenommen.
  Server Actions sind durch Next.js zusätzlich origin-geprüft.
- **Auth-Prüfung serverseitig:** Der Proxy ist nur die Navigations-Schranke; die
  eigentliche Autorisierung liegt in der Datenbank (RLS). Jeder Datenzugriff geht
  über einen an die Session gebundenen Supabase-Client
  (`lib/supabase/server.ts`), sodass RLS greift.
- **Kein Injection-Sink:** Keine Nutzung von `dangerouslySetInnerHTML`,
  `innerHTML`, `eval`, `new Function` oder `document.write`. Nutzer- bzw.
  KI-kontrollierte Inhalte werden von React escaped gerendert → kein Stored XSS.

## KI-Generierung (Anthropic)

- **Prompt-Injection-Abwehr (OWASP LLM01):** Die frei eingegebenen Stichpunkte
  werden vor dem Senden an das Modell als klar abgegrenzte Daten gekapselt
  (`lib/anthropic/untrusted.ts`, `<stichpunkte>…</stichpunkte>`), eingebettete
  schließende Delimiter werden neutralisiert (Ausbruch-Schutz), und der
  System-Prompt weist das Modell an, diesen Bereich als Inhalt und **niemals als
  Anweisung** zu behandeln.
- **Datenschutz:** Mitarbeiternamen verlassen die App nie Richtung KI —
  `pseudonymisierePersonal()` ersetzt sie vor dem Prompt durch „Mitarbeiter N".
- **KI-Rate-Limits:** Cooldown pro Bericht + Tageslimit werden **transaktional in
  einer DB-Funktion** reserviert (`reserviere_ki_generierung`), bevor die teure
  Anthropic-Anfrage startet — parallele Tabs können keine Doppelgenerierung
  auslösen.
- **Secret-Grenze:** `ANTHROPIC_API_KEY` hat kein `NEXT_PUBLIC_`-Prefix und wird
  nur im serverseitigen Client (`lib/anthropic/client.ts`) gelesen; in
  Client-Bundles ersetzt Next den Wert durch `undefined`.
  *Offener Punkt:* Ein Client-Component-Modul importiert derzeit den
  Konstanten-Export `STIL_VORLAGEN_MAX` aus `lib/anthropic/generateBericht.ts` und
  zieht damit den Anthropic-Client transitiv ins Client-Bundle (nur Code, kein
  Secret-Wert). Empfehlung: die Konstante in ein Modul ohne Server-Abhängigkeiten
  auslagern und `import "server-only"` in `client.ts` wieder aktivieren.

## Abhängigkeiten & Secret-Hygiene

- **Secret-Scanner:** `npm run security:secrets` (`scripts/secret-scan.mjs`)
  durchsucht alle getrackten Textdateien nach echten Key-/Token-Mustern
  (Anthropic, Supabase, JWT/service-role, PEM, AWS, GitHub, Slack) und ist als
  Gate in der CI (`.github/workflows/ci.yml`) verdrahtet.
- **Pre-Commit-Schutz (empfohlen):** einmalig pro Klon aktivieren mit
  `git config core.hooksPath .githooks` — dann läuft der Secret-Scan vor jedem
  Commit und verhindert, dass Zugangsdaten überhaupt in den Verlauf gelangen.
- `.env*` ist per `.gitignore` ausgeschlossen; nur `.env.example` (reine
  Platzhalter) ist eingecheckt.

## Session & Logout

- Auth-Cookies von `@supabase/ssr` sind konstruktionsbedingt **nicht HttpOnly**
  (der Browser-Client liest den Token). Das Rest-XSS-Risiko wird über die
  nonce-basierte CSP und die fehlenden Injection-Sinks adressiert.

## Auditierte Angriffsflächen

| Fläche | Status |
| --- | --- |
| Mandantentrennung (RLS auf `firma_id`) | abgesichert (DB-seitig erzwungen) |
| Auth-Gate (Proxy + RLS pro Zugriff) | abgesichert |
| CSRF auf Route Handlern | abgesichert (Origin-Guard im Proxy) |
| XSS-Sinks (`dangerouslySetInnerHTML` etc.) | keine vorhanden |
| Prompt-Injection (KI-Generierung) | abgesichert (Delimiter + System-Prompt) |
| Sicherheits-Header / CSP (Prod-Build) | verifiziert (Laufzeit) |
| Secret-Handling (service-role `server-only`, kein Client-Bundle) | abgesichert |
| Anthropic-Client im Client-Bundle | offener Punkt (Code, kein Secret-Wert) |
| Secrets im Git (getrackte Dateien) | Scanner + optionaler Pre-Commit-Hook |
