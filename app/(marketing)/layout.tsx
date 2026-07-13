import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Tagesberichte | Bautagesberichte aus Stichpunkten",
  description:
    "Stichpunkte rein, fertiger Bautagesbericht raus. Personal, Material, Wetter und Fotos erfassen — die KI formuliert den Bericht, einheitlich und druckfertig.",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <a
        href="#main-content"
        className="bg-amber text-amber-ink fixed top-2 left-2 z-50 -translate-y-20 border-[1.5px] border-ink px-3 py-2 font-mono text-xs font-semibold tracking-wide uppercase transition-transform focus:translate-y-0 focus:outline-2 focus:outline-offset-2 focus:outline-white"
      >
        Zum Inhalt springen
      </a>
      <div aria-hidden="true" className="hazard-rule" />
      <header className="bg-graphite border-b border-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-display text-2xl leading-none font-bold tracking-tight text-white">
              SWIETELSKY&nbsp;FABER
            </span>
            <span className="label-tag text-amber hidden sm:inline">
              Tagesberichte
            </span>
          </Link>
          <nav aria-label="Seitennavigation" className="flex items-center gap-1 text-sm">
            <Link
              href="/#funktionen"
              className="label-tag inline-flex min-h-11 items-center border border-transparent px-3 py-2 text-white/80 transition-colors hover:border-amber/60 hover:text-amber"
            >
              Funktionen
            </Link>
            <Link
              href="/#download"
              className="label-tag inline-flex min-h-11 items-center border border-transparent px-3 py-2 text-white/80 transition-colors hover:border-amber/60 hover:text-amber"
            >
              Download
            </Link>
            <Link href="/berichte" className="btn-primary ml-2 py-2 text-xs">
              App öffnen
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>

      <footer className="bg-graphite border-t border-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <span className="label-tag text-white/60">
            © 2026 Elias Kümmel — Alle Rechte vorbehalten
          </span>
          <nav aria-label="Rechtliches" className="flex flex-wrap items-center gap-4">
            <Link
              href="/impressum"
              className="label-tag text-white/80 transition-colors hover:text-amber"
            >
              Impressum
            </Link>
            <Link
              href="/datenschutz"
              className="label-tag text-white/80 transition-colors hover:text-amber"
            >
              Datenschutz
            </Link>
            <Link
              href="/nutzungsbedingungen"
              className="label-tag text-white/80 transition-colors hover:text-amber"
            >
              Nutzungsbedingungen
            </Link>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="label-tag text-white/80 transition-colors hover:text-amber"
            >
              {CONTACT_EMAIL}
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
