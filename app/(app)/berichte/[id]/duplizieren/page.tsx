import Link from "next/link";
import { notFound } from "next/navigation";
import { getTagesberichtVollstaendig } from "@/lib/data/tagesberichte";
import { formatDatum } from "@/lib/format";

export default async function TagesberichtDuplizierenPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bericht = await getTagesberichtVollstaendig(id);
  if (!bericht) notFound();

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <span className="label-tag">Vorlage erstellen</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Bericht wiederverwenden
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Wähle die Angaben, die in einen neuen Entwurf übernommen werden sollen.
          Der ursprüngliche Bericht bleibt unverändert.
        </p>

        <div className="card ticked mt-6 p-4">
          <p className="font-semibold text-ink">
            {bericht.baustelle?.name ?? "Unbekannte Baustelle"}
          </p>
          <p className="font-mono mt-1 text-xs text-ink-soft">
            Bericht vom {formatDatum(bericht.datum)}
          </p>
        </div>

        <form action="/berichte/neu" method="get" className="card ticked mt-4 p-5">
          <input type="hidden" name="vorlage" value={bericht.id} />

          <fieldset>
            <legend className="label-tag mb-3">Zu übernehmende Angaben</legend>
            <div className="space-y-3">
              <label className="border-line bg-paper flex min-h-12 cursor-pointer items-center gap-3 border-[1.5px] px-3 py-2">
                <input
                  type="checkbox"
                  name="personal"
                  value="1"
                  defaultChecked
                  className="h-5 w-5 shrink-0"
                />
                <span>
                  <span className="block font-semibold">Personal und Stunden</span>
                  <span className="block text-xs text-ink-soft">
                    Namen, Stunden und Tätigkeiten als Ausgangspunkt übernehmen.
                  </span>
                </span>
              </label>

              <label className="border-line bg-paper flex min-h-12 cursor-pointer items-center gap-3 border-[1.5px] px-3 py-2">
                <input
                  type="checkbox"
                  name="material"
                  value="1"
                  defaultChecked
                  className="h-5 w-5 shrink-0"
                />
                <span>
                  <span className="block font-semibold">Material und Geräte</span>
                  <span className="block text-xs text-ink-soft">
                    Bestehende Einträge übernehmen und anschließend prüfen.
                  </span>
                </span>
              </label>

              <label className="border-line bg-paper flex min-h-12 cursor-pointer items-center gap-3 border-[1.5px] px-3 py-2">
                <input type="checkbox" name="wetter" value="1" className="h-5 w-5 shrink-0" />
                <span>
                  <span className="block font-semibold">Wetter</span>
                  <span className="block text-xs text-ink-soft">
                    Standardmäßig aus, weil sich die Wetterlage täglich ändert.
                  </span>
                </span>
              </label>

              <label className="border-line bg-paper flex min-h-12 cursor-pointer items-center gap-3 border-[1.5px] px-3 py-2">
                <input
                  type="checkbox"
                  name="stichpunkte"
                  value="1"
                  className="h-5 w-5 shrink-0"
                />
                <span>
                  <span className="block font-semibold">Stichpunkte</span>
                  <span className="block text-xs text-ink-soft">
                    Nur aktivieren, wenn die Arbeiten bewusst als Vorlage dienen sollen.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="border-amber bg-paper-raised mt-4 border-[1.5px] p-3 text-sm">
            Fotos, KI-Berichtstext, Status und Finalisierung werden niemals kopiert.
            Das Datum des neuen Entwurfs wird automatisch auf heute gesetzt.
          </div>

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <Link href={`/berichte/${bericht.id}`} className="btn-secondary min-h-11">
              Abbrechen
            </Link>
            <button type="submit" className="btn-primary min-h-11">
              Neuen Entwurf öffnen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
