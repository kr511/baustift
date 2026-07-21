import { formatDatum } from "@/lib/format";
import type { TagesberichtVollstaendig } from "@/lib/data/tagesberichte";

function statusLabel(status: TagesberichtVollstaendig["status"]) {
  if (status === "final") return "Finalisiert";
  if (status === "geprueft") return "Geprüft";
  if (status === "generiert") return "Text erstellt";
  return "Entwurf";
}

function formatZeitpunkt(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

export function TagesberichtDruckansicht({
  bericht,
  firmaWordmark,
}: {
  bericht: TagesberichtVollstaendig;
  firmaWordmark: string | null;
}) {
  const version = bericht.angezeigte_version ??
    (bericht.status === "final" ? bericht.aktuelle_version : 0);

  return (
    <article className="mx-auto max-w-3xl bg-white p-10 text-ink print:p-0">
      <div className="hazard-rule mb-6 print:mb-4" />

      <header className="flex items-end justify-between border-b-2 border-ink pb-4">
        <div>
          <p className="font-display text-lg leading-none font-bold tracking-tight">
            {firmaWordmark ?? "BAUSTIFT"}
          </p>
          <p className="label-tag mt-1">Bautagesbericht</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm">{formatDatum(bericht.datum)}</p>
          {version > 0 && <p className="label-tag mt-1">Version {version}</p>}
        </div>
      </header>

      <h1 className="font-display mt-4 text-3xl leading-none font-bold tracking-tight">
        {bericht.baustelle?.name ?? "Unbekannte Baustelle"}
      </h1>

      {bericht.versionsgrund && (
        <div className="border-amber bg-paper-raised mt-4 border-[1.5px] p-3 text-sm">
          <span className="font-semibold">Versionsgrund:</span> {bericht.versionsgrund}
        </div>
      )}

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="label-tag">Wetter</dt>
          <dd className="mt-0.5">{bericht.wetter}</dd>
        </div>
        <div>
          <dt className="label-tag">Status</dt>
          <dd className="mt-0.5">{statusLabel(bericht.status)}</dd>
        </div>
        {bericht.created_by && (
          <div>
            <dt className="label-tag">Erstellt von</dt>
            <dd className="mt-0.5">{bericht.created_by}</dd>
          </div>
        )}
        {bericht.finalisiert_am && (
          <div>
            <dt className="label-tag">Finalisiert am</dt>
            <dd className="mt-0.5">{formatZeitpunkt(bericht.finalisiert_am)}</dd>
          </div>
        )}
        {bericht.finalisiert_von && (
          <div>
            <dt className="label-tag">Finalisiert durch</dt>
            <dd className="mt-0.5">{bericht.finalisiert_von}</dd>
          </div>
        )}
      </dl>

      {bericht.personal.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="label-tag">Personal &amp; Stunden</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="label-tag py-1 font-semibold">Name</th>
                <th className="label-tag py-1 font-semibold">Stunden</th>
                <th className="label-tag py-1 font-semibold">Tätigkeit</th>
              </tr>
            </thead>
            <tbody>
              {bericht.personal.map((person, index) => (
                <tr key={index} className="border-b border-line">
                  <td className="py-1.5">{person.name}</td>
                  <td className="py-1.5 font-mono">{person.stunden}</td>
                  <td className="py-1.5">{person.taetigkeit ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {bericht.material.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="label-tag">Material &amp; Geräte</h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b-2 border-ink text-left">
                <th className="label-tag py-1 font-semibold">Typ</th>
                <th className="label-tag py-1 font-semibold">Bezeichnung</th>
                <th className="label-tag py-1 font-semibold">Menge</th>
              </tr>
            </thead>
            <tbody>
              {bericht.material.map((eintrag, index) => (
                <tr key={index} className="border-b border-line">
                  <td className="py-1.5">
                    {eintrag.typ === "geraet" ? "Gerät" : "Material"}
                  </td>
                  <td className="py-1.5">{eintrag.bezeichnung}</td>
                  <td className="py-1.5 font-mono">{eintrag.menge ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-6">
        <h2 className="label-tag">Bericht</h2>
        {bericht.bericht_text ? (
          <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
            {bericht.bericht_text}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">
            Noch kein vollständiger Bericht erstellt. Stichpunkte:
            <span className="mt-1 block whitespace-pre-wrap">{bericht.stichpunkte}</span>
          </p>
        )}
      </section>

      {bericht.fotos.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="label-tag">Fotos</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {bericht.fotos.map((foto) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={foto.storage_path}
                src={foto.url}
                alt={foto.dateiname ?? "Foto"}
                className="border-ink aspect-square w-full border object-cover"
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
