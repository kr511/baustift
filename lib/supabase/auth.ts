import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Verifiziert die Identität am Auth-Server. Der Proxy bleibt nur die schnelle
 * Navigationsschranke; Datenzugriffe und Mutationen rufen diese Prüfung selbst
 * auf, weil Server Actions und Route Handler direkt erreichbar sind.
 *
 * `cache()` dedupliziert die getUser()-Netzwerkanfrage: Layout, Page und
 * Data-Layer rufen diese Funktion pro Request mehrfach auf, sollen dabei
 * aber nur einen einzigen Auth-Server-Roundtrip auslösen.
 */
export const getAuthenticatedClient = cache(async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || user.is_anonymous) {
    return null;
  }

  return { supabase, user };
});
