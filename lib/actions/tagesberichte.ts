"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthenticatedClient } from "@/lib/supabase/auth";

const personalZeileSchema = z.object({
  name: z.string().trim().min(1).max(200),
  stunden: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce
      .number({ error: "Bitte eine gültige Stundenzahl angeben." })
      .min(0)
      .max(24),
  ),
  taetigkeit: z.string().trim().max(500).optional(),
});

const materialZeileSchema = z.object({
  bezeichnung: z.string().trim().min(1).max(300),
  menge: z.string().trim().max(300).optional(),
  typ: z.enum(["material", "geraet"]),
});

const fotoZeileSchema = z.object({
  storage_path: z
    .string()
    .trim()
    .max(1000)
    .regex(
      /^entwuerfe\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}-[A-Za-z0-9._-]+$/,
    ),
  dateiname: z.string().trim().max(500).optional(),
});

const tagesberichtSchema = z.object({
  baustelle_id: z.string().uuid("Bitte eine Baustelle auswählen."),
  datum: z.iso.date("Bitte ein gültiges Datum angeben."),
  wetter: z
    .string()
    .trim()
    .min(1, "Wetter ist erforderlich.")
    .max(500, "Die Wetterangabe ist zu lang."),
  stichpunkte: z
    .string()
    .trim()
    .min(1, "Stichpunkte sind erforderlich.")
    .max(20_000, "Die Stichpunkte sind zu lang."),
  created_by: z.string().trim().max(200, "Der Name ist zu lang.").optional(),
  personal_json: z.string(),
  material_json: z.string(),
  foto_json: z.string(),
});

type TagesberichtFormFeld = keyof z.infer<typeof tagesberichtSchema>;

export interface TagesberichtFormState {
  errors?: Partial<Record<TagesberichtFormFeld, string[]>>;
  message?: string;
}

type PersonalZeile = z.infer<typeof personalZeileSchema>;
type MaterialZeile = z.infer<typeof materialZeileSchema>;
type FotoZeile = z.infer<typeof fotoZeileSchema>;

function parseJsonArray<T>(
  raw: string,
  schema: z.ZodType<T[]>,
): { data: T[] } | { error: string } {
  try {
    const parsed: unknown = JSON.parse(raw);
    const validated = schema.safeParse(parsed);
    if (!validated.success) {
      return { error: "Mindestens eine Zeile enthält ungültige Angaben." };
    }
    return { data: validated.data };
  } catch {
    return { error: "Die übermittelten Listendaten sind ungültig." };
  }
}

function validiereFormData(formData: FormData):
  | {
      data: z.infer<typeof tagesberichtSchema>;
      personal: PersonalZeile[];
      material: MaterialZeile[];
      fotos: FotoZeile[];
    }
  | { state: TagesberichtFormState } {
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
    return { state: { errors: validated.error.flatten().fieldErrors } };
  }

  const personal = parseJsonArray(
    validated.data.personal_json,
    z.array(personalZeileSchema).max(100),
  );
  const material = parseJsonArray(
    validated.data.material_json,
    z.array(materialZeileSchema).max(100),
  );
  const fotos = parseJsonArray(
    validated.data.foto_json,
    z.array(fotoZeileSchema).max(30),
  );

  const errors: TagesberichtFormState["errors"] = {};
  if ("error" in personal) errors.personal_json = [personal.error];
  if ("error" in material) errors.material_json = [material.error];
  if ("error" in fotos) errors.foto_json = [fotos.error];

  if ("error" in personal || "error" in material || "error" in fotos) {
    return {
      state: {
        errors,
        message:
          "Personal, Material oder Fotos enthalten ungültige Angaben. Bitte prüfen und erneut speichern.",
      },
    };
  }

  return {
    data: validated.data,
    personal: personal.data,
    material: material.data,
    fotos: fotos.data,
  };
}

function rpcFehlerNachricht(code?: string): string {
  if (code === "42501") return "Die Sitzung ist abgelaufen. Bitte neu anmelden.";
  if (code === "P0004") {
    return "Mindestens ein Foto wurde nicht gefunden oder gehört nicht zu dieser Sitzung. Bitte die Fotoauswahl prüfen.";
  }
  if (code === "55000") {
    return "Der Tagesbericht ist bereits final und kann nicht mehr geändert werden.";
  }
  if (code === "P0002") return "Der Tagesbericht wurde nicht gefunden.";
  if (code === "23503") return "Die ausgewählte Baustelle wurde nicht gefunden.";
  if (code === "40001") {
    return "Der Tagesbericht wurde inzwischen an anderer Stelle geändert. Bitte die Seite neu laden und die Eingaben erneut prüfen.";
  }
  return "Tagesbericht konnte nicht gespeichert werden. Bitte erneut versuchen.";
}

async function entferneFotos(
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthenticatedClient>>>["supabase"],
  paths: string[],
) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from("tagesbericht-fotos").remove(paths);
  if (error) console.error("Foto-Bereinigung fehlgeschlagen:", error);
}

export async function createTagesbericht(
  _prevState: TagesberichtFormState,
  formData: FormData,
): Promise<TagesberichtFormState> {
  const eingabe = validiereFormData(formData);
  if ("state" in eingabe) return eingabe.state;

  const auth = await getAuthenticatedClient();
  if (!auth) {
    return { message: "Die Sitzung ist abgelaufen. Bitte neu anmelden." };
  }

  const { data: berichtId, error } = await auth.supabase.rpc(
    "speichere_tagesbericht",
    {
      p_id: null,
      p_erwartete_updated_at: null,
      p_baustelle_id: eingabe.data.baustelle_id,
      p_datum: eingabe.data.datum,
      p_wetter: eingabe.data.wetter,
      p_stichpunkte: eingabe.data.stichpunkte,
      p_created_by: eingabe.data.created_by || null,
      p_personal: eingabe.personal,
      p_material: eingabe.material,
      p_fotos: eingabe.fotos,
    },
  );

  if (error || !berichtId) {
    console.error("createTagesbericht fehlgeschlagen:", error);
    return { message: rpcFehlerNachricht(error?.code) };
  }

  revalidatePath("/berichte");
  redirect(`/berichte/${berichtId}`);
}

export async function updateTagesbericht(
  id: string,
  erwarteteUpdatedAt: string,
  _prevState: TagesberichtFormState,
  formData: FormData,
): Promise<TagesberichtFormState> {
  const version = z
    .object({
      id: z.string().uuid(),
      updatedAt: z.iso.datetime({ offset: true }),
    })
    .safeParse({ id, updatedAt: erwarteteUpdatedAt });
  if (!version.success) return { message: "Ungültiger Tagesbericht." };

  const eingabe = validiereFormData(formData);
  if ("state" in eingabe) return eingabe.state;

  const auth = await getAuthenticatedClient();
  if (!auth) {
    return { message: "Die Sitzung ist abgelaufen. Bitte neu anmelden." };
  }

  const { data: vorhandeneFotos, error: fotoLeseFehler } = await auth.supabase
    .from("tagesbericht_fotos")
    .select("storage_path")
    .eq("tagesbericht_id", version.data.id);

  if (fotoLeseFehler) {
    console.error("Vorhandene Fotos konnten nicht gelesen werden:", fotoLeseFehler);
    return { message: "Tagesbericht konnte nicht vorbereitet werden. Bitte erneut versuchen." };
  }

  const altePfade = new Set((vorhandeneFotos ?? []).map((foto) => foto.storage_path));
  const neuePfade = new Set(eingabe.fotos.map((foto) => foto.storage_path));

  const { error } = await auth.supabase.rpc("speichere_tagesbericht", {
    p_id: version.data.id,
    p_erwartete_updated_at: version.data.updatedAt,
    p_baustelle_id: eingabe.data.baustelle_id,
    p_datum: eingabe.data.datum,
    p_wetter: eingabe.data.wetter,
    p_stichpunkte: eingabe.data.stichpunkte,
    p_created_by: eingabe.data.created_by || null,
    p_personal: eingabe.personal,
    p_material: eingabe.material,
    p_fotos: eingabe.fotos,
  });

  if (error) {
    console.error("updateTagesbericht fehlgeschlagen:", error);
    return { message: rpcFehlerNachricht(error.code) };
  }

  await entferneFotos(
    auth.supabase,
    [...altePfade].filter((path) => !neuePfade.has(path)),
  );

  revalidatePath("/berichte");
  revalidatePath(`/berichte/${version.data.id}`);
  redirect(`/berichte/${version.data.id}`);
}

export interface MutationResult {
  ok: boolean;
  error?: string;
  updatedAt?: string;
}

export async function updateBerichtText(
  id: string,
  berichtText: string,
  erwarteteUpdatedAt: string,
): Promise<MutationResult> {
  const validated = z
    .object({
      id: z.string().uuid(),
      berichtText: z.string().trim().min(1).max(50_000),
      updatedAt: z.iso.datetime({ offset: true }),
    })
    .safeParse({ id, berichtText, updatedAt: erwarteteUpdatedAt });

  if (!validated.success) {
    return { ok: false, error: "Der Berichtstext ist leer oder zu lang." };
  }

  const auth = await getAuthenticatedClient();
  if (!auth) return { ok: false, error: "Die Sitzung ist abgelaufen." };

  const { data: updatedAt, error } = await auth.supabase.rpc("speichere_bericht_text", {
    p_id: validated.data.id,
    p_bericht_text: validated.data.berichtText,
    p_erwartete_updated_at: validated.data.updatedAt,
  });

  if (error) {
    console.error("updateBerichtText fehlgeschlagen:", error);
    return {
      ok: false,
      error:
        error.code === "55000"
          ? "Finalisierte Tagesberichte können nicht mehr geändert werden."
          : rpcFehlerNachricht(error.code),
    };
  }

  revalidatePath(`/berichte/${validated.data.id}`);
  if (!updatedAt) return { ok: false, error: "Bericht konnte nicht gespeichert werden." };
  return { ok: true, updatedAt };
}

export async function finalisiereTagesbericht(
  id: string,
  erwarteteUpdatedAt: string,
): Promise<MutationResult> {
  const validated = z
    .object({
      id: z.string().uuid(),
      updatedAt: z.iso.datetime({ offset: true }),
    })
    .safeParse({ id, updatedAt: erwarteteUpdatedAt });
  if (!validated.success) return { ok: false, error: "Ungültiger Tagesbericht." };

  const auth = await getAuthenticatedClient();
  if (!auth) return { ok: false, error: "Die Sitzung ist abgelaufen." };

  const { data: updatedAt, error } = await auth.supabase.rpc("finalisiere_tagesbericht", {
    p_id: validated.data.id,
    p_erwartete_updated_at: validated.data.updatedAt,
  });

  if (error) {
    console.error("finalisiereTagesbericht fehlgeschlagen:", error);
    return {
      ok: false,
      error:
        error.code === "23514"
          ? "Vor dem Finalisieren muss ein Berichtstext gespeichert sein."
          : rpcFehlerNachricht(error.code),
    };
  }

  if (!updatedAt) return { ok: false, error: "Tagesbericht konnte nicht finalisiert werden." };

  revalidatePath(`/berichte/${validated.data.id}`);
  revalidatePath("/berichte");
  return { ok: true, updatedAt };
}
