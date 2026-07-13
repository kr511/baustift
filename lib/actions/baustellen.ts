"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthenticatedClient } from "@/lib/supabase/auth";

const baustelleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name ist erforderlich.")
    .max(300, "Der Name ist zu lang."),
  adresse: z.string().trim().max(500, "Die Adresse ist zu lang.").optional(),
  auftraggeber: z
    .string()
    .trim()
    .max(300, "Der Auftraggeber ist zu lang.")
    .optional(),
  notiz: z.string().trim().max(5_000, "Die Notiz ist zu lang.").optional(),
  created_by: z.string().trim().max(200, "Der Name ist zu lang.").optional(),
});

const baustelleStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["aktiv", "pausiert", "abgeschlossen"]),
});

export interface BaustelleFormState {
  errors?: Partial<Record<keyof z.infer<typeof baustelleSchema>, string[]>>;
  message?: string;
}

export async function createBaustelle(
  _prevState: BaustelleFormState,
  formData: FormData,
): Promise<BaustelleFormState> {
  const validated = baustelleSchema.safeParse({
    name: formData.get("name"),
    adresse: formData.get("adresse"),
    auftraggeber: formData.get("auftraggeber"),
    notiz: formData.get("notiz"),
    created_by: formData.get("created_by"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const auth = await getAuthenticatedClient();
  if (!auth) {
    return { message: "Die Sitzung ist abgelaufen. Bitte neu anmelden." };
  }

  const { error } = await auth.supabase.from("baustellen").insert({
    name: validated.data.name,
    adresse: validated.data.adresse || null,
    auftraggeber: validated.data.auftraggeber || null,
    notiz: validated.data.notiz || null,
    created_by: validated.data.created_by || null,
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
): Promise<{ ok: boolean; error?: string }> {
  const validated = baustelleStatusSchema.safeParse({ id: baustelleId, status });
  if (!validated.success) {
    return { ok: false, error: "Ungültiger Baustellenstatus." };
  }

  const auth = await getAuthenticatedClient();
  if (!auth) return { ok: false, error: "Die Sitzung ist abgelaufen." };

  const { data, error } = await auth.supabase
    .from("baustellen")
    .update({ status: validated.data.status })
    .eq("id", validated.data.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("setBaustelleStatus fehlgeschlagen:", error);
    return {
      ok: false,
      error: error
        ? "Status konnte nicht gespeichert werden."
        : "Baustelle wurde nicht gefunden.",
    };
  }

  revalidatePath("/baustellen");
  revalidatePath("/berichte");
  return { ok: true };
}
