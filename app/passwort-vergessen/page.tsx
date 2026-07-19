import type { Metadata } from "next";
import Link from "next/link";
import { PasswortVergessenForm } from "@/components/auth/PasswortVergessenForm";
import { BaustiftMark } from "@/components/layout/BaustiftMark";

export const metadata: Metadata = {
  title: "Passwort vergessen | Baustift",
};

export default function PasswortVergessenPage() {
  return (
    <>
      <div className="hazard-rule" />
      <header className="bg-graphite border-b border-ink">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <BaustiftMark className="h-7 w-7 shrink-0" />
          <span className="flex items-baseline gap-3">
            <span className="font-display text-2xl leading-none font-bold tracking-tight text-white">
              BAUSTIFT
            </span>
            <span className="label-tag text-amber hidden sm:inline">
              Tagesberichte
            </span>
          </span>
        </div>
      </header>
      <main className="bg-blueprint flex min-h-full flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="border-b-2 border-ink pb-4">
            <span className="label-tag">Interner Bereich</span>
            <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
              Passwort vergessen
            </h1>
          </div>
          <div className="card ticked mt-8 p-5">
            <PasswortVergessenForm />
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            <Link href="/login" className="underline underline-offset-2">
              Zurück zur Anmeldung
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
