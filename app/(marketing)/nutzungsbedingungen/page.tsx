import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Nutzungsbedingungen | Baustift",
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
              Baustift ist ein Werkzeug für Unternehmen der Baubranche (B2B)
              zur Erstellung von Bautagesberichten. Die Nutzung ist nur
              Personen gestattet, die von ihrem Unternehmen oder von Elias
              Kümmel ein persönliches Nutzerkonto erhalten haben. Diese
              Nutzungsbedingungen gelten zusätzlich zur{" "}
              <a href="/datenschutz" className="underline">
                Datenschutzerklärung
              </a>{" "}
              und dem{" "}
              <a href="/impressum" className="underline">
                Impressum
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">2. Pflichten der Nutzer</h2>
            <p>
              Zugangsdaten sind vertraulich zu behandeln und nicht an Dritte
              weiterzugeben. Es dürfen keine rechtswidrigen, beleidigenden
              oder die Rechte Dritter verletzenden Inhalte eingegeben werden.
              Für die Richtigkeit der eingegebenen Baustellen-, Personal- und
              Materialdaten sind die Nutzer selbst verantwortlich.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">3. KI-generierte Inhalte</h2>
            <p>
              Die von der KI formulierten Bautagesberichte werden auf Basis
              der eingegebenen Stichpunkte automatisiert erstellt.{" "}
              <strong>
                Jeder generierte Bericht muss von einer verantwortlichen
                Person geprüft werden, bevor er als &bdquo;Final&ldquo;
                markiert, gedruckt, exportiert oder weitergegeben wird.
              </strong>{" "}
              Für die inhaltliche Richtigkeit und Vollständigkeit der
              generierten Texte wird keine Gewähr übernommen; die Verantwortung
              für den finalisierten Bericht liegt bei der Person, die ihn
              freigibt.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">4. Verfügbarkeit</h2>
            <p>
              Die Anwendung wird &bdquo;wie besehen&ldquo; ohne Zusicherung
              einer bestimmten Verfügbarkeit bereitgestellt. Wartungsarbeiten,
              Ausfälle von Drittdiensten (Hosting, KI-Anbieter) oder
              Störungen können die Nutzung zeitweise einschränken. Es besteht
              kein Anspruch auf eine bestimmte Reaktions- oder
              Wiederherstellungszeit (kein SLA).
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">5. Geistiges Eigentum</h2>
            <p>
              Quellcode, Design und Marke &bdquo;Baustift&ldquo; sind
              proprietär und stehen im Alleineigentum von Elias Kümmel (siehe
              Lizenzbedingungen im Quellcode-Repository). Die eingegebenen
              Berichtsdaten bleiben Eigentum des jeweiligen nutzenden
              Unternehmens.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">6. Haftung</h2>
            <p>
              Die Haftung für leicht fahrlässige Pflichtverletzungen ist
              ausgeschlossen, soweit keine wesentlichen Vertragspflichten,
              Schäden aus der Verletzung des Lebens, des Körpers oder der
              Gesundheit oder zwingende gesetzliche Haftung (z. B. nach dem
              Produkthaftungsgesetz) betroffen sind.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">7. Laufzeit und Kündigung</h2>
            <p>
              Der Zugang kann von Elias Kümmel bei Verstoß gegen diese
              Nutzungsbedingungen oder auf Wunsch des nutzenden Unternehmens
              jederzeit beendet werden. Nutzerkonten können jederzeit
              deaktiviert werden.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">8. Anwendbares Recht</h2>
            <p>
              Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts.
              Gerichtsstand ist, soweit gesetzlich zulässig, der Sitz von
              Elias Kümmel. Bei Fragen:{" "}
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
