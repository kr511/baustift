import { createClient } from "@/lib/supabase/server";

export interface TagesberichtVollstaendig {
  id: string;
  datum: string;
  wetter: string;
  stichpunkte: string;
  bericht_text: string | null;
  status: "entwurf" | "final";
  created_by: string | null;
  updated_at: string;
  baustelle: { id: string; name: string } | null;
  personal: { name: string; stunden: number; taetigkeit: string | null }[];
  material: { bezeichnung: string; menge: string | null; typ: "material" | "geraet" }[];
  fotos: { storage_path: string; dateiname: string | null; url: string }[];
}

export async function getTagesberichtVollstaendig(
  id: string,
): Promise<TagesberichtVollstaendig | null> {
  const supabase = await createClient();

  const { data: bericht } = await supabase
    .from("tagesberichte")
    .select(
      "id, datum, wetter, stichpunkte, bericht_text, status, created_by, updated_at, baustellen(id, name)",
    )
    .eq("id", id)
    .single();

  if (!bericht) return null;

  const [{ data: personal }, { data: material }, { data: fotos }] = await Promise.all([
    supabase
      .from("tagesbericht_personal")
      .select("name, stunden, taetigkeit")
      .eq("tagesbericht_id", id),
    supabase
      .from("tagesbericht_material")
      .select("bezeichnung, menge, typ")
      .eq("tagesbericht_id", id),
    supabase
      .from("tagesbericht_fotos")
      .select("storage_path, dateiname")
      .eq("tagesbericht_id", id),
  ]);

  const fotosMitUrl = await Promise.all(
    (fotos ?? []).map(async (foto) => {
      const { data: signed } = await supabase.storage
        .from("tagesbericht-fotos")
        .createSignedUrl(foto.storage_path, 60 * 60);
      return {
        storage_path: foto.storage_path,
        dateiname: foto.dateiname,
        url: signed?.signedUrl ?? "",
      };
    }),
  );

  return {
    id: bericht.id,
    datum: bericht.datum,
    wetter: bericht.wetter,
    stichpunkte: bericht.stichpunkte,
    bericht_text: bericht.bericht_text,
    status: bericht.status,
    created_by: bericht.created_by,
    updated_at: bericht.updated_at,
    baustelle: bericht.baustellen,
    personal: personal ?? [],
    material: material ?? [],
    fotos: fotosMitUrl,
  };
}
