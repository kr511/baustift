import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTagesberichtVollstaendig } from "@/lib/data/tagesberichte";
import { updateTagesbericht } from "@/lib/actions/tagesberichte";
import { TagesberichtForm } from "@/components/berichte/TagesberichtForm";
import { getUserFirma } from "@/lib/data/firma";
import { getUserProfil } from "@/lib/data/profile";

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
  const [{ data: baustellen }, firma, profil] = await Promise.all([
    supabase.from("baustellen").select("id, name").order("name"),
    getUserFirma(),
    getUserProfil(),
  ]);

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <span className="label-tag">Bearbeiten</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Tagesbericht
        </h1>

        <div className="card ticked mt-6 p-4 sm:p-6">
          <TagesberichtForm
            baustellen={baustellen ?? []}
            firmaId={firma?.id ?? ""}
            entwurfKey={`baustift:tagesbericht-entwurf:${profil?.id ?? "unbekannt"}:edit:${bericht.id}`}
            action={updateTagesbericht.bind(null, bericht.id)}
            submitLabel="Änderungen speichern"
            initialData={{
              baustelle_id: bericht.baustelle?.id ?? "",
              datum: bericht.datum,
              wetter: bericht.wetter,
              stichpunkte: bericht.stichpunkte,
              personal: bericht.personal.map((person) => ({
                name: person.name,
                stunden: String(person.stunden),
                taetigkeit: person.taetigkeit ?? "",
              })),
              material: bericht.material.map((eintrag) => ({
                bezeichnung: eintrag.bezeichnung,
                menge: eintrag.menge ?? "",
                typ: eintrag.typ,
              })),
              fotos: bericht.fotos.map((foto) => ({
                storage_path: foto.storage_path,
                dateiname: foto.dateiname ?? "",
                url: foto.url,
              })),
              updated_at: bericht.updated_at,
            }}
          />
        </div>
      </div>
    </div>
  );
}
