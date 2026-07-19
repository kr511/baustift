"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";

const berichtIdSchema = z.string().uuid();

const personalZeileSchema = z.object({
  name: z.string().trim().min(1),
  stunden: z.coerce.number().min(0).max(24),
  taetigkeit: z.string().trim().optional(),
});

const materialZeileSchema = z.object({
  bezeichnung: z.string().trim().min(1),
  menge: z.string().trim().optional(),
  typ: z.enum(["material", "geraet"]),
});

const fotoZeileSchema = z.object({
  storage_path: z.string().trim().min(1),
  dateiname: z.string().trim().optional(),
});

const tagesberichtSchema = z.object({
  baustelle_id: z.string().uuid("Bitte eine Baustelle auswählen."),
  datum: z.string().min(1, "Datum ist erforderlich."),
  wetter: z.string().trim().min(1, "Wetter ist erforderlich."),
  stichpunkte: z.string().trim().min(1, "Stichpunkte sind erforderlich."),
  personal_json: z.string().optional(),
  material_json: z.string().optional(),
  foto_json: z.string().optional(),
});

export interface TagesberichtFormState {
  errors?: Partial<
    Record<keyof z.infer<typeof tagesberichtSchema>, string[]>
  >;
  message?: string;
  success?: boolean;
  redirectTo?: string;
}

type ParsedJsonArray<T> =
  | { success: true; data: T[] }
  | { success: false; error: string };

function parseJsonArray<T>(
  raw: string | undefined,
  schema: z.ZodType<T>,
  label: string,
): ParsedJsonArray<T> {
  if (!raw) return { success: true, data: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { success: false, error: `${label} konnten nicht gelesen werden.` };
  }

  if (!Array.isArray(parsed)) {
    return { success: false, error: `${label} müssen als Liste übertragen werden.` };
  }

  const validated = z.array(schema).safeParse(parsed);
  if (!validated.success) {
    return {
      success: false,
      error: `${label} enthalten ungültige Angaben. Bitte alle Zeilen prüfen.`,
    };
  }
  return { success: true, data: validated.data };
}

type TagesberichtZeilen = {
  personal: z.infer<typeof personalZeileSchema>[];
  material: z.infer<typeof materialZeileSchema>[];
  fotos: z.infer<typeof fotoZeileSchema>[];
};

function parseTagesberichtZeilen(
  data: z.infer<typeof tagesberichtSchema>,
):
  | { success: true; data: TagesberichtZeilen }
  | { success: false; state: TagesberichtFormState } {
  const personal = parseJsonArray(data.personal_json, personalZeileSchema, "Personal");
  const material = parseJsonArray(data.material_json, materialZeileSchema, "Material und Geräte");
  const fotos = parseJsonArray(data.foto_json, fotoZeileSchema, "Fotos");

  if (!personal.success) {
    return { success: false, state: { errors: { personal_json: [personal.error] } } };
  }
  if (!material.success) {
    return { success: false, state: { errors: { material_json: [material.error] } } };
  }
  if (!fotos.success) {
    return { success: false, state: { errors: { foto_json: [fotos.error] } } };
  }

  return {
    success: true,
    data: {
      personal: personal.data,
      material: material.data,
      fotos: fotos.data,
    },
  };
}

function getValidatedFormData(formData: FormData) {
  return tagesberichtSchema.safeParse({
    baustelle_id: formData.get("baustelle_id"),
    datum: formData.get("datum"),
    wetter: formData.get("wetter"),
    stichpunkte: formData.get("stichpunkte"),
    personal_json: formData.get("personal_json"),
    material_json: formData.get("material_json"),
    foto_json: formData.get("foto_json"),
  });
}

export async function createTagesbericht(
  _prevState: TagesberichtFormState,
  formData: FormData,
): Promise<TagesberichtFormState> {
  const validated = getValidatedFormData(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const zeilen = parseTagesberichtZeilen(validated.data);
  if (!zeilen.success) return zeilen.state;

  const supabase = await createClient();
  const profil = await getUserProfil();
  const { data: berichtId, error } = await supabase.rpc(
    "create_tagesbericht_mit_zeilen",
    {
      p_baustelle_id: validated.data.baustelle_id,
      p_datum: validated.data.datum,
      p_wetter: validated.data.wetter,
      p_stichpunkte: validated.data.stichpunkte,
      p_created_by: profil?.displayName ?? null,
      p_created_by_user_id: profil?.id ?? null,
      p_personal: zeilen.data.personal,
      p_material: zeilen.data.material,
      p_fotos: zeilen.data.fotos,
    },
  );

  if (error || !berichtId) {
    console.error("createTagesbericht fehlgeschlagen:", error);
    return {
      message: "Tagesbericht konnte nicht angelegt werden. Bitte erneut versuchen.",
    };
  }

  revalidatePath("/berichte");
  return { success: true, redirectTo: `/berichte/${berichtId}` };
}

export async function updateTagesbericht(
  id: string,
  _prevState: TagesberichtFormState,
  formData: FormData,
): Promise<TagesberichtFormState> {
  if (!berichtIdSchema.safeParse(id).success) {
    return { message: "Ungültiger Tagesbericht." };
  }

  const validated = getValidatedFormData(formData);
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const zeilen = parseTagesberichtZeilen(validated.data);
  if (!zeilen.success) return zeilen.state;

  const supabase = await createClient();

  // Frühe, verständliche Rückmeldung; die RPC prüft den Status zusätzlich
  // atomar, damit zwischen dieser Abfrage und dem Schreiben nichts durchrutscht.
  const { data: bestehend } = await supabase
    .from("tagesberichte")
    .select("status")
    .eq("id", id)
    .single();

  if (bestehend?.status === "final") {
    return {
      message:
        "Der Bericht ist finalisiert und kann nicht mehr bearbeitet werden.",
    };
  }

  const { data: aktualisiert, error } = await supabase.rpc(
    "update_tagesbericht_mit_zeilen",
    {
      p_tagesbericht_id: id,
      p_baustelle_id: validated.data.baustelle_id,
      p_datum: validated.data.datum,
      p_wetter: validated.data.wetter,
      p_stichpunkte: validated.data.stichpunkte,
      p_personal: zeilen.data.personal,
      p_material: zeilen.data.material,
      p_fotos: zeilen.data.fotos,
    },
  );

  if (error) {
    console.error("updateTagesbericht fehlgeschlagen:", error);
    return { message: "Tagesbericht konnte nicht gespeichert werden. Bitte erneut versuchen." };
  }
  if (!aktualisiert) {
    return { message: "Der Bericht ist finalisiert und kann nicht mehr bearbeitet werden." };
  }

  revalidatePath("/berichte");
  revalidatePath(`/berichte/${id}`);
  return { success: true, redirectTo: `/berichte/${id}` };
}

export interface BerichtTextSpeichernResult {
  ok: boolean;
  error?: string;
}

export async function updateBerichtText(
  id: string,
  berichtText: string,
): Promise<BerichtTextSpeichernResult> {
  if (!berichtIdSchema.safeParse(id).success) {
    return { ok: false, error: "Ungültiger Tagesbericht." };
  }

  const supabase = await createClient();
  const { data: bestehend, error: bestehendError } = await supabase
    .from("tagesberichte")
    .select("status")
    .eq("id", id)
    .single();

  if (bestehendError || !bestehend) {
    return { ok: false, error: "Tagesbericht wurde nicht gefunden." };
  }
  if (bestehend.status === "final") {
    return {
      ok: false,
      error: "Der Bericht ist finalisiert und kann nicht mehr geändert werden.",
    };
  }

  // Der Statusfilter schützt auch gegen eine zeitgleiche Finalisierung nach
  // der obigen Prüfung.
  const { data: gespeichert, error } = await supabase
    .from("tagesberichte")
    .update({ bericht_text: berichtText })
    .eq("id", id)
    .eq("status", "entwurf")
    .select("id")
    .maybeSingle();

  if (error || !gespeichert) {
    if (error) console.error("updateBerichtText fehlgeschlagen:", error);
    return {
      ok: false,
      error: "Bericht konnte nicht gespeichert werden, weil er inzwischen finalisiert wurde.",
    };
  }

  revalidatePath(`/berichte/${id}`);
  return { ok: true };
}

export async function finalisiereTagesbericht(
  id: string,
): Promise<BerichtTextSpeichernResult> {
  if (!berichtIdSchema.safeParse(id).success) {
    return { ok: false, error: "Ungültiger Tagesbericht." };
  }

  const supabase = await createClient();
  const { data: finalisiert, error } = await supabase
    .from("tagesberichte")
    .update({ status: "final" })
    .eq("id", id)
    .eq("status", "entwurf")
    .select("id")
    .maybeSingle();

  if (error || !finalisiert) {
    if (error) console.error("finalisiereTagesbericht fehlgeschlagen:", error);
    return {
      ok: false,
      error: "Tagesbericht konnte nicht finalisiert werden. Bitte Seite aktualisieren und erneut versuchen.",
    };
  }

  revalidatePath(`/berichte/${id}`);
  revalidatePath("/berichte");
  return { ok: true };
}
