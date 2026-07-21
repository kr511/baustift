"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";

const baustelleSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich."),
  adresse: z.string().trim().optional(),
  auftraggeber: z.string().trim().optional(),
  notiz: z.string().trim().optional(),
});

export interface BaustelleFormState {
  errors?: Partial<Record<keyof z.infer<typeof baustelleSchema>, string[]>>;
  message?: string;
}

export interface BaustelleStatusResult {
  ok: boolean;
  error?: string;
}

const baustelleStatusSchema = z.object({
  baustelleId: z.string().uuid(),
  status: z.enum(["aktiv", "pausiert", "abgeschlossen"]),
});

export async function createBaustelle(
  _prevState: BaustelleFormState,
  formData: FormData,
): Promise<BaustelleFormState> {
  const validated = baustelleSchema.safeParse({
    name: formData.get("name"),
    adresse: formData.get("adresse"),
    auftraggeber: formData.get("auftraggeber"),
    notiz: formData.get("notiz"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const profil = await getUserProfil();
  const { error } = await supabase.from("baustellen").insert({
    name: validated.data.name,
    adresse: validated.data.adresse || null,
    auftraggeber: validated.data.auftraggeber || null,
    notiz: validated.data.notiz || null,
    created_by: profil?.displayName ?? null,
    created_by_user_id: profil?.id ?? null,
  });

  if (error) {
    console.error("createBaustelle fehlgeschlagen:", error);
    return { message: "Baustelle konnte nicht angelegt werden. Bitte erneut versuchen." };
  }

  revalidatePath("/baustellen");
  revalidatePath("/berichte");
  revalidatePath("/berichte/neu");
  return { message: "success" };
}

export async function setBaustelleStatus(
  baustelleId: string,
  status: "aktiv" | "pausiert" | "abgeschlossen",
): Promise<BaustelleStatusResult> {
  const validated = baustelleStatusSchema.safeParse({ baustelleId, status });
  if (!validated.success) {
    return { ok: false, error: "Ungültiger Baustellenstatus." };
  }

  const profil = await getUserProfil();
  if (!profil) {
    return { ok: false, error: "Nicht angemeldet." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("baustellen")
    .update({ status: validated.data.status })
    .eq("id", validated.data.baustelleId)
    .eq("firma_id", profil.firmaId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("setBaustelleStatus fehlgeschlagen:", error);
    return { ok: false, error: "Baustellenstatus konnte nicht gespeichert werden." };
  }

  revalidatePath("/baustellen");
  revalidatePath("/berichte");
  return { ok: true };
}
