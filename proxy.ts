import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { istVertrauenswuerdigerUrsprung } from "@/lib/security/originGuard";

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("Die Supabase-Konfiguration fehlt.");
    return NextResponse.json(
      { error: "Server-Konfiguration unvollständig." },
      { status: 503 },
    );
  }

  // Per-Request-Nonce nur in Produktion (Dev braucht für React 'unsafe-eval'
  // und die App läuft dort ohne CSP wie bisher). Die Nonce wird als Request-
  // Header gesetzt, damit Next sie beim SSR in die eigenen <script>-Tags
  // injiziert; zusätzlich als Antwort-Header, der die Policy erzwingt.
  const nonce =
    process.env.NODE_ENV === "production"
      ? btoa(crypto.randomUUID())
      : null;
  const cspHeader = nonce ? baueNonceCsp(nonce) : null;

  const requestHeaders = new Headers(request.headers);
  if (nonce && cspHeader) {
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", cspHeader);
  }

  function neueWeiterleitung() {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  let responseCookies: Parameters<SetAllCookies>[0] = [];
  const responseHeaders = new Headers();

  function applySupabaseResponseState(target: NextResponse) {
    responseCookies.forEach(({ name, value, options }) =>
      target.cookies.set(name, value, options),
    );
    responseHeaders.forEach((value, key) => target.headers.set(key, value));
    return target;
  }

  let response = neueWeiterleitung();

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          responseCookies = [...responseCookies, ...cookiesToSet];
          Object.entries(headersToSet).forEach(([key, value]) =>
            responseHeaders.set(key, value),
          );
          response = applySupabaseResponseState(neueWeiterleitung());
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser() — a stale
  // session could otherwise slip through the refresh.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.is_anonymous) {
    if (istApiPfad) {
      return applySupabaseResponseState(
        NextResponse.json({ error: "Nicht autorisiert." }, { status: 401 }),
      );
    }

    const loginUrl = new URL("/login", request.url);
    return applySupabaseResponseState(NextResponse.redirect(loginUrl));
  }

  // Strikte nonce-basierte CSP für die authentifizierten Antworten.
  if (cspHeader) {
    response.headers.set("Content-Security-Policy", cspHeader);
  }

  // Der Matcher deckt nur authentifizierte Bereiche ab. Deren Antworten dürfen
  // nie zwischengespeichert werden: Auf geteilten Baustellen-Tablets soll nach
  // dem Abmelden kein Zurück-Button gecachte Berichtsdaten mehr anzeigen.
  response.headers.set("Cache-Control", "no-store, must-revalidate");

  return response;
}

export const config = {
  matcher: [
    "/berichte/:path*",
    "/baustellen/:path*",
    "/einstellungen/:path*",
    "/api/:path*",
  ],
};
