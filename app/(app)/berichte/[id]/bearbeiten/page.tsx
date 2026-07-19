import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTagesberichtVollstaendig } from "@/lib/data/tagesberichte";
import { updateTagesbericht } from "@/lib/actions/tagesberichte";
import { TagesberichtForm } from "@/components/berichte/TagesberichtForm";
import { getUserFirma } from "@/lib/data/firma";

export default async function TagesberichtBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bericht = await getTagesberichtVollstaendig(id);
  if (!bericht) notFound();

  // Finalisierte Berichte sind abgeschlossen und nicht mehr editierbar.
  if (bericht.status === "final") redirect(`/berichte/${id}`);

  const supabase = await createClient();
  const [{ data: baustellen }, firma] = await Promise.all([
    supabase.from("baustellen").select("id, name").order("name"),
    getUserFirma(),
  ]);

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <span className="label-tag">Bearbeiten</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Tagesbericht
        </h1>

        <div className="card ticked mt-6 p-6">
          <TagesberichtForm
            baustellen={baustellen ?? []}
            firmaId={firma?.id ?? ""}
            action={updateTagesbericht.bind(null, bericht.id)}
            submitLabel="Änderungen speichern"
            initialData={{
              baustelle_id: bericht.baustelle?.id ?? "",
              datum: bericht.datum,
              wetter: bericht.wetter,
              stichpunkte: bericht.stichpunkte,
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
