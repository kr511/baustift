import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BaustelleFilter } from "@/components/berichte/BaustelleFilter";
import { BerichteUebersicht } from "@/components/berichte/BerichteUebersicht";

export default async function BerichteUebersichtPage({
  searchParams,
}: {
  searchParams: Promise<{ baustelle?: string }>;
}) {
  const { baustelle } = await searchParams;
  const supabase = await createClient();
  const { data: baustellen } = await supabase
    .from("baustellen")
    .select("id, name")
    .order("name");

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
            <BaustelleFilter baustellen={baustellen ?? []} />
          </Suspense>
        </div>

        <div className="mt-8">
          <BerichteUebersicht baustelleId={baustelle} />
        </div>
      </div>
    </div>
  );
}
