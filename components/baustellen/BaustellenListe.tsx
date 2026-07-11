import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BaustelleStatusSelect } from "@/components/baustellen/BaustelleStatusSelect";

export async function BaustellenListe() {
  const supabase = await createClient();
  const { data: baustellen, error } = await supabase
    .from("baustellen")
    .select("id, name, adresse, auftraggeber, status")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <p className="border-brick bg-brick-bg text-brick border-[1.5px] p-4 text-sm">
        Baustellen konnten nicht geladen werden: {error.message}
      </p>
    );
  }

  if (!baustellen || baustellen.length === 0) {
    return (
      <p className="card border-dashed p-10 text-center text-sm text-ink-soft">
        Noch keine Baustellen angelegt.
      </p>
    );
  }

  return (
    <ul className="divide-line card divide-y-[1.5px]">
      {baustellen.map((baustelle) => (
        <li
          key={baustelle.id}
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
        >
          <div>
            <Link
              href={`/baustellen/${baustelle.id}`}
              className="font-semibold text-ink decoration-line underline-offset-2 hover:underline"
            >
              {baustelle.name}
            </Link>
            <p className="font-mono text-xs text-ink-soft">
              {[baustelle.adresse, baustelle.auftraggeber]
                .filter(Boolean)
                .join(" · ") || "Keine weiteren Angaben"}
            </p>
          </div>
          <BaustelleStatusSelect
            baustelleId={baustelle.id}
            status={baustelle.status}
          />
        </li>
      ))}
    </ul>
  );
}
