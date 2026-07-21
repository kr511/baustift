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

export interface DokumentActionResult {
  ok: boolean;
  error?: string;
  warning?: string;
}

const dokumentIdSchema = z.object({
  baustelleId: z.string().uuid(),
  dokumentId: z.string().uuid(),
});

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

export async function deleteDokument(
  baustelleId: string,
  dokumentId: string,
): Promise<DokumentActionResult> {
  const validated = dokumentIdSchema.safeParse({ baustelleId, dokumentId });
  if (!validated.success) {
    return { ok: false, error: "Ungültiges Dokument." };
  }

  const supabase = await createClient();

  const { data: dokument, error: lesenError } = await supabase
    .from("baustelle_dokumente")
    .select("storage_path")
    .eq("id", validated.data.dokumentId)
    .eq("baustelle_id", validated.data.baustelleId)
    .single();

  if (lesenError || !dokument) {
    if (lesenError) console.error("deleteDokument konnte Dokument nicht laden:", lesenError);
    return { ok: false, error: "Dokument wurde nicht gefunden." };
  }

  // Zuerst die DB-Referenz entfernen: Schlägt das Storage-Löschen danach fehl,
  // bleibt höchstens eine nicht mehr erreichbare Datei zurück, aber kein Eintrag
  // mit kaputtem Download-Link.
  const { data: geloescht, error: loeschError } = await supabase
    .from("baustelle_dokumente")
    .delete()
    .eq("id", validated.data.dokumentId)
    .eq("baustelle_id", validated.data.baustelleId)
    .select("id")
    .maybeSingle();

  if (loeschError || !geloescht) {
    if (loeschError) console.error("deleteDokument fehlgeschlagen:", loeschError);
    return { ok: false, error: "Dokument konnte nicht gelöscht werden." };
  }

  const { error: storageError } = await supabase.storage
    .from("baustellen-dokumente")
    .remove([dokument.storage_path]);

  revalidatePath(`/baustellen/${validated.data.baustelleId}`);
  if (storageError) {
    console.error("deleteDokument: Datei konnte nicht entfernt werden:", storageError);
    return {
      ok: true,
      warning: "Der Dokumenteintrag wurde gelöscht, die Datei konnte aber nicht vollständig entfernt werden.",
    };
  }
  return { ok: true };
}

export async function setKiKontext(
  baustelleId: string,
  dokumentId: string,
  kiKontext: boolean,
): Promise<DokumentActionResult> {
  const validated = dokumentIdSchema.safeParse({ baustelleId, dokumentId });
  if (!validated.success || typeof kiKontext !== "boolean") {
    return { ok: false, error: "Ungültige Dokumentdaten." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("baustelle_dokumente")
    .update({ ki_kontext: kiKontext })
    .eq("id", validated.data.dokumentId)
    .eq("baustelle_id", validated.data.baustelleId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("setKiKontext fehlgeschlagen:", error);
    return { ok: false, error: "KI-Kontext konnte nicht gespeichert werden." };
  }

  revalidatePath(`/baustellen/${validated.data.baustelleId}`);
  return { ok: true };
}
