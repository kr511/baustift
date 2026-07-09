import { formatDatum } from "@/lib/format";
import type { TagesberichtVollstaendig } from "@/lib/data/tagesberichte";

export function TagesberichtDruckansicht({
  bericht,
}: {
  bericht: TagesberichtVollstaendig;
}) {
  return (
    <article className="mx-auto max-w-3xl bg-white p-10 text-ink print:p-0">
      <div className="hazard-rule mb-6 print:mb-4" />

      <header className="flex items-end justify-between border-b-2 border-ink pb-4">
        <div>
          <p className="font-display text-lg leading-none font-bold tracking-tight">
            SWIETELSKY&nbsp;FABER
          </p>
          <p className="label-tag mt-1">Bautagesbericht</p>
        </div>
        <p className="font-mono text-sm">{formatDatum(bericht.datum)}</p>
      </header>

      <h1 className="font-display mt-4 text-3xl leading-none font-bold tracking-tight">
        {bericht.baustelle?.name ?? "Unbekannte Baustelle"}
      </h1>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="label-tag">Wetter</dt>
          <dd className="mt-0.5">{bericht.wetter}</dd>
        </div>
        <div>
          <dt className="label-tag">Status</dt>
          <dd className="mt-0.5">{bericht.status === "final" ? "Final" : "Entwurf"}</dd>
        </div>
        {bericht.created_by && (
          <div>
            <dt className="label-tag">Erstellt von</dt>
            <dd className="mt-0.5">{bericht.created_by}</dd>
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
              {bericht.personal.map((p, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-1.5">{p.name}</td>
                  <td className="py-1.5 font-mono">{p.stunden}</td>
                  <td className="py-1.5">{p.taetigkeit ?? "–"}</td>
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
              {bericht.material.map((m, i) => (
                <tr key={i} className="border-b border-line">
                  <td className="py-1.5">{m.typ === "geraet" ? "Gerät" : "Material"}</td>
                  <td className="py-1.5">{m.bezeichnung}</td>
                  <td className="py-1.5 font-mono">{m.menge ?? "–"}</td>
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
