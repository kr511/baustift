"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";

const vorlageSchema = z.object({
  titel: z.string().trim().min(1, "Titel ist erforderlich.").max(200),
  beispiel_text: z
    .string()
    .trim()
    .min(1, "Beispieltext ist erforderlich.")
    .max(6000, "Maximal 6.000 Zeichen."),
});

export interface VorlageFormState {
  errors?: Partial<Record<keyof z.infer<typeof vorlageSchema>, string[]>>;
  message?: string;
}

export interface VorlageActionResult {
  ok: boolean;
  error?: string;
}

const vorlageAktivSchema = z.object({
  id: z.string().uuid(),
  aktiv: z.boolean(),
});
const vorlageIdSchema = z.string().uuid();

export async function createStilVorlage(
  _prevState: VorlageFormState,
  formData: FormData,
): Promise<VorlageFormState> {
  const profil = await getUserProfil();
  if (profil?.role !== "admin") {
    return { message: "Nur Administratoren können Stil-Vorlagen anlegen." };
  }

  const validated = vorlageSchema.safeParse({
    titel: formData.get("titel"),
    beispiel_text: formData.get("beispiel_text"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("stil_vorlagen").insert({
    firma_id: profil.firmaId,
    titel: validated.data.titel,
    beispiel_text: validated.data.beispiel_text,
    created_by_user_id: profil.id,
  });

  if (error) {
    console.error("createStilVorlage fehlgeschlagen:", error);
    return { message: "Vorlage konnte nicht gespeichert werden." };
  }

  revalidatePath("/admin/vorlagen");
  return { message: "success" };
}

export async function setVorlageAktiv(
  id: string,
  aktiv: boolean,
): Promise<VorlageActionResult> {
  const validated = vorlageAktivSchema.safeParse({ id, aktiv });
  if (!validated.success) return { ok: false, error: "Ungültige Vorlage." };

  const profil = await getUserProfil();
  if (profil?.role !== "admin") {
    return { ok: false, error: "Nur Administratoren können Stil-Vorlagen verwalten." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stil_vorlagen")
    .update({ aktiv: validated.data.aktiv })
    .eq("id", validated.data.id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("setVorlageAktiv fehlgeschlagen:", error);
    return { ok: false, error: "Vorlagenstatus konnte nicht gespeichert werden." };
  }
  revalidatePath("/admin/vorlagen");
  return { ok: true };
}

export async function deleteStilVorlage(id: string): Promise<VorlageActionResult> {
  if (!vorlageIdSchema.safeParse(id).success) {
    return { ok: false, error: "Ungültige Vorlage." };
  }
  const profil = await getUserProfil();
  if (profil?.role !== "admin") {
    return { ok: false, error: "Nur Administratoren können Stil-Vorlagen verwalten." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stil_vorlagen")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("deleteStilVorlage fehlgeschlagen:", error);
    return { ok: false, error: "Vorlage konnte nicht gelöscht werden." };
  }
  revalidatePath("/admin/vorlagen");
  return { ok: true };
}
