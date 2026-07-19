# Release 1.1 – Testplan für Vorlagen und lokales Autosave

Dieser Testplan deckt den ersten Teil von Release 1.1 ab: Berichtsvorlagen, lokale Zwischenspeicherung, Wiederherstellung und Formular-UX.

## Voraussetzungen

- Datenbankmigrationen bis einschließlich `0009_tagesberichte_sicher_und_atomisch.sql` sind angewendet.
- Mindestens eine aktive Baustelle ist vorhanden.
- Es existieren ein Entwurfsbericht und ein finalisierter Bericht mit Personal, Material und mindestens einem Foto.
- Test möglichst einmal im Browser und einmal in der Windows-/Electron-App durchführen.

## 1. Neuer Bericht – lokales Autosave

1. `/berichte/neu` öffnen.
2. Baustelle, Wetter, Personal, Material und Stichpunkte eintragen.
3. Prüfen, dass zunächst „Wird lokal gespeichert …“ und danach „Lokal gespeichert …“ erscheint.
4. Seite neu laden.
5. Prüfen, dass ein lokaler Entwurf angeboten wird.
6. „Entwurf wiederherstellen“ wählen.
7. Prüfen, dass Baustelle, Datum, Wetter, Personal, Material und Stichpunkte vollständig wiederhergestellt werden.

Erwartung: Keine Eingabe außer Fotos geht verloren.

## 2. Entwurf verwerfen

1. Einen lokalen Entwurf erzeugen und die Seite neu laden.
2. „Entwurf verwerfen“ wählen.
3. Seite erneut neu laden.

Erwartung: Der verworfene Stand wird nicht erneut angeboten.

## 3. Fotos

1. Einen Bericht mit mindestens einem Foto beginnen.
2. Weitere Text- und Listeneingaben vornehmen.
3. Seite neu laden und den lokalen Entwurf wiederherstellen.

Erwartung: Textdaten werden wiederhergestellt. Das Foto selbst wird nicht aus `localStorage` wiederhergestellt; die Oberfläche weist darauf hin.

## 4. Validierungsfehler

1. Einen neuen Bericht ausfüllen, aber ein Pflichtfeld leeren.
2. „Tagesbericht speichern“ wählen.
3. Die Validierungsfehlermeldung prüfen.
4. Seite neu laden.

Erwartung: Der lokale Entwurf bleibt nach dem fehlgeschlagenen Serverversuch erhalten und kann wiederhergestellt werden.

## 5. Erfolgreiches Speichern

1. Einen vollständigen neuen Bericht ausfüllen.
2. Warten, bis der lokale Speicherstatus erfolgreich ist.
3. Bericht speichern.
4. Prüfen, dass auf die Detailseite des neuen Berichts navigiert wird.
5. `/berichte/neu` erneut öffnen.

Erwartung: Der zuvor erfolgreich gespeicherte lokale Entwurf wurde gelöscht und erscheint nicht erneut.

## 6. Bestehenden Bericht bearbeiten

1. Einen Entwurfsbericht öffnen und „Bearbeiten“ wählen.
2. Mehrere Angaben ändern und die lokale Speicherung abwarten.
3. Seite neu laden und den lokalen Entwurf wiederherstellen.
4. Änderungen anschließend erfolgreich speichern.
5. Bearbeitungsseite erneut öffnen.

Erwartung: Nach erfolgreicher Serverspeicherung wird kein veralteter lokaler Stand angeboten.

## 7. Bericht als Vorlage verwenden

1. Einen bestehenden Bericht öffnen.
2. „Als Vorlage“ wählen.
3. Personal und Material aktiviert lassen; Wetter und Stichpunkte deaktiviert lassen.
4. „Neuen Entwurf öffnen“ wählen.

Erwartung:

- Baustelle wird übernommen.
- Datum ist das heutige Datum.
- Personal und Material werden übernommen.
- Wetter und Stichpunkte bleiben leer.
- Fotos und KI-Berichtstext werden nicht übernommen.
- Der neue Bericht ist noch nicht gespeichert und bleibt ein Entwurf.

Danach den Vorgang wiederholen und Wetter beziehungsweise Stichpunkte bewusst aktivieren.

## 8. Ursprungsbericht bleibt unverändert

1. Einen Bericht als Vorlage verwenden.
2. Im neuen Formular alle übernommenen Werte verändern.
3. Den ursprünglichen Bericht erneut öffnen.

Erwartung: Der ursprüngliche Bericht wurde nicht verändert.

## 9. Mandantentrennung

1. Mit einem Nutzer aus Firma A einen Bericht anlegen.
2. Die URL `/berichte/<id>/duplizieren` mit einem Nutzer aus Firma B aufrufen.

Erwartung: Der Bericht ist nicht erreichbar; es werden weder Stammdaten noch Personal-, Material- oder Fotodaten sichtbar.

## 10. Mobile Darstellung

Auf einem Smartphone oder mit schmalem Browserfenster prüfen:

- Formularfelder laufen nicht horizontal aus dem Bildschirm.
- Personal- und Materialzeilen bleiben bedienbar.
- Entfernen- und Hinzufügen-Schaltflächen sind ausreichend groß.
- Wiederherstellungsdialog und Vorlagenauswahl sind vollständig erreichbar.
- Speichern-Schaltfläche ist eindeutig sichtbar.

## 11. Mehrere Tabs

1. Dasselbe Bearbeitungsformular in zwei Tabs öffnen.
2. In Tab A Änderungen eingeben und lokale Speicherung abwarten.
3. Tab B neu laden.

Erwartung: Tab B erkennt den neueren lokalen Stand und überschreibt Serverdaten nicht automatisch. Für Release 1.1 PR 1 ist noch keine komplexe Echtzeit-Konfliktauflösung vorgesehen.

## 12. Regression

Zusätzlich prüfen:

- Login und Passwort-Reset funktionieren.
- Baustellen können angelegt und bearbeitet werden.
- KI-Berichtsgenerierung funktioniert weiterhin.
- Berichtstext kann gespeichert werden.
- Finalisierung funktioniert weiterhin.
- Druckansicht und PDF-Export funktionieren.
- Bestehende Fotos werden auf Detail- und Bearbeitungsseite angezeigt.
