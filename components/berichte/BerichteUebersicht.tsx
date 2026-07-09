import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDatum } from "@/lib/format";
import { StatusBadge } from "@/components/berichte/StatusBadge";

interface BerichteUebersichtProps {
  baustelleId?: string;
}

export async function BerichteUebersicht({ baustelleId }: BerichteUebersichtProps) {
  const supabase = await createClient();

  let query = supabase
    .from("tagesberichte")
    .select("id, datum, wetter, status, baustellen(id, name)")
    .order("datum", { ascending: false })
    .order("created_at", { ascending: false });

  if (baustelleId) {
    query = query.eq("baustelle_id", baustelleId);
  }

  const { data: berichte, error } = await query;

  if (error) {
    return (
      <p className="border-brick bg-brick-bg text-brick border-[1.5px] p-4 text-sm">
        Tagesberichte konnten nicht geladen werden: {error.message}
      </p>
    );
  }

  if (!berichte || berichte.length === 0) {
    return (
      <p className="card border-dashed p-10 text-center text-sm text-ink-soft">
        Noch keine Tagesberichte vorhanden.
      </p>
    );
  }

  const gruppen = new Map<string, typeof berichte>();
  for (const bericht of berichte) {
    const gruppe = gruppen.get(bericht.datum) ?? [];
    gruppe.push(bericht);
    gruppen.set(bericht.datum, gruppe);
  }

  return (
    <div className="space-y-10">
      {Array.from(gruppen.entries()).map(([datum, tagesberichte]) => (
        <section key={datum}>
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-display text-xl leading-none font-bold whitespace-nowrap">
              {formatDatum(datum)}
            </h2>
            <div className="border-line h-0 flex-1 border-t-2 border-dashed" />
          </div>
          <ul className="divide-line card divide-y-[1.5px]">
            {tagesberichte.map((bericht) => (
              <li key={bericht.id}>
                <Link
                  href={`/berichte/${bericht.id}`}
                  className="hover:bg-paper flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-ink">
                      {bericht.baustellen?.name ?? "Unbekannte Baustelle"}
                    </p>
                    <p className="font-mono text-xs text-ink-soft">{bericht.wetter}</p>
                  </div>
                  <StatusBadge status={bericht.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
