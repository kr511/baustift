import { z } from "zod";
import { getAuthenticatedClient } from "@/lib/supabase/auth";

export interface TagesberichtVollstaendig {
  id: string;
  datum: string;
  wetter: string;
  stichpunkte: string;
  bericht_text: string | null;
  status: "entwurf" | "final";
  updated_at: string;
  created_by: string | null;
  baustelle: { id: string; name: string } | null;
  personal: { name: string; stunden: number; taetigkeit: string | null }[];
  material: { bezeichnung: string; menge: string | null; typ: "material" | "geraet" }[];
  fotos: { storage_path: string; dateiname: string | null; url: string }[];
}

export async function getTagesberichtVollstaendig(
  id: string,
): Promise<TagesberichtVollstaendig | null> {
  const validatedId = z.string().uuid().safeParse(id);
  if (!validatedId.success) return null;

  const auth = await getAuthenticatedClient();
  if (!auth) throw new Error("Nicht angemeldet.");

  const { data: bericht, error: berichtError } = await auth.supabase
    .from("tagesberichte")
    .select(
      "id, datum, wetter, stichpunkte, bericht_text, status, updated_at, created_by, baustelle_name_snapshot, baustellen(id, name), tagesbericht_personal(name, stunden, taetigkeit), tagesbericht_material(bezeichnung, menge, typ), tagesbericht_fotos(storage_path, dateiname)",
    )
    .eq("id", validatedId.data)
    .maybeSingle();

  if (berichtError) {
    console.error("Tagesbericht konnte nicht geladen werden:", berichtError);
    throw new Error("Tagesbericht konnte nicht geladen werden.");
  }

  if (!bericht) return null;

  const fotoPfade = bericht.tagesbericht_fotos.map((foto) => foto.storage_path);
  const { data: signierteUrls, error: signierFehler } =
    fotoPfade.length > 0
      ? await auth.supabase.storage
          .from("tagesbericht-fotos")
          .createSignedUrls(fotoPfade, 60 * 60)
      : { data: [], error: null };

  if (signierFehler) {
    console.error("Foto-URLs konnten nicht erstellt werden:", signierFehler);
  }

  const urlNachPfad = new Map(
    (signierteUrls ?? []).map((eintrag) => [eintrag.path, eintrag]),
  );

  const fotosMitUrl = bericht.tagesbericht_fotos.map((foto) => {
    const eintrag = urlNachPfad.get(foto.storage_path);
    if (!eintrag || eintrag.error) {
      console.error("Foto-URL konnte nicht erstellt werden:", {
        storagePath: foto.storage_path,
        error: eintrag?.error,
      });
    }
    return {
      storage_path: foto.storage_path,
      dateiname: foto.dateiname,
      url: eintrag?.signedUrl ?? "",
    };
  });

  const baustelle = bericht.baustellen
    ? {
        ...bericht.baustellen,
        name:
          bericht.status === "final"
            ? (bericht.baustelle_name_snapshot ?? bericht.baustellen.name)
            : bericht.baustellen.name,
      }
    : null;

  return {
    id: bericht.id,
    datum: bericht.datum,
    wetter: bericht.wetter,
    stichpunkte: bericht.stichpunkte,
    bericht_text: bericht.bericht_text,
    status: bericht.status,
    updated_at: bericht.updated_at,
    created_by: bericht.created_by,
    baustelle,
    personal: bericht.tagesbericht_personal,
    material: bericht.tagesbericht_material,
    fotos: fotosMitUrl,
  };
}
