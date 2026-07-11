import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface UserFirma {
  id: string;
  name: string;
  wordmark: string;
  land: string;
  niederlassung: { id: string; name: string } | null;
}

// Firma des eingeloggten Nutzers (über sein Profil). `cache()` dedupliziert
// die Abfrage pro Request — Header, Druckansicht, PDF und KI-Prompt teilen
// sich einen Lookup. `null`, solange kein Profil existiert (z. B. während
// der Übergangsphase): Aufrufer rendern dann neutrales Baustift-Branding.
export const getUserFirma = cache(async (): Promise<UserFirma | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "firmen(id, name, wordmark, land), niederlassungen(id, name)",
    )
    .eq("id", user.id)
    .single();

  if (!profile?.firmen) return null;

  return {
    id: profile.firmen.id,
    name: profile.firmen.name,
    wordmark: profile.firmen.wordmark,
    land: profile.firmen.land,
    niederlassung: profile.niederlassungen ?? null,
  };
});
