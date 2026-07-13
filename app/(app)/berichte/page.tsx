import { Suspense } from "react";
import Link from "next/link";
import { z } from "zod";
import { getAuthenticatedClient } from "@/lib/supabase/auth";
import { BaustelleFilter } from "@/components/berichte/BaustelleFilter";
import { BerichteUebersicht } from "@/components/berichte/BerichteUebersicht";
import { Skeleton } from "@/components/ui/Skeleton";

function BerichteUebersichtSkeleton() {
  return (
    <div className="space-y-10" role="status" aria-busy="true">
      <span className="sr-only">Tagesberichte werden geladen…</span>
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
  );
}

export default async function BerichteUebersichtPage({
  searchParams,
}: {
  searchParams: Promise<{ baustelle?: string | string[] }>;
}) {
  const { baustelle: baustelleParameter } = await searchParams;
  const baustelleResult = z.string().uuid().safeParse(
    typeof baustelleParameter === "string" ? baustelleParameter : undefined,
  );
  const baustelle = baustelleResult.success ? baustelleResult.data : undefined;
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Nicht angemeldet.");

  const { data: baustellen, error } = await auth.supabase
    .from("baustellen")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Baustellenfilter konnte nicht geladen werden:", error);
    throw new Error("Baustellenfilter konnte nicht geladen werden.");
  }

  if (!baustellen) {
    throw new Error("Baustellenfilter konnte nicht geladen werden.");
  }

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <span className="label-tag">Baustellen-Logbuch</span>
            <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
              Tagesberichte
            </h1>
          </div>
          <Link href="/berichte/neu" className="btn-primary">
            + Neuer Tagesbericht
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <span className="label-tag">Filter</span>
          <Suspense fallback={null}>
            <BaustelleFilter baustellen={baustellen} />
          </Suspense>
        </div>

        <div className="mt-8">
          <Suspense
            key={baustelle ?? "alle"}
            fallback={<BerichteUebersichtSkeleton />}
          >
            <BerichteUebersicht baustelleId={baustelle} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
