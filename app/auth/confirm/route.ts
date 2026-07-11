import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Tauscht den token_hash aus Supabase-E-Mails (Einladung, Passwort-Reset)
// serverseitig gegen eine Session. Die E-Mail-Templates im Supabase-Dashboard
// müssen auf diese Route zeigen, z. B.:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/passwort-zuruecksetzen
// Liegt bewusst außerhalb des proxy.ts-Matchers, damit nicht eingeloggte
// Nutzer sie erreichen.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/berichte";

  // Nur relative Pfade als Redirect-Ziel zulassen (kein Open Redirect).
  const redirectPath = next.startsWith("/") && !next.startsWith("//") ? next : "/berichte";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?fehler=link-ungueltig", request.url),
  );
}
