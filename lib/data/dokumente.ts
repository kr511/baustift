import { createClient } from "@/lib/supabase/server";

export interface BaustelleDokument {
  id: string;
  storage_path: string;
  dateiname: string;
  mime_type: string;
  groesse_bytes: number | null;
  ki_kontext: boolean;
  created_at: string;
  url: string;
}

export async function getBaustelleDokumente(
  baustelleId: string,
): Promise<BaustelleDokument[]> {
  const supabase = await createClient();

  const { data: dokumente, error } = await supabase
    .from("baustelle_dokumente")
    .select("id, storage_path, dateiname, mime_type, groesse_bytes, ki_kontext, created_at")
    .eq("baustelle_id", baustelleId)
    .order("created_at", { ascending: false });

  if (error) console.error("getBaustelleDokumente fehlgeschlagen:", error);
  if (!dokumente) return [];

  return Promise.all(
    dokumente.map(async (dokument) => {
      const { data: signed } = await supabase.storage
        .from("baustellen-dokumente")
        .createSignedUrl(dokument.storage_path, 60 * 60);
      return { ...dokument, url: signed?.signedUrl ?? "" };
    }),
  );
}
