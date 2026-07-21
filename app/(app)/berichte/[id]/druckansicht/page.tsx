import { notFound } from "next/navigation";
import {
  getTagesberichtVersionVollstaendig,
  getTagesberichtVollstaendig,
} from "@/lib/data/tagesberichte";
import { getUserFirma } from "@/lib/data/firma";
import { TagesberichtDruckansicht } from "@/components/berichte/TagesberichtDruckansicht";
import { DruckButton } from "@/components/berichte/DruckButton";
import { PdfDownloadButton } from "@/components/berichte/PdfDownloadButton";

export default async function TagesberichtDruckansichtPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const [{ id }, { version: versionRaw }] = await Promise.all([
    params,
    searchParams,
  ]);
  const version = versionRaw ? Number(versionRaw) : null;
  if (versionRaw && (!Number.isInteger(version) || (version ?? 0) < 1)) notFound();

  const [bericht, firma] = await Promise.all([
    version
      ? getTagesberichtVersionVollstaendig(id, version)
      : getTagesberichtVollstaendig(id),
    getUserFirma(),
  ]);
  if (!bericht) notFound();

  return (
    <div>
      <div className="mx-auto mb-4 flex max-w-3xl justify-end gap-2 px-4 print:hidden">
        {version ? (
          <a
            href={`/api/tagesberichte/${bericht.id}/pdf?version=${version}`}
            className="btn-secondary"
          >
            PDF herunterladen
          </a>
        ) : (
          <PdfDownloadButton berichtId={bericht.id} />
        )}
        <DruckButton />
      </div>
      <div className="border-ink mx-4 border-[1.5px] shadow-[6px_6px_0_var(--color-ink)] sm:mx-auto sm:max-w-3xl print:mx-0 print:max-w-none print:border-0 print:shadow-none">
        <TagesberichtDruckansicht
          bericht={bericht}
          firmaWordmark={bericht.firmaWordmark ?? firma?.wordmark ?? null}
        />
      </div>
    </div>
  );
}
