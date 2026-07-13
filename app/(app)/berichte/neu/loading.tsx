import { Skeleton } from "@/components/ui/Skeleton";

export default function NeuerBerichtLaedt() {
  return (
    <div className="bg-blueprint min-h-full" role="status" aria-busy="true">
      <span className="sr-only">Formular wird geladen…</span>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <span className="label-tag">Neuer Eintrag</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Tagesbericht
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Eckdaten und Stichpunkte eintragen — die KI formuliert daraus den
          vollständigen Bericht.
        </p>

        <div className="card ticked mt-6 space-y-5 p-6">
          {[0, 1, 2, 3].map((feld) => (
            <div key={feld} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}
