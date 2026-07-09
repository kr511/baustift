"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
  created_by: z.string().trim().optional(),
  personal_json: z.string().optional(),
  material_json: z.string().optional(),
  foto_json: z.string().optional(),
});

export interface TagesberichtFormState {
  errors?: Partial<
    Record<keyof z.infer<typeof tagesberichtSchema>, string[]>
  >;
  message?: string;
}

function parseJsonArray<T>(
  raw: string | undefined,
  schema: z.ZodType<T>,
): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => schema.safeParse(item))
      .filter((result): result is z.ZodSafeParseSuccess<T> => result.success)
      .map((result) => result.data);
  } catch {
    return [];
  }
}

export async function createTagesbericht(
  _prevState: TagesberichtFormState,
  formData: FormData,
): Promise<TagesberichtFormState> {
  const validated = tagesberichtSchema.safeParse({
    baustelle_id: formData.get("baustelle_id"),
    datum: formData.get("datum"),
    wetter: formData.get("wetter"),
    stichpunkte: formData.get("stichpunkte"),
    created_by: formData.get("created_by"),
    personal_json: formData.get("personal_json"),
    material_json: formData.get("material_json"),
    foto_json: formData.get("foto_json"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const personal = parseJsonArray(validated.data.personal_json, personalZeileSchema);
  const material = parseJsonArray(validated.data.material_json, materialZeileSchema);
  const fotos = parseJsonArray(validated.data.foto_json, fotoZeileSchema);

  const supabase = await createClient();

  const { data: bericht, error } = await supabase
    .from("tagesberichte")
    .insert({
      baustelle_id: validated.data.baustelle_id,
      datum: validated.data.datum,
      wetter: validated.data.wetter,
      stichpunkte: validated.data.stichpunkte,
      created_by: validated.data.created_by || null,
    })
    .select("id")
    .single();

  if (error || !bericht) {
    return {
      message: `Tagesbericht konnte nicht angelegt werden: ${error?.message ?? "unbekannter Fehler"}`,
    };
  }

  if (personal.length > 0) {
    await supabase.from("tagesbericht_personal").insert(
      personal.map((p) => ({
        tagesbericht_id: bericht.id,
        name: p.name,
        stunden: p.stunden,
        taetigkeit: p.taetigkeit || null,
      })),
    );
  }

  if (material.length > 0) {
    await supabase.from("tagesbericht_material").insert(
      material.map((m) => ({
        tagesbericht_id: bericht.id,
        bezeichnung: m.bezeichnung,
        menge: m.menge || null,
        typ: m.typ,
      })),
    );
  }

  if (fotos.length > 0) {
    await supabase.from("tagesbericht_fotos").insert(
      fotos.map((f) => ({
        tagesbericht_id: bericht.id,
        storage_path: f.storage_path,
        dateiname: f.dateiname || null,
      })),
    );
  }

  revalidatePath("/berichte");
  redirect(`/berichte/${bericht.id}`);
}

export async function updateTagesbericht(
  id: string,
  _prevState: TagesberichtFormState,
  formData: FormData,
): Promise<TagesberichtFormState> {
  const validated = tagesberichtSchema.safeParse({
    baustelle_id: formData.get("baustelle_id"),
    datum: formData.get("datum"),
    wetter: formData.get("wetter"),
    stichpunkte: formData.get("stichpunkte"),
    created_by: formData.get("created_by"),
    personal_json: formData.get("personal_json"),
    material_json: formData.get("material_json"),
    foto_json: formData.get("foto_json"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const personal = parseJsonArray(validated.data.personal_json, personalZeileSchema);
  const material = parseJsonArray(validated.data.material_json, materialZeileSchema);
  const fotos = parseJsonArray(validated.data.foto_json, fotoZeileSchema);

  const supabase = await createClient();

  const { error } = await supabase
    .from("tagesberichte")
    .update({
      baustelle_id: validated.data.baustelle_id,
      datum: validated.data.datum,
      wetter: validated.data.wetter,
      stichpunkte: validated.data.stichpunkte,
      created_by: validated.data.created_by || null,
    })
    .eq("id", id);

  if (error) {
    return { message: `Tagesbericht konnte nicht gespeichert werden: ${error.message}` };
  }

  // Zeilenlisten werden komplett ersetzt statt einzeln abgeglichen — bei der
  // geringen Zeilenzahl pro Bericht einfacher und robuster als ein Diff.
  await supabase.from("tagesbericht_personal").delete().eq("tagesbericht_id", id);
  if (personal.length > 0) {
    await supabase.from("tagesbericht_personal").insert(
      personal.map((p) => ({
        tagesbericht_id: id,
        name: p.name,
        stunden: p.stunden,
        taetigkeit: p.taetigkeit || null,
      })),
    );
  }

  await supabase.from("tagesbericht_material").delete().eq("tagesbericht_id", id);
  if (material.length > 0) {
    await supabase.from("tagesbericht_material").insert(
      material.map((m) => ({
        tagesbericht_id: id,
        bezeichnung: m.bezeichnung,
        menge: m.menge || null,
        typ: m.typ,
      })),
    );
  }

  await supabase.from("tagesbericht_fotos").delete().eq("tagesbericht_id", id);
  if (fotos.length > 0) {
    await supabase.from("tagesbericht_fotos").insert(
      fotos.map((f) => ({
        tagesbericht_id: id,
        storage_path: f.storage_path,
        dateiname: f.dateiname || null,
      })),
    );
  }

  revalidatePath("/berichte");
  redirect(`/berichte/${id}`);
}

export async function updateBerichtText(id: string, berichtText: string) {
  const supabase = await createClient();
  await supabase
    .from("tagesberichte")
    .update({ bericht_text: berichtText })
    .eq("id", id);

  revalidatePath(`/berichte/${id}`);
}

export async function finalisiereTagesbericht(id: string) {
  const supabase = await createClient();
  await supabase
    .from("tagesberichte")
    .update({ status: "final" })
    .eq("id", id);

  revalidatePath(`/berichte/${id}`);
  revalidatePath("/berichte");
}
