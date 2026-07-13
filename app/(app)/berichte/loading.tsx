import { Skeleton } from "@/components/ui/Skeleton";

export default function BerichteLaedt() {
  return (
    <div className="bg-blueprint min-h-full" role="status" aria-busy="true">
      <span className="sr-only">Tagesberichte werden geladen…</span>
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <span className="label-tag">Baustellen-Logbuch</span>
            <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
              Tagesberichte
            </h1>
          </div>
          <Skeleton className="h-11 w-48" />
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="label-tag">Filter</span>
          <Skeleton className="h-9 w-56" />
        </div>

        <div className="mt-8 space-y-10">
          {[0, 1].map((gruppe) => (
            <section key={gruppe}>
              <div className="mb-3 flex items-center gap-3">
                <Skeleton className="h-5 w-40" />
                <div className="border-line h-0 flex-1 border-t-2 border-dashed" />
              </div>
              <ul className="divide-line card divide-y-[1.5px]">
                {[0, 1, 2].map((zeile) => (
                  <li
                    key={zeile}
                    className="flex items-center justify-between gap-3 px-4 py-3.5"
                  >
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
