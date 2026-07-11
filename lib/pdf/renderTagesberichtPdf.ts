import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { TagesberichtPdf, type PdfFoto } from "@/lib/pdf/TagesberichtPdf";
import type { TagesberichtVollstaendig } from "@/lib/data/tagesberichte";

// react-pdf kann nur JPEG/PNG einbetten (kein WebP/HEIC/HEIF). Format wird
// aus der Dateiendung abgeleitet, da tagesbericht_fotos keinen MIME-Typ
// speichert.
function embeddableFormat(dateiname: string): "jpg" | "png" | null {
  const ext = dateiname.toLowerCase().split(".").pop();
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "png") return "png";
  return null;
}

async function ladeFotos(
  bericht: TagesberichtVollstaendig,
): Promise<PdfFoto[]> {
  const supabase = await createClient();

  return Promise.all(
    bericht.fotos.map(async (foto): Promise<PdfFoto> => {
      const dateiname = foto.dateiname ?? "Foto";
      const format = embeddableFormat(dateiname);
      if (!format) {
        return { dateiname, embeddable: false };
      }

      const { data, error } = await supabase.storage
        .from("tagesbericht-fotos")
        .download(foto.storage_path);

      if (error || !data) {
        return { dateiname, embeddable: false };
      }

      const arrayBuffer = await data.arrayBuffer();
      return { dateiname, embeddable: true, format, data: Buffer.from(arrayBuffer) };
    }),
  );
}

export async function renderTagesberichtPdf(
  bericht: TagesberichtVollstaendig,
  firmaWordmark: string | null,
): Promise<Buffer> {
  const fotos = await ladeFotos(bericht);
  return renderToBuffer(
    TagesberichtPdf({ bericht, firmaWordmark, fotos }),
  );
}
