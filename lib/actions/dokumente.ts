"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";

const createDokumentSchema = z.object({
  baustelle_id: z.string().uuid(),
  storage_path: z.string().trim().min(1),
  dateiname: z.string().trim().min(1),
  mime_type: z.string().trim().min(1),
  groesse_bytes: z.coerce.number().int().min(0).optional(),
});

export interface DokumentFormState {
  message?: string;
}

export async function createDokument(
  input: z.infer<typeof createDokumentSchema>,
): Promise<DokumentFormState> {
  const validated = createDokumentSchema.safeParse(input);
  if (!validated.success) {
    return { message: "Ungültige Dokumentdaten." };
  }

  const supabase = await createClient();
  const profil = await getUserProfil();

  const { error } = await supabase.from("baustelle_dokumente").insert({
    baustelle_id: validated.data.baustelle_id,
    storage_path: validated.data.storage_path,
    dateiname: validated.data.dateiname,
    mime_type: validated.data.mime_type,
    groesse_bytes: validated.data.groesse_bytes,
    created_by_user_id: profil?.id ?? null,
  });

  if (error) {
    console.error("createDokument fehlgeschlagen:", error);
    return { message: "Dokument konnte nicht gespeichert werden." };
  }

  revalidatePath(`/baustellen/${validated.data.baustelle_id}`);
  return { message: "success" };
}

export async function deleteDokument(baustelleId: string, dokumentId: string) {
  const supabase = await createClient();

  const { data: dokument } = await supabase
    .from("baustelle_dokumente")
    .select("storage_path")
    .eq("id", dokumentId)
    .single();

  if (dokument) {
    await supabase.storage
      .from("baustellen-dokumente")
      .remove([dokument.storage_path]);
  }

  await supabase.from("baustelle_dokumente").delete().eq("id", dokumentId);

  revalidatePath(`/baustellen/${baustelleId}`);
}

export async function setKiKontext(
  baustelleId: string,
  dokumentId: string,
  kiKontext: boolean,
) {
  const supabase = await createClient();
  await supabase
    .from("baustelle_dokumente")
    .update({ ki_kontext: kiKontext })
    .eq("id", dokumentId);

  revalidatePath(`/baustellen/${baustelleId}`);
}
