import Link from "next/link";
import { notFound } from "next/navigation";
import { getTagesberichtVollstaendig } from "@/lib/data/tagesberichte";
import { formatDatum } from "@/lib/format";
import { StatusBadge } from "@/components/berichte/StatusBadge";
import { KiGenerateButton } from "@/components/berichte/KiGenerateButton";
import { FinalisierenButton } from "@/components/berichte/FinalisierenButton";

export default async function TagesberichtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bericht = await getTagesberichtVollstaendig(id);

  if (!bericht) notFound();

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
          <div>
            <span className="label-tag">{formatDatum(bericht.datum)}</span>
            <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
              {bericht.baustelle?.name ?? "Unbekannte Baustelle"}
            </h1>
            <div className="mt-2.5 flex items-center gap-2">
              <StatusBadge status={bericht.status} />
              {bericht.created_by && (
                <span className="font-mono text-xs text-ink-soft">
                  von {bericht.created_by}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/berichte/${bericht.id}/bearbeiten`} className="btn-secondary">
              Bearbeiten
            </Link>
            <Link href={`/berichte/${bericht.id}/druckansicht`} className="btn-secondary">
              Druckansicht
            </Link>
            {bericht.status === "entwurf" && (
              <FinalisierenButton tagesberichtId={bericht.id} />
            )}
          </div>
        </div>

        <dl className="card mt-6 grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-3">
          <div>
            <dt className="label-tag mb-0.5">Wetter</dt>
            <dd>{bericht.wetter}</dd>
          </div>
          <div>
            <dt className="label-tag mb-0.5">Personal</dt>
            <dd>
              {bericht.personal.length > 0
                ? bericht.personal.map((p) => p.name).join(", ")
                : "–"}
            </dd>
          </div>
          <div>
            <dt className="label-tag mb-0.5">Material &amp; Geräte</dt>
            <dd>
              {bericht.material.length > 0
                ? bericht.material.map((m) => m.bezeichnung).join(", ")
                : "–"}
            </dd>
          </div>
        </dl>

        {bericht.fotos.length > 0 && (
          <div className="mt-6">
            <span className="label-tag">Fotos</span>
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
          </div>
        )}

        <div className="mt-6">
          <span className="label-tag mb-2 block">Bericht</span>
          <KiGenerateButton
            tagesberichtId={bericht.id}
            initialBerichtText={bericht.bericht_text}
          />
        </div>

        <div className="card mt-6 p-4">
          <span className="label-tag">Stichpunkte (Original)</span>
          <p className="mt-1.5 text-sm whitespace-pre-wrap text-ink-soft">
            {bericht.stichpunkte}
          </p>
        </div>
      </div>
    </div>
  );
}
