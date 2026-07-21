import { createClient } from "@/lib/supabase/server";
import type { StilVorlage } from "@/lib/anthropic/generateBericht";

export async function getAktiveStilVorlagen(
  firmaId: string,
): Promise<StilVorlage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stil_vorlagen")
    .select("titel, beispiel_text")
    .eq("firma_id", firmaId)
    .eq("aktiv", true)
    .order("created_at", { ascending: false });

  if (error) console.error("getAktiveStilVorlagen fehlgeschlagen:", error);
  return data ?? [];
}
