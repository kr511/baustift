import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen | Tagesberichte",
  robots: { index: false },
};

export default function NutzungsbedingungenPage() {
  return (
    <div className="bg-blueprint">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="border-b-2 border-ink pb-4">
          <span className="label-tag">Rechtliches</span>
          <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            Nutzungsbedingungen
          </h1>
        </div>

        <div className="card ticked mt-8 space-y-6 p-6 text-sm leading-relaxed">
          <section>
            <h2 className="label-tag mb-2">1. Geltungsbereich</h2>
            <p>
              Diese Nutzungsbedingungen gelten für die Nutzung der Web-Anwendung
              und der Windows-Desktop-App &bdquo;Tagesberichte&ldquo;
              (nachfolgend &bdquo;die Anwendung&ldquo;), bereitgestellt von
              Elias Kümmel, Wallstraße 50, 06780 Zörbig (siehe{" "}
              <a href="/impressum" className="underline">
                Impressum
              </a>
              ). Quellcode und Software sind proprietär; die vollständigen
              Lizenzbedingungen sind in der{" "}
              <a
                href="https://github.com/kr511/tagesberichte/blob/main/LICENSE"
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                LICENSE-Datei
              </a>{" "}
              geregelt und Bestandteil dieser Nutzungsbedingungen.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">2. Zugang und Berechtigung</h2>
            <p>
              Die Nutzung der Anwendung ist ausschließlich Personen gestattet,
              denen der Betreiber oder ein autorisiertes Kundenunternehmen
              Zugangsdaten bereitgestellt hat. Zugangsdaten sind vertraulich zu
              behandeln und nicht an Unbefugte weiterzugeben. Der gemeinsame
              Firmen-Account darf nur für dienstliche Zwecke des jeweiligen
              Unternehmens verwendet werden.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">3. Eingegebene Inhalte</h2>
            <p>
              Nutzer sind für die Richtigkeit der von ihnen eingegebenen
              Berichtsdaten (Baustellen, Personal, Material, Stichpunkte,
              Fotos) selbst verantwortlich. Es dürfen nur Inhalte eingegeben
              werden, zu deren Verarbeitung das nutzende Unternehmen berechtigt
              ist; dies gilt insbesondere für personenbezogene Daten von
              Mitarbeitenden. Die aus den Stichpunkten von der KI erzeugten
              Berichtstexte sind vor Verwendung als &bdquo;final&ldquo; auf
              Richtigkeit zu prüfen.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">4. Keine Gewährleistung, Haftungsbeschränkung</h2>
            <p>
              Die Anwendung wird ohne jede Gewährleistung bereitgestellt, weder
              ausdrücklich noch stillschweigend, insbesondere nicht für
              ständige Verfügbarkeit oder Fehlerfreiheit. Der Betreiber haftet
              unbeschränkt nur für Vorsatz und grobe Fahrlässigkeit sowie nach
              zwingenden gesetzlichen Vorschriften (z. B. Produkthaftungsgesetz,
              Schäden an Leben, Körper oder Gesundheit). Im Übrigen ist die
              Haftung für leicht fahrlässig verursachte Schäden ausgeschlossen,
              soweit keine wesentlichen Vertragspflichten betroffen sind.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">5. Verfügbarkeit und Änderungen</h2>
            <p>
              Der Betreiber ist bemüht, die Anwendung dauerhaft verfügbar zu
              halten, übernimmt hierfür aber keine Garantie. Funktionsumfang
              und Gestaltung können angepasst werden; wesentliche Änderungen
              werden in der Anwendung oder per E-Mail angekündigt.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">6. Beendigung</h2>
            <p>
              Der Zugang kann bei Verstoß gegen diese Nutzungsbedingungen oder
              bei Beendigung der Geschäftsbeziehung mit dem jeweiligen
              Unternehmen gesperrt werden. Für den Umgang mit gespeicherten
              Berichtsdaten nach Beendigung gilt Abschnitt 6 der{" "}
              <a href="/datenschutz" className="underline">
                Datenschutzerklärung
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">7. Schlussbestimmungen</h2>
            <p>
              Es gilt deutsches Recht. Sollten einzelne Bestimmungen unwirksam
              sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
              Fragen zu diesen Nutzungsbedingungen richten Sie bitte an{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
