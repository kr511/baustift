import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Impressum | Baustift",
  robots: { index: false },
};

export default function ImpressumPage() {
  return (
    <div className="bg-blueprint">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="border-b-2 border-ink pb-4">
          <span className="label-tag">Rechtliches</span>
          <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            Impressum
          </h1>
        </div>

        <div className="card ticked mt-8 space-y-6 p-6 text-sm leading-relaxed">
          <section>
            <h2 className="label-tag mb-2">Angaben gemäß § 5 DDG</h2>
            <p>
              Elias Kümmel
              <br />
              Wallstraße 50
              <br />
              06780 Zörbig
              <br />
              Deutschland
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">Kontakt</h2>
            <p>
              E-Mail:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
                {CONTACT_EMAIL}
              </a>
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">Verantwortlich für den Inhalt</h2>
            <p>Elias Kümmel (Anschrift wie oben)</p>
          </section>

          <section>
            <h2 className="label-tag mb-2">Urheberrecht</h2>
            <p>
              Die Software &bdquo;Baustift&ldquo;, ihr Quellcode, das
              Design und alle Inhalte dieser Website sind urheberrechtlich
              geschützt. Alle Rechte liegen bei Elias Kümmel. Vervielfältigung,
              Bearbeitung oder Verbreitung außerhalb der Grenzen des
              Urheberrechts bedürfen der schriftlichen Zustimmung.
            </p>
          </section>

          <section>
            <h2 className="label-tag mb-2">Haftung für Inhalte</h2>
            <p>
              Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt.
              Für Richtigkeit, Vollständigkeit und Aktualität wird keine
              Gewähr übernommen.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
