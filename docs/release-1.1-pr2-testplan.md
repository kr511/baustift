# Release 1.1 – Testplan für Berichts-Workflow, Versionierung und Audit-Trail

Dieser Testplan deckt den zweiten Teil von Release 1.1 ab: die erweiterten Statusstufen des Tagesberichts (`entwurf` → `generiert` → `geprueft` → `final`), die Freigabe- und Korrektur-Aktionen, unveränderliche finalisierte Versionen, den Versions- und Aktivitätsverlauf sowie den Versions-Export als PDF und in der Druckansicht.

## Voraussetzungen

- Datenbankmigrationen bis einschließlich `0010_status_versionen_audit.sql` sind angewendet.
- Mindestens eine aktive Baustelle ist vorhanden.
- Es existiert ein Bericht im Status `entwurf` sowie ein bereits finalisierter Bericht mit Personal, Material und mindestens einem Foto.
- Für die Mandantentrennung stehen Nutzerkonten aus zwei verschiedenen Firmen (A und B) bereit.
- Test möglichst einmal im Browser und einmal in der Windows-/Electron-App durchführen.

## 1. Berichtstext erzeugt Status „generiert“

1. Einen Entwurfsbericht öffnen (`/berichte/<id>`).
2. Über „KI-Text erzeugen“ einen Berichtstext generieren oder einen Text manuell speichern.
3. Das Statusabzeichen im Kopf der Detailseite prüfen.

Erwartung: Der Status wechselt von „Entwurf“ auf „Text erstellt“ (`generiert`). Das Abzeichen ist amber umrandet, nicht blau.

## 2. Text leeren setzt zurück auf „Entwurf“

1. Bei einem Bericht im Status `generiert` den gespeicherten Berichtstext vollständig entfernen und speichern.
2. Das Statusabzeichen prüfen.

Erwartung: Der Status fällt zurück auf „Entwurf“. Es wird keine Version erzeugt.

## 3. Inhalt prüfen

1. Einen Bericht mit vorhandenem Text im Status `generiert` öffnen.
2. „Inhalt geprüft“ wählen.
3. Anschließend einen Bericht ohne Text in den Status `generiert` zu bringen versuchen und erneut prüfen.

Erwartung:

- Mit Text wechselt der Status auf „Geprüft“ (`geprueft`).
- Ohne Text erscheint der Hinweis „Erstelle oder speichere zuerst einen Berichtstext.“ und der Status bleibt unverändert.

## 4. Bericht finalisieren

1. Einen geprüften Bericht öffnen.
2. „Version 1 finalisieren“ wählen und den Bestätigungsdialog bestätigen.
3. Danach einen nur generierten (nicht geprüften) Bericht zu finalisieren versuchen.

Erwartung:

- Der geprüfte Bericht wechselt auf „Finalisiert“ (`final`), es entsteht die unveränderliche Version 1.
- Ohne vorherige Prüfung erscheint der Hinweis, dass der Bericht zuerst als geprüft markiert werden muss; es wird keine Version erzeugt.

## 5. Finalisierter Bericht ist gesperrt

1. Einen finalisierten Bericht über `/berichte/<id>/bearbeiten` zu bearbeiten versuchen und speichern.
2. Zusätzlich den Berichtstext eines finalisierten Berichts zu ändern versuchen.

Erwartung: Beide Versuche werden abgelehnt. Es erscheint der Hinweis, dass ein finalisierter Bericht nicht mehr bearbeitet werden kann; Eckdaten, Text und aktuelle Version bleiben unverändert.

## 6. Korrekturversion öffnen

1. Einen finalisierten Bericht öffnen und „Korrekturversion erstellen“ wählen.
2. Ohne Grund beziehungsweise mit weniger als fünf Zeichen „Korrektur öffnen“ wählen.
3. Danach einen konkreten Grund mit mindestens fünf Zeichen eintragen und „Korrektur öffnen“ wählen.

Erwartung:

- Bei zu kurzem Grund bleibt die Schaltfläche deaktiviert bzw. es erscheint der Hinweis, dass ein Grund mit mindestens fünf Zeichen nötig ist.
- Mit gültigem Grund wechselt der Bericht zurück auf „Text erstellt“ (`generiert`); die vorherige Version bleibt unverändert erhalten.

## 7. Erneut finalisieren erzeugt eine neue Version

1. Den in Schritt 6 geöffneten Korrekturbericht anpassen, prüfen und erneut finalisieren.
2. Den Versionsverlauf auf der Detailseite prüfen.

Erwartung: Es entsteht Version 2. Version 1 und Version 2 werden beide im Abschnitt „Unveränderliche Versionen“ mit jeweils eigenem Zeitstempel und Grund gelistet.

## 8. Unveränderliche Versionsansicht

1. Im Versionsverlauf bei einer Version „Anzeigen“ wählen (`/berichte/<id>/versionen/<n>`).
2. Den eingefrorenen Stand mit dem aktuellen Bericht vergleichen.
3. Eine nicht existierende Versionsnummer manuell in der URL aufrufen.

Erwartung:

- Die Versionsansicht zeigt den zum Zeitpunkt der Finalisierung eingefrorenen Stand, auch wenn der Bericht später korrigiert wurde.
- Der Kopf weist „Unveränderliche Version <n>“ sowie „Finalisiert am … durch …“ aus.
- Eine nicht existierende Version führt zu einer „Nicht gefunden“-Seite, nicht zu einem Fehler.

## 9. Versions-PDF exportieren

1. Im Versionsverlauf bei einer finalisierten Version „PDF“ wählen (`/api/tagesberichte/<id>/pdf?version=<n>`).
2. Zum Vergleich das PDF eines nicht finalisierten Berichts exportieren.

Erwartung:

- Das Versions-PDF entspricht dem eingefrorenen Stand und trägt den Zusatz „Version <n>“ sowie den Dateinamen-Zusatz `_V<n>`.
- Ein nicht finalisierter Bericht wird als Entwurf mit dem Dateinamen-Zusatz `_ENTWURF` exportiert.

## 10. Druckansicht mit Versionsmetadaten

1. Die Druckansicht eines finalisierten Berichts öffnen (`/berichte/<id>/druckansicht`).
2. Eine konkrete Version über `?version=<n>` aufrufen.

Erwartung: Die Druckansicht zeigt das Versionsabzeichen, den Korrektur-/Versionsgrund sowie „Finalisiert am“ und „Finalisiert durch“. Bei gewählter Version wird der eingefrorene Stand dieser Version gedruckt.

## 11. Aktivitätsverlauf

1. Auf der Detailseite den Abschnitt „Aktivitätsverlauf“ öffnen.
2. Die Einträge nach mehreren Aktionen (Text bearbeitet, geprüft, finalisiert, Korrektur, KI-Text) prüfen.

Erwartung: Alle Aktionen erscheinen chronologisch mit deutschem Aktionslabel, Zeitstempel (Europe/Berlin) und – sofern vorhanden – dem Namen der ausführenden Person.

## 12. Gleichzeitige Finalisierung

1. Denselben geprüften Bericht in zwei Tabs öffnen.
2. In beiden Tabs nahezu gleichzeitig „finalisieren“ wählen.

Erwartung: Nur eine Finalisierung ist erfolgreich und erzeugt genau eine neue Version. Der zweite Versuch scheitert sauber mit einer verständlichen Meldung; es entsteht keine doppelte Versionsnummer.

## 13. Mandantentrennung

1. Mit einem Nutzer aus Firma A einen Bericht finalisieren.
2. Mit einem Nutzer aus Firma B die URLs `/berichte/<id>/versionen/1`, `/berichte/<id>/druckansicht?version=1` und `/api/tagesberichte/<id>/pdf?version=1` des Berichts aus Firma A aufrufen.

Erwartung: Firma B erhält keinen Zugriff. Weder die Versionsansicht noch das PDF noch der Aktivitätsverlauf des fremden Berichts werden sichtbar; es werden keine Stamm-, Personal-, Material- oder Fotodaten preisgegeben.

## 14. Regression

Zusätzlich prüfen:

- Login und Passwort-Reset funktionieren.
- Neue Berichte können angelegt und Entwürfe bearbeitet werden.
- KI-Berichtsgenerierung funktioniert weiterhin.
- Berichtstext kann gespeichert werden.
- Bestehende, vor Release 1.1 finalisierte Berichte erscheinen mit Version 1 im Verlauf.
- Druckansicht und PDF-Export ohne Versionsparameter funktionieren weiterhin.
- Bestehende Fotos werden auf Detail-, Bearbeitungs- und Druckseite angezeigt.
