import Link from "next/link";
import Image from "next/image";
import {
  DOWNLOAD_URL_WINDOWS,
  DOWNLOAD_URL_WINDOWS_PORTABLE,
} from "@/lib/config";

const schritte = [
  {
    nr: "01",
    titel: "Stichpunkte erfassen",
    text: "Baustelle wählen, Wetter setzen, Personal und Material eintragen. Dazu ein paar lose Stichpunkte, was heute passiert ist — mehr nicht.",
  },
  {
    nr: "02",
    titel: "KI formuliert den Bericht",
    text: "Ein Klick, und aus den Stichpunkten wird ein vollständiger, sachlicher Bautagesbericht. Einheitlich formuliert, egal wer ihn anlegt.",
  },
  {
    nr: "03",
    titel: "Prüfen, finalisieren, drucken",
    text: "Text gegenlesen, bei Bedarf anpassen, als final markieren. Die Druckansicht liefert das fertige Dokument für Ordner oder PDF.",
  },
];

const funktionen = [
  {
    titel: "Baustellenverwaltung",
    text: "Alle Baustellen mit Adresse, Auftraggeber und Status an einem Ort. Berichte sind immer der richtigen Baustelle zugeordnet.",
  },
  {
    titel: "Personal & Stunden",
    text: "Wer war da, wie lange, mit welcher Tätigkeit — pro Bericht erfasst und sauber im Bericht ausgewiesen.",
  },
  {
    titel: "Material & Geräte",
    text: "Verbautes Material und eingesetzte Geräte mit Menge dokumentiert, direkt im Tagesbericht.",
  },
  {
    titel: "Fotodokumentation",
    text: "Fotos vom Bautenstand direkt am Bericht. Sicher gespeichert, nur für angemeldete Nutzer zugänglich.",
  },
  {
    titel: "Druckansicht",
    text: "Ein Klick, fertiges Dokument: saubere Druckansicht für Papier oder PDF, ohne Nachformatieren.",
  },
  {
    titel: "Entwurf → Final",
    text: "Berichte bleiben Entwurf, bis sie geprüft sind. Finalisierte Berichte sind eindeutig gekennzeichnet.",
  },
];

const screenshots = [
  { src: "/screenshots/uebersicht.png", alt: "Berichte-Übersicht", label: "Übersicht" },
  { src: "/screenshots/bericht.png", alt: "Bericht mit KI-generiertem Text", label: "Bericht" },
  { src: "/screenshots/druckansicht.png", alt: "Druckansicht eines Tagesberichts", label: "Druckansicht" },
];

export default function LandingPage() {
  return (
    <div className="bg-blueprint">
      {/* Hero */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
          <span className="label-tag">Für Baufirmen und Poliere</span>
          <h1 className="font-display mt-3 max-w-3xl text-5xl leading-none font-bold tracking-tight sm:text-7xl">
            Vom Stichpunkt zum fertigen Bautagesbericht.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-ink-soft">
            Personal, Material, Wetter und ein paar Stichpunkte genügen — die
            KI formuliert daraus einen vollständigen, einheitlichen
            Tagesbericht. Druckfertig in Minuten statt Feierabend am
            Schreibtisch.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={DOWNLOAD_URL_WINDOWS} className="btn-primary">
              Für Windows herunterladen
            </a>
            <Link href="/berichte" className="btn-secondary">
              Im Browser öffnen
            </Link>
          </div>
        </div>
      </section>

      {/* Problem / Lösung */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2">
          <div className="card ticked p-6">
            <span className="label-tag text-brick">Ohne das Tool</span>
            <p className="mt-3 text-ink-soft">
              Nach zehn Stunden Baustelle noch Berichte tippen. Jeder schreibt
              anders, manches fehlt, manches ist unleserlich — und am Ende
              kostet die Dokumentation den Feierabend.
            </p>
          </div>
          <div className="card ticked p-6">
            <span className="label-tag text-safety-green">Mit dem Tool</span>
            <p className="mt-3 text-ink-soft">
              Stichpunkte reinwerfen, generieren, prüfen, fertig. Jeder
              Bericht klingt gleich professionell, nichts geht verloren, und
              die Dokumentation ist in Minuten erledigt.
            </p>
          </div>
        </div>
      </section>

      {/* So funktioniert's */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="label-tag">Ablauf</span>
          <h2 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            So funktioniert&rsquo;s
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {schritte.map((schritt) => (
              <div key={schritt.nr} className="card ticked p-6">
                <span className="font-display text-4xl font-bold text-amber">
                  {schritt.nr}
                </span>
                <h3 className="font-display mt-2 text-2xl font-bold">
                  {schritt.titel}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">{schritt.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funktionen */}
      <section id="funktionen" className="border-b-2 border-ink scroll-mt-4">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="label-tag">Im Detail</span>
          <h2 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            Funktionen
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {funktionen.map((funktion) => (
              <div key={funktion.titel} className="card p-5">
                <h3 className="font-display text-xl font-bold">
                  {funktion.titel}
                </h3>
                <p className="mt-2 text-sm text-ink-soft">{funktion.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="border-b-2 border-ink">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <span className="label-tag">Einblick</span>
          <h2 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            Die App im Einsatz
          </h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {screenshots.map((shot) => (
              <figure key={shot.src} className="card ticked p-3">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={1280}
                  height={800}
                  className="w-full border border-line"
                />
                <figcaption className="label-tag mt-2 block">
                  {shot.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Download */}
      <section id="download" className="scroll-mt-4">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
          <div className="card ticked p-8 sm:p-12">
            <span className="label-tag">Download</span>
            <h2 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
              Auf den Rechner holen
            </h2>
            <p className="mt-4 max-w-2xl text-ink-soft">
              Die Windows-App installiert sich mit einem Doppelklick — kein
              Admin-Konto nötig. Für gesperrte Firmen-PCs gibt es die portable
              Version ohne Installation. Und wer nichts installieren will:
              Das Tool läuft genauso komplett im Browser. Die Desktop-App ist
              ein sicherer Zugang zur Web-Anwendung und benötigt deshalb eine
              Internetverbindung sowie freigeschaltete Zugangsdaten.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={DOWNLOAD_URL_WINDOWS} className="btn-primary">
                Windows-Installer (.exe)
              </a>
              <a href={DOWNLOAD_URL_WINDOWS_PORTABLE} className="btn-secondary">
                Portable Version
              </a>
              <Link href="/berichte" className="btn-secondary">
                Im Browser öffnen
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
