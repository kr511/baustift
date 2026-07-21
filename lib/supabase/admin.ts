import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// Service-Role-Client: umgeht RLS und darf Auth-Admin-Aufrufe (z. B.
// Einladungen) machen. AUSSCHLIESSLICH serverseitig verwenden — der Key darf
// nie in Client-Bundles landen (deshalb kein NEXT_PUBLIC_-Prefix).
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt.");
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
