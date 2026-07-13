import { notFound, redirect } from "next/navigation";
import { getAuthenticatedClient } from "@/lib/supabase/auth";
import { getTagesberichtVollstaendig } from "@/lib/data/tagesberichte";
import { updateTagesbericht } from "@/lib/actions/tagesberichte";
import { TagesberichtForm } from "@/components/berichte/TagesberichtForm";

export default async function TagesberichtBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bericht = await getTagesberichtVollstaendig(id);
  if (!bericht) notFound();
  if (bericht.status === "final") redirect(`/berichte/${bericht.id}`);

  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Nicht angemeldet.");

  const { data: baustellen, error } = await auth.supabase
    .from("baustellen")
    .select("id, name")
    .order("name");

  if (error) {
    console.error("Baustellen konnten nicht geladen werden:", error);
    throw new Error("Baustellen konnten nicht geladen werden.");
  }

  if (!baustellen) {
    throw new Error("Baustellen konnten nicht geladen werden.");
  }

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <span className="label-tag">Bearbeiten</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Tagesbericht
        </h1>
        <p className="border-amber bg-paper-raised mt-4 border-[1.5px] p-3 text-sm">
          Beim Speichern der Rohdaten wird ein vorhandener Berichtstext
          zurückgesetzt.
        </p>

        <div className="card ticked mt-6 p-6">
          <TagesberichtForm
            baustellen={baustellen}
            action={updateTagesbericht.bind(null, bericht.id, bericht.updated_at)}
            submitLabel="Änderungen speichern"
            initialData={{
              baustelle_id: bericht.baustelle?.id ?? "",
              datum: bericht.datum,
              wetter: bericht.wetter,
              stichpunkte: bericht.stichpunkte,
              created_by: bericht.created_by,
              personal: bericht.personal.map((p) => ({
                name: p.name,
                stunden: String(p.stunden),
                taetigkeit: p.taetigkeit ?? "",
              })),
              material: bericht.material.map((m) => ({
                bezeichnung: m.bezeichnung,
                menge: m.menge ?? "",
                typ: m.typ,
              })),
              fotos: bericht.fotos.map((f) => ({
                storage_path: f.storage_path,
                dateiname: f.dateiname ?? "",
                url: f.url,
              })),
            }}
          />
        </div>
      </div>
    </div>
  );
}
