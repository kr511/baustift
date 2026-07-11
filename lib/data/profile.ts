import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProfilRolle } from "@/lib/types/database";

export interface UserProfil {
  id: string;
  displayName: string;
  role: ProfilRolle;
  firmaId: string;
  niederlassungId: string | null;
}

// Profil des eingeloggten Nutzers, pro Request dedupliziert. `null`, wenn
// nicht eingeloggt oder (Übergangsphase) noch kein Profil existiert.
export const getUserProfil = cache(async (): Promise<UserProfil | null> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profil } = await supabase
    .from("profiles")
    .select("id, display_name, role, firma_id, niederlassung_id")
    .eq("id", user.id)
    .single();

  if (!profil) return null;

  return {
    id: profil.id,
    displayName: profil.display_name,
    role: profil.role,
    firmaId: profil.firma_id,
    niederlassungId: profil.niederlassung_id,
  };
});
