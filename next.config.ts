import type { NextConfig } from "next";

function supabaseQuellen() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return { http: [] as string[], websocket: [] as string[] };

  try {
    const origin = new URL(url).origin;
    return {
      http: [origin],
      websocket: [origin.replace(/^http/, "ws")],
    };
  } catch {
    return { http: [] as string[], websocket: [] as string[] };
  }
}

const nextConfig: NextConfig = {
  devIndicators: false,
  // Entfernt den "X-Powered-By: Next.js"-Header: kein unnötiges Framework-
  // Fingerprinting, das Angreifern CVE-gezieltes Vorgehen erleichtert.
  poweredByHeader: false,
  async headers() {
    const supabase = supabaseQuellen();

    // Alle mächtigen Browser-Features, die die App nachweislich NICHT nutzt,
    // werden komplett deaktiviert (`()` = leere Allowlist). Sollte je eine
    // Injection gelingen, kann sie damit weder Kamera/Mikrofon/Standort noch
    // Zahlungs-, USB-, Bluetooth-, Sensor- oder Tracking-APIs missbrauchen.
    // Foto-Aufnahme läuft über <input capture> (native Kamera-App), nicht getUserMedia.
    const permissionsPolicy = [
      "accelerometer",
      "ambient-light-sensor",
      "autoplay",
      "battery",
      "bluetooth",
      "browsing-topics",
      "camera",
      "display-capture",
      "encrypted-media",
      "fullscreen",
      "gamepad",
      "geolocation",
      "gyroscope",
      "hid",
      "idle-detection",
      "local-fonts",
      "magnetometer",
      "microphone",
      "midi",
      "payment",
      "picture-in-picture",
      "publickey-credentials-get",
      "screen-wake-lock",
      "serial",
      "usb",
      "web-share",
      "xr-spatial-tracking",
    ]
      .map((feature) => `${feature}=()`)
      .join(", ");

    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: permissionsPolicy },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      },
    ];

    // Weitere Isolations-Header nur in Produktion, damit sie lokale Dev-
    // Werkzeuge (z. B. iframe-basierte Vorschauen) nicht stören.
    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
      });
      // Verhindert, dass fremde Seiten Ressourcen dieser App als No-CORS-
      // Subressource einbetten (Schutz vor Cross-Origin-Leaks/Spectre-Klasse).
      securityHeaders.push({
        key: "Cross-Origin-Resource-Policy",
        value: "same-origin",
      });
      securityHeaders.push({
        key: "X-Permitted-Cross-Domain-Policies",
        value: "none",
      });
    }

    // Lenient CSP mit 'unsafe-inline' NUR für Routen ohne sensible Daten
    // (Marketing, Login, Auth, Root). Diese bleiben statisch/CDN-cachebar. Die
    // authentifizierten App-Routen (/berichte, /baustellen, /konto, /admin,
    // /api) sind vom Muster ausgenommen und erhalten im Proxy stattdessen
    // eine strikte, nonce-basierte CSP ohne 'unsafe-inline' für Skripte.
    const lenientCsp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self'",
      `img-src 'self' data: blob: ${supabase.http.join(" ")}`.trim(),
      `connect-src 'self' ${[...supabase.http, ...supabase.websocket].join(" ")}`.trim(),
      "worker-src 'self' blob:",
      // Erzwingt HTTPS für etwaige Subressourcen und verhindert stilles
      // Herabstufen auf http:// – ergänzt HSTS auf CSP-Ebene.
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              source: "/((?!berichte|baustellen|konto|admin|api).*)",
              headers: [{ key: "Content-Security-Policy", value: lenientCsp }],
            },
          ]
        : []),
    ];
  },
};

export default nextConfig;
