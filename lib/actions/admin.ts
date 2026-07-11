"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProfil } from "@/lib/data/profile";

const einladungSchema = z.object({
  email: z.string().trim().email("Bitte eine gültige E-Mail-Adresse angeben."),
  display_name: z.string().trim().min(1, "Name ist erforderlich.").max(100),
  role: z.enum(["admin", "nutzer"]),
});

export interface EinladungFormState {
  errors?: Partial<Record<keyof z.infer<typeof einladungSchema>, string[]>>;
  message?: string;
}

export async function inviteNutzer(
  _prevState: EinladungFormState,
  formData: FormData,
): Promise<EinladungFormState> {
  // Die Seite ist zwar admin-gated, aber Server Actions sind auch per
  // direktem POST erreichbar — die Rolle wird hier immer erneut geprüft.
  const profil = await getUserProfil();
  if (profil?.role !== "admin") {
    return { message: "Nur Administratoren können Nutzer einladen." };
  }

  const validated = einladungSchema.safeParse({
    email: formData.get("email"),
    display_name: formData.get("display_name"),
    role: formData.get("role"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const adminClient = createAdminClient();
  // display_name/role/firma_id landen in raw_user_meta_data und werden vom
  // handle_new_user-Trigger (Migration 0004/0008) ins Profil übernommen.
  // firma_id ist bewusst immer die des einladenden Admins — über die App
  // kann niemand einen Nutzer einer anderen Firma zuordnen. Eine neue Firma
  // onboarden geht weiterhin nur per Dashboard/SQL durch den Betreiber.
  const { error } = await adminClient.auth.admin.inviteUserByEmail(
    validated.data.email,
    {
      data: {
        display_name: validated.data.display_name,
        role: validated.data.role,
        firma_id: profil.firmaId,
      },
    },
  );

  if (error) {
    console.error("inviteNutzer fehlgeschlagen:", error);
    return {
      message:
        error.code === "email_exists"
          ? "Für diese E-Mail-Adresse existiert bereits ein Konto."
          : "Einladung konnte nicht gesendet werden. Bitte erneut versuchen.",
    };
  }

  revalidatePath("/admin/nutzer");
  return { message: "success" };
}
