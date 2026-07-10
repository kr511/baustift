import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Datenschutzerklärung | Tagesberichte",
  robots: { index: false },
};

export default function DatenschutzPage() {
  return (
    <div className="bg-blueprint">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="border-b-2 border-ink pb-4">
          <span className="label-tag">Rechtliches</span>
          <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            Datenschutzerklärung
          </h1>
        </div>

        <div className="card ticked mt-8 space-y-6 p-6 text-sm leading-relaxed">
          <section>
            <h2 className="label-tag mb-2">1. Verantwortlicher</h2>
            <p>
              Elias Kümmel, Wallstraße 50, 06780 Zörbig, Deutschland
              <br />
              E-Mail:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">2. Verarbeitete Daten</h2>
            <p>
              Beim Besuch dieser Website werden technisch notwendige Daten
              (IP-Adresse, Zeitpunkt, aufgerufene Seite) in Server-Logs
              verarbeitet. Bei Nutzung der Anwendung (Login-Bereich) werden
              zusätzlich verarbeitet: Zugangsdaten (E-Mail-Adresse),
              Sitzungs-Cookies sowie die von Nutzern eingegebenen
              Berichtsdaten (Baustellen, Namen und Arbeitsstunden von
              Personal, Material, Stichpunkte, Fotos).
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">3. Zwecke und Rechtsgrundlagen</h2>
            <p>
              Die Verarbeitung erfolgt zur Bereitstellung der Website und der
              Anwendung (Art. 6 Abs. 1 lit. b DSGVO), zur Gewährleistung der
              Sicherheit (Art. 6 Abs. 1 lit. f DSGVO) sowie zur Erstellung
              von Tagesberichten im Auftrag des jeweiligen Unternehmens.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">4. Cookies</h2>
            <p>
              Es werden ausschließlich technisch notwendige Cookies für die
              Anmeldung (Sitzungsverwaltung) gesetzt. Es findet kein Tracking
              und keine Analyse statt.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">5. Empfänger und Auftragsverarbeiter</h2>
            <p>
              Hosting der Website: Vercel Inc. (USA). Datenbank und
              Dateispeicher: Supabase (Serverstandort Frankfurt am Main,
              EU). KI-Textgenerierung: Anthropic PBC (USA) — zur Generierung
              werden die eingegebenen Berichtsdaten (Stichpunkte, Personal,
              Material, Wetter) an die Anthropic-API übermittelt. Mit den
              Dienstleistern bestehen Auftragsverarbeitungsverträge; für
              Übermittlungen in die USA stützen sich die Anbieter auf das
              EU-US Data Privacy Framework bzw. Standardvertragsklauseln.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">6. Speicherdauer</h2>
            <p>
              Berichtsdaten werden gespeichert, solange das nutzende
              Unternehmen sie benötigt, und auf Anforderung gelöscht.
              Server-Logs werden nach kurzer Zeit automatisch gelöscht.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">7. Ihre Rechte</h2>
            <p>
              Sie haben das Recht auf Auskunft, Berichtigung, Löschung,
              Einschränkung der Verarbeitung, Datenübertragbarkeit und
              Widerspruch (Art. 15–21 DSGVO) sowie das Recht auf Beschwerde
              bei einer Datenschutz-Aufsichtsbehörde. Wenden Sie sich dazu an
              die oben genannte E-Mail-Adresse.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
