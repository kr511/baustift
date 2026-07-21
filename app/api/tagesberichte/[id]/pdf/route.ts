import { NextResponse } from "next/server";
import {
  getTagesberichtVersionVollstaendig,
  getTagesberichtVollstaendig,
} from "@/lib/data/tagesberichte";
import { getUserFirma } from "@/lib/data/firma";
import { renderTagesberichtPdf } from "@/lib/pdf/renderTagesberichtPdf";
import { sanitizeDateiname } from "@/lib/format";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const versionRaw = new URL(request.url).searchParams.get("version");
  const version = versionRaw ? Number(versionRaw) : null;

  if (versionRaw && (!Number.isInteger(version) || (version ?? 0) < 1)) {
    return NextResponse.json({ error: "Ungültige Versionsnummer." }, { status: 400 });
  }

  const [bericht, firma] = await Promise.all([
    version
      ? getTagesberichtVersionVollstaendig(id, version)
      : getTagesberichtVollstaendig(id),
    getUserFirma(),
  ]);

  if (!bericht) {
    return NextResponse.json(
      { error: "Tagesbericht oder Version wurde nicht gefunden." },
      { status: 404 },
    );
  }

  const pdfBuffer = await renderTagesberichtPdf(
    bericht,
    bericht.firmaWordmark ?? firma?.wordmark ?? null,
  );

  const baustelleName = sanitizeDateiname(
    bericht.baustelle?.name ?? "Baustelle",
  );
  const exportVersion = bericht.angezeigte_version ??
    (bericht.status === "final" ? bericht.aktuelle_version : 0);
  const versionsSuffix = exportVersion > 0 ? `_V${exportVersion}` : "_ENTWURF";
  const dateiname = `${baustelleName}_${bericht.datum}${versionsSuffix}.pdf`;
  const dateinameUtf8 = encodeURIComponent(
    `${bericht.baustelle?.name ?? "Baustelle"}_${bericht.datum}${versionsSuffix}.pdf`,
  );

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${dateiname}"; filename*=UTF-8''${dateinameUtf8}`,
    },
  });
}
