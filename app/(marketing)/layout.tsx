import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Baustift | Bautagesberichte aus Stichpunkten",
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
      <div className="hazard-rule" />
      <header className="bg-graphite border-b border-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-baseline gap-3">
            <span className="font-display text-2xl leading-none font-bold tracking-tight text-white">
              BAUSTIFT
            </span>
            <span className="label-tag text-amber hidden sm:inline">
              Bautagesberichte
            </span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <a
              href="#funktionen"
              className="label-tag border border-transparent px-3 py-2 text-white/80 transition-colors hover:border-amber/60 hover:text-amber"
            >
              Funktionen
            </a>
            <a
              href="#download"
              className="label-tag border border-transparent px-3 py-2 text-white/80 transition-colors hover:border-amber/60 hover:text-amber"
            >
              Download
            </a>
            <Link href="/berichte" className="btn-primary ml-2 py-2 text-xs">
              App öffnen
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="bg-graphite border-t border-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6">
          <span className="label-tag text-white/60">
            © 2026 Elias Kümmel — Alle Rechte vorbehalten
          </span>
          <nav className="flex flex-wrap items-center gap-4">
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
