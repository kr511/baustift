import { createClient } from "@/lib/supabase/server";
import { TagesberichtForm } from "@/components/berichte/TagesberichtForm";

export default async function NeuerTagesberichtPage({
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
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <span className="label-tag">Neuer Eintrag</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Tagesbericht
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Eckdaten und Stichpunkte eintragen — die KI formuliert daraus den
          vollständigen Bericht.
        </p>

        {!baustellen || baustellen.length === 0 ? (
          <p className="border-amber bg-paper-raised mt-6 border-[1.5px] p-4 text-sm">
            Es ist noch keine Baustelle angelegt. Bitte zuerst unter{" "}
            <a href="/baustellen" className="font-semibold underline">
              Baustellen
            </a>{" "}
            eine Baustelle anlegen.
          </p>
        ) : (
          <div className="card ticked mt-6 p-6">
            <TagesberichtForm
              baustellen={baustellen}
              vorausgewaehlteBaustelleId={baustelle}
            />
          </div>
        )}
      </div>
    </div>
  );
}
