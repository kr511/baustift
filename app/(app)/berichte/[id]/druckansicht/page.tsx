import { notFound } from "next/navigation";
import { getTagesberichtVollstaendig } from "@/lib/data/tagesberichte";
import { getUserFirma } from "@/lib/data/firma";
import { TagesberichtDruckansicht } from "@/components/berichte/TagesberichtDruckansicht";
import { DruckButton } from "@/components/berichte/DruckButton";
import { PdfDownloadButton } from "@/components/berichte/PdfDownloadButton";

export default async function TagesberichtDruckansichtPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [bericht, firma] = await Promise.all([
    getTagesberichtVollstaendig(id),
    getUserFirma(),
  ]);
  if (!bericht) notFound();

  return (
    <div>
      <div className="mx-auto mb-4 flex max-w-3xl justify-end gap-2 px-4 print:hidden">
        <PdfDownloadButton berichtId={bericht.id} />
        <DruckButton />
      </div>
      <div className="border-ink mx-4 border-[1.5px] shadow-[6px_6px_0_var(--color-ink)] sm:mx-auto sm:max-w-3xl print:mx-0 print:max-w-none print:border-0 print:shadow-none">
        <TagesberichtDruckansicht
          bericht={bericht}
          firmaWordmark={firma?.wordmark ?? null}
        />
      </div>
    </div>
  );
}
