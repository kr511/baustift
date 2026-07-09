"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const baustelleSchema = z.object({
  name: z.string().trim().min(1, "Name ist erforderlich."),
  adresse: z.string().trim().optional(),
  auftraggeber: z.string().trim().optional(),
  notiz: z.string().trim().optional(),
  created_by: z.string().trim().optional(),
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

  const supabase = await createClient();
  const { error } = await supabase.from("baustellen").insert({
    name: validated.data.name,
    adresse: validated.data.adresse || null,
    auftraggeber: validated.data.auftraggeber || null,
    notiz: validated.data.notiz || null,
    created_by: validated.data.created_by || null,
  });

  if (error) {
    return { message: `Baustelle konnte nicht angelegt werden: ${error.message}` };
  }

  revalidatePath("/baustellen");
  revalidatePath("/berichte");
  revalidatePath("/berichte/neu");
  return { message: "success" };
}

export async function setBaustelleStatus(
  baustelleId: string,
  status: "aktiv" | "pausiert" | "abgeschlossen",
) {
  const supabase = await createClient();
  await supabase
    .from("baustellen")
    .update({ status })
    .eq("id", baustelleId);

  revalidatePath("/baustellen");
  revalidatePath("/berichte");
}
