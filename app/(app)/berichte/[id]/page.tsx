import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getTagesberichtAudit,
  getTagesberichtVersionen,
  getTagesberichtVollstaendig,
} from "@/lib/data/tagesberichte";
import { formatDatum } from "@/lib/format";
import { StatusBadge } from "@/components/berichte/StatusBadge";
import { KiGenerateButton } from "@/components/berichte/KiGenerateButton";
import { FinalisierenButton } from "@/components/berichte/FinalisierenButton";
import { PdfDownloadButton } from "@/components/berichte/PdfDownloadButton";
import { BerichtFinalisierungProvider } from "@/components/berichte/BerichtFinalisierungContext";
import { BerichtVerlauf } from "@/components/berichte/BerichtVerlauf";

function formatZeitpunkt(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

export default async function TagesberichtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bericht, versionen, audit] = await Promise.all([
    getTagesberichtVollstaendig(id),
    getTagesberichtVersionen(id),
    getTagesberichtAudit(id),
  ]);

  if (!bericht) notFound();

  return (
    <BerichtFinalisierungProvider>
      <div className="bg-blueprint min-h-full">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-ink pb-4">
            <div>
              <span className="label-tag">{formatDatum(bericht.datum)}</span>
              <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
                {bericht.baustelle?.name ?? "Unbekannte Baustelle"}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={bericht.status} />
                {bericht.created_by && (
                  <span className="font-mono text-xs text-ink-soft">
                    von {bericht.created_by}
                  </span>
                )}
                {bericht.aktuelle_version > 0 && (
                  <span className="tag-badge border-line bg-paper text-ink">
                    Version {bericht.aktuelle_version}
                  </span>
                )}
              </div>
              {bericht.status === "final" && bericht.finalisiert_am && (
                <p className="mt-2 text-xs text-ink-soft">
                  Finalisiert am {formatZeitpunkt(bericht.finalisiert_am)}
                  {bericht.finalisiert_von ? ` durch ${bericht.finalisiert_von}` : ""}
                </p>
              )}
              {bericht.offener_korrekturgrund && bericht.status !== "final" && (
                <p className="border-amber bg-paper-raised mt-3 max-w-xl border-[1.5px] p-2 text-sm">
                  Korrektur in Arbeit: {bericht.offener_korrekturgrund}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/berichte/${bericht.id}/duplizieren`}
                className="btn-secondary min-h-11"
              >
                Als Vorlage
              </Link>
              {bericht.status !== "final" && (
                <Link
                  href={`/berichte/${bericht.id}/bearbeiten`}
                  className="btn-secondary min-h-11"
                >
                  Eckdaten bearbeiten
                </Link>
              )}
              <Link
                href={`/berichte/${bericht.id}/druckansicht`}
                className="btn-secondary min-h-11"
              >
                Druckansicht
              </Link>
              <PdfDownloadButton berichtId={bericht.id} />
            </div>
          </div>

          <div className="card mt-5 p-4">
            <span className="label-tag">Workflow</span>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <div className="text-sm text-ink-soft">
                <p>1. Berichtstext erstellen oder bearbeiten</p>
                <p>2. Inhalt fachlich prüfen</p>
                <p>3. Unveränderliche Version finalisieren</p>
              </div>
              <FinalisierenButton
                tagesberichtId={bericht.id}
                status={bericht.status}
                aktuelleVersion={bericht.aktuelle_version}
              />
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
                  ? bericht.personal.map((person) => person.name).join(", ")
                  : "–"}
              </dd>
            </div>
            <div>
              <dt className="label-tag mb-0.5">Material &amp; Geräte</dt>
              <dd>
                {bericht.material.length > 0
                  ? bericht.material.map((eintrag) => eintrag.bezeichnung).join(", ")
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
            {bericht.status === "final" ? (
              bericht.bericht_text ? (
                <div className="card p-4 text-sm whitespace-pre-wrap">
                  {bericht.bericht_text}
                </div>
              ) : (
                <p className="card border-dashed p-6 text-sm text-ink-soft">
                  Kein Berichtstext hinterlegt.
                </p>
              )
            ) : (
              <KiGenerateButton
                tagesberichtId={bericht.id}
                initialBerichtText={bericht.bericht_text}
              />
            )}
          </div>

          <div className="card mt-6 p-4">
            <span className="label-tag">Stichpunkte (Original)</span>
            <p className="mt-1.5 text-sm whitespace-pre-wrap text-ink-soft">
              {bericht.stichpunkte}
            </p>
          </div>

          <BerichtVerlauf
            berichtId={bericht.id}
            versionen={versionen}
            audit={audit}
          />
        </div>
      </div>
    </BerichtFinalisierungProvider>
  );
}
