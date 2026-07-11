import { NextResponse } from "next/server";
import { getTagesberichtVollstaendig } from "@/lib/data/tagesberichte";
import { getUserFirma } from "@/lib/data/firma";
import { renderTagesberichtPdf } from "@/lib/pdf/renderTagesberichtPdf";
import { sanitizeDateiname } from "@/lib/format";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const [bericht, firma] = await Promise.all([
    getTagesberichtVollstaendig(id),
    getUserFirma(),
  ]);

  if (!bericht) {
    return NextResponse.json(
      { error: "Tagesbericht wurde nicht gefunden." },
      { status: 404 },
    );
  }

  const pdfBuffer = await renderTagesberichtPdf(bericht, firma?.wordmark ?? null);

  const baustelleName = sanitizeDateiname(
    bericht.baustelle?.name ?? "Baustelle",
  );
  const dateiname = `${baustelleName}_${bericht.datum}.pdf`;
  const dateinameUtf8 = encodeURIComponent(
    `${bericht.baustelle?.name ?? "Baustelle"}_${bericht.datum}.pdf`,
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${dateiname}"; filename*=UTF-8''${dateinameUtf8}`,
    },
  });
}
