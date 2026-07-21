import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { istVertrauenswuerdigerUrsprung } from "@/lib/security/originGuard";

// Supabase-Origin(s) für die CSP aus der öffentlichen URL ableiten, damit
// img-/connect-src das eigene Projekt (inkl. Realtime-WebSocket) erlauben.
function supabaseQuellen(): { http: string[]; websocket: string[] } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { http: [], websocket: [] };
  try {
    const origin = new URL(url).origin;
    return { http: [origin], websocket: [origin.replace(/^http/, "ws")] };
  } catch {
    return { http: [], websocket: [] };
  }
}

// Strikte CSP für die authentifizierten, dynamisch gerenderten App-Routen:
// script-src erlaubt nur noch eine per-Request-Nonce + 'strict-dynamic' und
// KEIN 'unsafe-inline' mehr — damit wird Inline-Script-Injection (der klassische
// XSS-Vektor) wirkungslos, selbst wenn irgendwo unescapter Markup landete.
// style-src bleibt bewusst 'unsafe-inline': CSS-Injection ist gegenüber
// Skript-Ausführung harmlos und so brechen die von Tailwind/Next injizierten
// Inline-Styles nicht.
function baueNonceCsp(nonce: string): string {
  const q = supabaseQuellen();
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    `img-src 'self' data: blob: ${q.http.join(" ")}`.trim(),
    `connect-src 'self' ${[...q.http, ...q.websocket].join(" ")}`.trim(),
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const istApiPfad =
    request.nextUrl.pathname === "/api" ||
    request.nextUrl.pathname.startsWith("/api/");

  // CSRF-Schutz für zustandsändernde API-Aufrufe: Cross-Site-Schreibzugriffe
  // werden abgewiesen, bevor Cookies gelesen oder Supabase kontaktiert wird.
  if (istApiPfad && !istVertrauenswuerdigerUrsprung(request)) {
    return NextResponse.json(
      { error: "Anfrage von nicht vertrauenswürdigem Ursprung abgelehnt." },
      { status: 403 },
    );
  }

  // Per-Request-Nonce nur in Produktion (Dev braucht für React 'unsafe-eval'
  // und die App läuft dort wie bisher ohne CSP). Die Nonce wird als Request-
  // Header gesetzt, damit Next sie beim SSR in die eigenen <script>-Tags
  // injiziert; zusätzlich als Antwort-Header, der die Policy erzwingt.
  const nonce =
    process.env.NODE_ENV === "production" ? btoa(crypto.randomUUID()) : null;
  const cspHeader = nonce ? baueNonceCsp(nonce) : null;

  const requestHeaders = new Headers(request.headers);
  if (nonce && cspHeader) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", cspHeader);
  }

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser() — a stale
  // session could otherwise slip through the refresh.
  let user = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (err) {
    // Supabase nicht erreichbar o. Ä.: nicht die gesamte App mit 500 quittieren,
    // sondern wie bei fehlender Session behandeln und auf /login leiten.
    console.error("proxy: auth.getUser() fehlgeschlagen:", err);
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Strikte nonce-basierte CSP für die authentifizierten Antworten.
  if (cspHeader) {
    response.headers.set("Content-Security-Policy", cspHeader);
  }

  // Authentifizierte Antworten dürfen nie zwischengespeichert werden: Auf
  // geteilten Baustellen-Tablets soll nach dem Abmelden kein Zurück-Button
  // gecachte Berichtsdaten mehr anzeigen.
  response.headers.set("Cache-Control", "no-store, must-revalidate");

  return response;
}

export const config = {
  matcher: [
    "/berichte/:path*",
    "/baustellen/:path*",
    "/api/:path*",
    "/konto/:path*",
    "/admin/:path*",
  ],
};
