import type { NextRequest } from "next/server";

// Zustandsändernde Methoden. GET/HEAD/OPTIONS sollen laut HTTP-Semantik
// nebenwirkungsfrei sein und brauchen deshalb keinen CSRF-Schutz.
const SICHERE_METHODEN = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF-Schutz für Route Handler.
 *
 * Server Actions prüfen den Origin automatisch; rohe Route Handler
 * (`app/api/.../route.ts`) tun das nicht. Da sich diese Endpunkte über das
 * Session-Cookie authentifizieren, könnte eine fremde Seite sie sonst im
 * Namen einer angemeldeten Person auslösen (Cross-Site Request Forgery) –
 * etwa um KI-Kontingent zu verbrennen oder Berichtstexte zu überschreiben.
 *
 * Die Prüfung ist doppelt abgesichert:
 *  1. `Sec-Fetch-Site` (von allen modernen Browsern gesetzt und nicht durch
 *     Skripte fälschbar). Nur `cross-site` kann eine fremde Website erzwingen –
 *     alle anderen Werte (`same-origin`, `same-site`, `none`) sind vertrauenswürdig.
 *  2. Fällt dieser Header, wird der `Origin`-Header gegen den eigenen Host
 *     geprüft. Fehlt der Origin bei einem schreibenden Request, wird
 *     konservativ abgelehnt.
 */
export function istVertrauenswuerdigerUrsprung(request: NextRequest): boolean {
  if (SICHERE_METHODEN.has(request.method)) {
    return true;
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    return secFetchSite !== "cross-site";
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    // Ein schreibender Browser-fetch sendet immer einen Origin. Fehlt er,
    // stammt der Request nicht aus dem regulären App-Fluss – ablehnen.
    return false;
  }

  const erlaubterHost =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host;

  try {
    return new URL(origin).host === erlaubterHost;
  } catch {
    return false;
  }
}
