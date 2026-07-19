import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TagesberichtForm } from "@/components/berichte/TagesberichtForm";
import { getUserFirma } from "@/lib/data/firma";
import { getUserProfil } from "@/lib/data/profile";
import { getTagesberichtVollstaendig } from "@/lib/data/tagesberichte";
import { heuteISO } from "@/lib/format";

export default async function NeuerTagesberichtPage({
  searchParams,
}: {
  searchParams: Promise<{
    baustelle?: string;
    vorlage?: string;
    personal?: string;
    material?: string;
    wetter?: string;
    stichpunkte?: string;
  }>;
}) {
  const optionen = await searchParams;
  const supabase = await createClient();
  const [{ data: baustellen }, firma, profil, vorlage] = await Promise.all([
    supabase.from("baustellen").select("id, name").order("name"),
    getUserFirma(),
    getUserProfil(),
    optionen.vorlage
      ? getTagesberichtVollstaendig(optionen.vorlage)
      : Promise.resolve(null),
  ]);

  if (optionen.vorlage && !vorlage) notFound();

  const initialData = vorlage
    ? {
        baustelle_id: vorlage.baustelle?.id ?? "",
        datum: heuteISO(),
        wetter: optionen.wetter === "1" ? vorlage.wetter : "",
        stichpunkte: optionen.stichpunkte === "1" ? vorlage.stichpunkte : "",
        personal:
          optionen.personal === "1"
            ? vorlage.personal.map((person) => ({
                name: person.name,
                stunden: String(person.stunden),
                taetigkeit: person.taetigkeit ?? "",
              }))
            : [],
        material:
          optionen.material === "1"
            ? vorlage.material.map((eintrag) => ({
                bezeichnung: eintrag.bezeichnung,
                menge: eintrag.menge ?? "",
                typ: eintrag.typ,
              }))
            : [],
        fotos: [],
      }
    : undefined;

  const entwurfKey = `baustift:tagesbericht-entwurf:${profil?.id ?? "unbekannt"}:neu:${
    optionen.vorlage ?? "leer"
  }`;

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <span className="label-tag">{vorlage ? "Aus Vorlage" : "Neuer Eintrag"}</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Tagesbericht
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          {vorlage
            ? "Übernommene Angaben prüfen und für den neuen Arbeitstag anpassen. Fotos und KI-Text wurden nicht kopiert."
            : "Eckdaten und Stichpunkte eintragen — die KI formuliert daraus den vollständigen Bericht."}
        </p>

        {!baustellen || baustellen.length === 0 ? (
          <p className="border-amber bg-paper-raised mt-6 border-[1.5px] p-4 text-sm">
            Es ist noch keine Baustelle angelegt. Bitte zuerst unter{" "}
            <Link href="/baustellen" className="font-semibold underline">
              Baustellen
            </Link>{" "}
            eine Baustelle anlegen.
          </p>
        ) : (
          <div className="card ticked mt-6 p-4 sm:p-6">
            <TagesberichtForm
              baustellen={baustellen}
              firmaId={firma?.id ?? ""}
              entwurfKey={entwurfKey}
              vorausgewaehlteBaustelleId={optionen.baustelle}
              initialData={initialData}
            />
          </div>
        )}
      </div>
    </div>
  );
}
