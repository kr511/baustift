import { Skeleton } from "@/components/ui/Skeleton";

export default function BerichtBearbeitenLaedt() {
  return (
    <div className="bg-blueprint min-h-full" role="status" aria-busy="true">
      <span className="sr-only">Formular wird geladen…</span>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <span className="label-tag">Bearbeiten</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Tagesbericht
        </h1>
        <p className="border-amber bg-paper-raised mt-4 border-[1.5px] p-3 text-sm">
          Beim Speichern der Rohdaten wird ein vorhandener Berichtstext
          zurückgesetzt.
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
