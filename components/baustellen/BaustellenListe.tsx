import Link from "next/link";
import { getAuthenticatedClient } from "@/lib/supabase/auth";
import { BaustelleStatusSelect } from "@/components/baustellen/BaustelleStatusSelect";

export async function BaustellenListe() {
  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Nicht angemeldet.");

  const { data: baustellen, error } = await auth.supabase
    .from("baustellen")
    .select("id, name, adresse, auftraggeber, status")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Baustellen konnten nicht geladen werden:", error);
    throw new Error("Baustellen konnten nicht geladen werden.");
  }

  if (!baustellen) {
    throw new Error("Baustellen konnten nicht geladen werden.");
  }

  if (baustellen.length === 0) {
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
              href={`/berichte?baustelle=${baustelle.id}`}
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
