import { Skeleton } from "@/components/ui/Skeleton";

export default function BerichtDetailLaedt() {
  return (
    <div className="bg-blueprint min-h-full" role="status" aria-busy="true">
      <span className="sr-only">Tagesbericht wird geladen…</span>
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        <div className="card mt-6 grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
          {[0, 1, 2].map((feld) => (
            <div key={feld} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          <Skeleton className="h-3 w-16" />
          <div className="card space-y-2 p-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
