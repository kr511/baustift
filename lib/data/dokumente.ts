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
  if (!dokumente || dokumente.length === 0) return [];

  const { data: signed, error: signError } = await supabase.storage
    .from("baustellen-dokumente")
    .createSignedUrls(
      dokumente.map((dokument) => dokument.storage_path),
      60 * 60,
    );

  if (signError) console.error("getBaustelleDokumente: Signed URLs fehlgeschlagen:", signError);

  const urlByPath = new Map(
    (signed ?? []).map((eintrag) => [eintrag.path, eintrag]),
  );

  return dokumente.map((dokument) => {
    const eintrag = urlByPath.get(dokument.storage_path);
    if (eintrag?.error) {
      console.error(
        "getBaustelleDokumente: Signed URL fehlgeschlagen:",
        dokument.storage_path,
        eintrag.error,
      );
    }
    return { ...dokument, url: eintrag?.signedUrl ?? "" };
  });
}
