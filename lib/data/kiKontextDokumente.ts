import { createClient } from "@/lib/supabase/server";
import type { DokumentAnhang } from "@/lib/anthropic/generateBericht";

const MAX_DOKUMENTE = 3;
const MAX_GESAMT_BYTES = 10 * 1024 * 1024;

export interface KiKontextErgebnis {
  dokumente: DokumentAnhang[];
  ausgelassen: string[];
}

// Lädt die als "Für KI-Kontext" markierten PDFs einer Baustelle, gedeckelt
// auf max. 3 Dokumente / ~10 MB gesamt (Anthropic-Requestgröße + Kosten).
// Ältestes zuerst, deterministisch; Auslassungen werden zurückgemeldet, damit
// die UI sie anzeigen kann.
export async function getKiKontextDokumente(
  baustelleId: string,
): Promise<KiKontextErgebnis> {
  const supabase = await createClient();

  const { data: dokumente } = await supabase
    .from("baustelle_dokumente")
    .select("storage_path, dateiname, mime_type, groesse_bytes")
    .eq("baustelle_id", baustelleId)
    .eq("ki_kontext", true)
    .eq("mime_type", "application/pdf")
    .order("created_at", { ascending: true });

  if (!dokumente || dokumente.length === 0) {
    return { dokumente: [], ausgelassen: [] };
  }

  const ausgewaehlt: typeof dokumente = [];
  const ausgelassen: string[] = [];
  let gesamtBytes = 0;

  for (const dokument of dokumente) {
    const groesse = dokument.groesse_bytes ?? 0;
    if (
      ausgewaehlt.length >= MAX_DOKUMENTE ||
      gesamtBytes + groesse > MAX_GESAMT_BYTES
    ) {
      ausgelassen.push(dokument.dateiname);
      continue;
    }
    ausgewaehlt.push(dokument);
    gesamtBytes += groesse;
  }

  const geladen = await Promise.all(
    ausgewaehlt.map(async (dokument): Promise<DokumentAnhang | null> => {
      const { data, error } = await supabase.storage
        .from("baustellen-dokumente")
        .download(dokument.storage_path);
      if (error || !data) return null;
      const arrayBuffer = await data.arrayBuffer();
      return {
        dateiname: dokument.dateiname,
        base64: Buffer.from(arrayBuffer).toString("base64"),
      };
    }),
  );

  return {
    dokumente: geladen.filter((d): d is DokumentAnhang => d !== null),
    ausgelassen,
  };
}
