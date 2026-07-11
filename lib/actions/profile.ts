"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Name ist erforderlich.")
  .max(100, "Name ist zu lang.");

export interface ProfilFormState {
  errors?: { display_name?: string[] };
  message?: string;
}

export async function updateDisplayName(
  _prevState: ProfilFormState,
  formData: FormData,
): Promise<ProfilFormState> {
  const validated = displayNameSchema.safeParse(formData.get("display_name"));
  if (!validated.success) {
    return {
      errors: { display_name: validated.error.issues.map((i) => i.message) },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { message: "Nicht angemeldet." };
  }

  // Bewusst nur display_name — die RLS-Policy erlaubt zwar Updates auf der
  // eigenen Zeile, das Spalten-Whitelisting (keine role-/firma-Änderung)
  // passiert hier.
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: validated.data })
    .eq("id", user.id);

  if (error) {
    console.error("updateDisplayName fehlgeschlagen:", error);
    return { message: "Name konnte nicht gespeichert werden." };
  }

  revalidatePath("/konto");
  return { message: "success" };
}
