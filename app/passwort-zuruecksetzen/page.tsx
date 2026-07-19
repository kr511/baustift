import type { Metadata } from "next";
import { PasswortZuruecksetzenForm } from "@/components/auth/PasswortZuruecksetzenForm";
import { BaustiftMark } from "@/components/layout/BaustiftMark";

export const metadata: Metadata = {
  title: "Passwort festlegen | Baustift",
};

// Erreicht man über den Link aus der Einladungs- bzw. Passwort-Reset-E-Mail
// (nach dem Token-Tausch in /auth/confirm besteht eine Session).
export default function PasswortZuruecksetzenPage() {
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
              Passwort festlegen
            </h1>
          </div>
          <div className="card ticked mt-8 p-5">
            <PasswortZuruecksetzenForm />
          </div>
        </div>
      </main>
    </>
  );
}
