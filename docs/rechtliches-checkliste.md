# Rechtliche Checkliste — Release 1.0

Interner Tracker, keine Rechtsberatung. Die Texte in `app/(marketing)/datenschutz`
und `app/(marketing)/nutzungsbedingungen` sind fundierte Entwürfe — vor dem
produktiven Einsatz mit echten Kundendaten anwaltlich prüfen lassen,
insbesondere für den Einsatz bei weiteren Firmen/Niederlassungen.

## Verträge mit Dienstleistern (Auftragsverarbeitung, Art. 28 DSGVO)

- [ ] **Supabase**: DPA im Supabase-Dashboard akzeptiert (Organization Settings
      → Legal Documents). Serverstandort für die Datenbank auf EU (Frankfurt)
      geprüft.
- [ ] **Vercel**: DPA abgeschlossen (Vercel Dashboard → Legal).
- [ ] **Anthropic**: Commercial Terms of Service + Data Processing Addendum
      geprüft/unterzeichnet (Anthropic Console → Legal/Compliance). Klären:
      Datenaufbewahrungsdauer der API-Anfragen, Trainings-Ausschluss
      schriftlich bestätigt.

## Namensnutzung / Marke

- [ ] **Schriftliche Freigabe von Swietelsky Faber** für die Nutzung von
      Firmenname, Wordmark und Erwähnung in App-UI, Druckansicht, PDF-Export
      und KI-Prompt einholen (Blocker für den produktiven Einsatz mit dem
      echten Kundennamen — nicht für den Code selbst, der Name ist
      konfigurierbar in `firmen.name`/`firmen.wordmark`).
- [ ] Klären, ob Swietelsky Faber eigene Vorgaben zur Logo-/Wordmark-Nutzung
      hat (aktuell reiner Text, kein Bild-Logo eingebunden).

## Onboarding weiterer Firmen (Expansion über Swietelsky Faber hinaus)

- [ ] Für jede neu onboardete Firma: eigenes AV-Vertrag-Exemplar (siehe unten)
      abschließen, bevor der erste Nutzer eingeladen wird.
- [ ] Vor der ersten Firma außerhalb von Swietelsky Faber: eigene
      Nutzungsbedingungen/Preismodell klären (aktuell nicht vertraglich
      geregelt, welche Konditionen für weitere Kunden gelten).
- [ ] Technischer Ablauf zum Onboarden steht im README („Neue Firma
      onboarden") — bewusst nur durch den Betreiber (Elias), kein
      öffentliches Self-Service-Formular.

## Auftragsverhältnis Betreiber ↔ Kunde

- [ ] **AV-Vertrag zwischen Elias Kümmel (Auftragsverarbeiter) und
      Swietelsky Faber (Verantwortlicher)** abschließen — die Firma ist
      datenschutzrechtlich Verantwortlicher für die Personal-/Berichtsdaten
      ihrer Mitarbeitenden, Baustift verarbeitet in ihrem Auftrag.
- [ ] Vertrag/Vereinbarung zur Nutzung (Nutzungsbedingungen als Anhang,
      Haftungsregelung, Preismodell falls vorhanden) mit dem Kunden fixieren.

## Supabase-Konfiguration (Dashboard, nicht Code)

- [ ] „Allow new users to sign up" weiterhin deaktiviert (Authentication →
      Sign In / Providers) — Invite-only bleibt Pflicht.
- [ ] E-Mail-Templates „Invite user" und „Reset Password" so angepasst, dass
      der Link auf `/auth/confirm?token_hash={{ .TokenHash }}&type=...&next=...`
      zeigt (siehe `app/auth/confirm/route.ts`).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ist nur serverseitig (Vercel Env, nicht
      `NEXT_PUBLIC_*`) gesetzt.
- [ ] Rate-Limits für Auth-E-Mails im Dashboard geprüft (Standard reicht bei
      erwarteter Nutzerzahl i. d. R. aus).

## Impressum / Datenschutz — Vollständigkeitscheck

- [ ] Anschrift und Kontaktdaten im Impressum aktuell.
- [ ] Datenschutzerklärung nennt alle tatsächlich genutzten Unterauftrags-
      verarbeiter korrekt (bei Wechsel des Hosting-/KI-Anbieters aktualisieren).
- [ ] Löschkonzept für Berichtsdaten nach Vertragsende mit einer Firma
      dokumentieren (aktuell nur als Absichtserklärung in der
      Datenschutzerklärung, Punkt 7).
