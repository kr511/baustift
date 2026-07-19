import Link from "next/link";
import { notFound } from "next/navigation";
import { getTagesberichtVersionVollstaendig } from "@/lib/data/tagesberichte";
import { formatDatum } from "@/lib/format";

function formatZeitpunkt(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

export default async function TagesberichtVersionPage({
  params,
}: {
  params: Promise<{ id: string; version: string }>;
}) {
  const { id, version: versionRaw } = await params;
  const version = Number(versionRaw);
  const bericht = await getTagesberichtVersionVollstaendig(id, version);
  if (!bericht) notFound();

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <span className="label-tag">Unveränderliche Version {version}</span>
            <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
              {bericht.baustelle?.name ?? "Unbekannte Baustelle"}
            </h1>
            <p className="mt-2 text-sm text-ink-soft">
              Bautagesbericht vom {formatDatum(bericht.datum)}
            </p>
            {bericht.finalisiert_am && (
              <p className="mt-1 text-xs text-ink-soft">
                Finalisiert am {formatZeitpunkt(bericht.finalisiert_am)}
                {bericht.finalisiert_von ? ` durch ${bericht.finalisiert_von}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/berichte/${id}`} className="btn-secondary min-h-11">
              Zum aktuellen Stand
            </Link>
            <a
              href={`/api/tagesberichte/${id}/pdf?version=${version}`}
              className="btn-primary min-h-11"
            >
              Version als PDF
            </a>
          </div>
        </div>

        {bericht.versionsgrund && (
          <div className="border-amber bg-paper-raised mt-5 border-[1.5px] p-3 text-sm">
            <span className="font-semibold">Versionsgrund:</span> {bericht.versionsgrund}
          </div>
        )}

        <dl className="card mt-6 grid gap-4 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="label-tag mb-1">Wetter</dt>
            <dd>{bericht.wetter}</dd>
          </div>
          <div>
            <dt className="label-tag mb-1">Personal</dt>
            <dd>
              {bericht.personal.length > 0
                ? bericht.personal.map((person) => person.name).join(", ")
                : "–"}
            </dd>
          </div>
          <div>
            <dt className="label-tag mb-1">Material &amp; Geräte</dt>
            <dd>
              {bericht.material.length > 0
                ? bericht.material.map((eintrag) => eintrag.bezeichnung).join(", ")
                : "–"}
            </dd>
          </div>
        </dl>

        <section className="mt-6">
          <span className="label-tag mb-2 block">Finalisierter Berichtstext</span>
          <div className="card p-4 text-sm whitespace-pre-wrap">
            {bericht.bericht_text ?? bericht.stichpunkte}
          </div>
        </section>

        {bericht.fotos.length > 0 && (
          <section className="mt-6">
            <span className="label-tag">Fotos dieser Version</span>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {bericht.fotos.map((foto) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={foto.storage_path}
                  src={foto.url}
                  alt={foto.dateiname ?? "Foto"}
                  className="border-ink aspect-square w-full border-[1.5px] object-cover"
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
