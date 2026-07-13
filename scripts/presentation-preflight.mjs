#!/usr/bin/env node

import { lookup as dnsLookup } from "node:dns/promises";
import { pathToFileURL } from "node:url";

const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";
const DEFAULT_TIMEOUT_MS = 10_000;

const STATES = {
  PASS: "PASS",
  FAIL: "FAIL",
  INFO: "INFO",
};

function makeResult(state, check, detail) {
  return { state, check, detail };
}

function isPlaceholder(value) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("your-") ||
    normalized.includes("your_") ||
    normalized.includes("example") ||
    normalized.includes("placeholder") ||
    normalized.includes("replace-me") ||
    normalized.includes("changeme") ||
    normalized.includes("<") ||
    normalized.includes(">") ||
    normalized.includes("...")
  );
}

function parseHttpsEndpoint(rawValue, name, { allowPath = false } = {}) {
  const value = rawValue?.trim();
  if (!value) {
    return {
      result: makeResult(STATES.FAIL, name, "ist nicht gesetzt."),
      url: null,
    };
  }

  if (isPlaceholder(value)) {
    return {
      result: makeResult(STATES.FAIL, name, "enthält noch einen Platzhalter."),
      url: null,
    };
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return {
      result: makeResult(STATES.FAIL, name, "ist keine gültige URL."),
      url: null,
    };
  }

  if (url.protocol !== "https:") {
    return {
      result: makeResult(STATES.FAIL, name, "muss HTTPS verwenden."),
      url: null,
    };
  }

  if (url.username || url.password || url.search || url.hash) {
    return {
      result: makeResult(
        STATES.FAIL,
        name,
        "darf keine Zugangsdaten, Query-Parameter oder Fragmente enthalten.",
      ),
      url: null,
    };
  }

  if (!allowPath && url.pathname !== "/") {
    return {
      result: makeResult(STATES.FAIL, name, "muss auf den Projekt-Origin zeigen."),
      url: null,
    };
  }

  return {
    result: makeResult(STATES.PASS, name, "ist eine gültige HTTPS-URL."),
    url,
  };
}

function decodeJwtRole(value) {
  const parts = value.split(".");
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function inspectSupabasePublicKey(rawValue) {
  const value = rawValue?.trim();
  const check = "Supabase Public Key";

  if (!value) {
    return { result: makeResult(STATES.FAIL, check, "ist nicht gesetzt."), key: null };
  }

  if (isPlaceholder(value)) {
    return {
      result: makeResult(STATES.FAIL, check, "enthält noch einen Platzhalter."),
      key: null,
    };
  }

  if (value.startsWith("sb_secret_")) {
    return {
      result: makeResult(
        STATES.FAIL,
        check,
        "ist ein Secret-Key und darf nicht als NEXT_PUBLIC-Variable verwendet werden.",
      ),
      key: null,
    };
  }

  if (value.startsWith("sb_publishable_") && value.length >= 24) {
    return {
      result: makeResult(STATES.PASS, check, "ist ein Publishable Key."),
      key: value,
    };
  }

  const jwtRole = decodeJwtRole(value);
  if (jwtRole === "service_role") {
    return {
      result: makeResult(
        STATES.FAIL,
        check,
        "ist ein service_role-Key und darf niemals im Browser verwendet werden.",
      ),
      key: null,
    };
  }

  if (jwtRole === "anon") {
    return {
      result: makeResult(STATES.PASS, check, "ist ein Legacy-Anon-Key."),
      key: value,
    };
  }

  return {
    result: makeResult(
      STATES.FAIL,
      check,
      "ist weder ein erkennbarer Publishable- noch ein Anon-Key.",
    ),
    key: null,
  };
}

function inspectAnthropicKey(rawValue) {
  const value = rawValue?.trim();
  const check = "Anthropic API-Key";

  if (!value) {
    return { result: makeResult(STATES.FAIL, check, "ist nicht gesetzt."), key: null };
  }

  if (isPlaceholder(value) || !value.startsWith("sk-ant-") || value.length < 40) {
    return {
      result: makeResult(STATES.FAIL, check, "ist kein vollständig konfigurierter API-Key."),
      key: null,
    };
  }

  return {
    result: makeResult(STATES.PASS, check, "ist formal plausibel."),
    key: value,
  };
}

async function withTimeout(operation, timeoutMs) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithTimeout(fetchImpl, url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkDns(url, lookupImpl, timeoutMs, label) {
  try {
    const addresses = await withTimeout(
      Promise.resolve(lookupImpl(url.hostname, { all: true })),
      timeoutMs,
    );

    if (!Array.isArray(addresses) || addresses.length === 0) {
      throw new Error("empty");
    }

    return makeResult(STATES.PASS, label, "Hostname ist per DNS erreichbar.");
  } catch {
    return makeResult(STATES.FAIL, label, "Hostname kann nicht per DNS aufgelöst werden.");
  }
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function checkSupabaseAuth({ url, key, fetchImpl, timeoutMs }) {
  let response;
  try {
    response = await fetchWithTimeout(
      fetchImpl,
      new URL("/auth/v1/settings", url),
      {
        method: "GET",
        redirect: "error",
        headers: {
          accept: "application/json",
          apikey: key,
        },
      },
      timeoutMs,
    );
  } catch {
    return [
      makeResult(
        STATES.FAIL,
        "Supabase Auth API",
        "öffentliche Auth-Einstellungen sind nicht erreichbar.",
      ),
    ];
  }

  if (!response.ok) {
    return [
      makeResult(
        STATES.FAIL,
        "Supabase Auth API",
        `öffentliche Auth-Einstellungen antworten mit HTTP ${response.status}.`,
      ),
    ];
  }

  const settings = await readJson(response);
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return [
      makeResult(
        STATES.FAIL,
        "Supabase Auth API",
        "liefert keine verwertbaren Auth-Einstellungen.",
      ),
    ];
  }

  const external =
    settings.external && typeof settings.external === "object" ? settings.external : {};

  return [
    makeResult(STATES.PASS, "Supabase Auth API", "öffentliche Einstellungen sind erreichbar."),
    settings.disable_signup === true
      ? makeResult(STATES.PASS, "Öffentliche Registrierung", "ist deaktiviert.")
      : makeResult(STATES.FAIL, "Öffentliche Registrierung", "ist nicht sicher deaktiviert."),
    external.email === true
      ? makeResult(STATES.PASS, "E-Mail-Login", "ist aktiviert.")
      : makeResult(STATES.FAIL, "E-Mail-Login", "ist nicht aktiviert."),
    external.anonymous_users === false
      ? makeResult(STATES.PASS, "Anonyme Anmeldung", "ist deaktiviert.")
      : makeResult(STATES.FAIL, "Anonyme Anmeldung", "ist nicht sicher deaktiviert."),
  ];
}

async function checkAnthropicModel({ key, model, fetchImpl, timeoutMs }) {
  let response;
  try {
    response = await fetchWithTimeout(
      fetchImpl,
      `https://api.anthropic.com/v1/models/${encodeURIComponent(model)}`,
      {
        method: "GET",
        redirect: "error",
        headers: {
          accept: "application/json",
          "anthropic-version": "2023-06-01",
          "x-api-key": key,
        },
      },
      timeoutMs,
    );
  } catch {
    return makeResult(
      STATES.FAIL,
      "Anthropic Models API",
      "ist nicht erreichbar; Key und Modell konnten nicht bestätigt werden.",
    );
  }

  if (!response.ok) {
    const detail =
      response.status === 401 || response.status === 403
        ? "lehnt den API-Key ab."
        : response.status === 404
          ? "kennt das konfigurierte Modell nicht."
          : `antwortet mit HTTP ${response.status}.`;
    return makeResult(STATES.FAIL, "Anthropic Models API", detail);
  }

  const modelInfo = await readJson(response);
  if (!modelInfo || typeof modelInfo.id !== "string") {
    return makeResult(
      STATES.FAIL,
      "Anthropic Models API",
      "liefert keine verwertbaren Modellinformationen.",
    );
  }

  return makeResult(
    STATES.PASS,
    "Anthropic Models API",
    "API-Key und konfiguriertes Modell sind verfügbar (kein Token-Verbrauch).",
  );
}

function checkSecurityHeaders(headers) {
  const csp = headers.get("content-security-policy") ?? "";
  const permissions = headers.get("permissions-policy") ?? "";
  const missing = [];

  const exactHeaders = [
    ["x-content-type-options", "nosniff"],
    ["x-frame-options", "deny"],
    ["cross-origin-opener-policy", "same-origin"],
    ["cross-origin-resource-policy", "same-origin"],
    ["x-permitted-cross-domain-policies", "none"],
  ];

  for (const [name, expected] of exactHeaders) {
    if ((headers.get(name) ?? "").trim().toLowerCase() !== expected) missing.push(name);
  }

  if (!(headers.get("strict-transport-security") ?? "").toLowerCase().includes("max-age=")) {
    missing.push("strict-transport-security");
  }

  if (
    !(headers.get("referrer-policy") ?? "")
      .toLowerCase()
      .includes("strict-origin-when-cross-origin")
  ) {
    missing.push("referrer-policy");
  }

  for (const directive of [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ]) {
    if (!csp.toLowerCase().includes(directive)) missing.push(`csp:${directive.split(" ")[0]}`);
  }

  for (const directive of [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "bluetooth=()",
  ]) {
    if (!permissions.toLowerCase().includes(directive)) {
      missing.push(`permissions-policy:${directive.split("=")[0]}`);
    }
  }

  // Kein Framework-Fingerprinting: der X-Powered-By-Header muss fehlen.
  if (headers.get("x-powered-by")) {
    missing.push("x-powered-by:vorhanden");
  }

  return missing;
}

async function checkApp({ url, fetchImpl, lookupImpl, timeoutMs }) {
  const results = [];
  const dnsResult = await checkDns(url, lookupImpl, timeoutMs, "App DNS");
  results.push(dnsResult);
  if (dnsResult.state === STATES.FAIL) return results;

  let response;
  try {
    response = await fetchWithTimeout(
      fetchImpl,
      url,
      { method: "GET", redirect: "follow" },
      timeoutMs,
    );
  } catch {
    results.push(makeResult(STATES.FAIL, "App-Erreichbarkeit", "App antwortet nicht."));
    return results;
  }

  if (!response.ok) {
    results.push(
      makeResult(STATES.FAIL, "App-Erreichbarkeit", `App antwortet mit HTTP ${response.status}.`),
    );
    return results;
  }

  results.push(makeResult(STATES.PASS, "App-Erreichbarkeit", "öffentliche Seite antwortet."));

  const missingHeaders = checkSecurityHeaders(response.headers);
  results.push(
    missingHeaders.length === 0
      ? makeResult(STATES.PASS, "Security-Header", "alle erwarteten Header sind aktiv.")
      : makeResult(
          STATES.FAIL,
          "Security-Header",
          `fehlen oder sind unvollständig: ${missingHeaders.join(", ")}.`,
        ),
  );

  return results;
}

export async function runPreflight({
  env = process.env,
  fetchImpl = globalThis.fetch,
  lookupImpl = dnsLookup,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  write = (line) => console.log(line),
} = {}) {
  const results = [];
  const add = (...newResults) => results.push(...newResults);

  write("Präsentations-Preflight — Swietelsky Faber");
  write("");

  const supabaseUrl = parseHttpsEndpoint(
    env.NEXT_PUBLIC_SUPABASE_URL,
    "Supabase Projekt-URL",
  );
  const supabaseKey = inspectSupabasePublicKey(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  add(supabaseUrl.result, supabaseKey.result);

  if (supabaseUrl.url && supabaseKey.key) {
    const dnsResult = await checkDns(
      supabaseUrl.url,
      lookupImpl,
      timeoutMs,
      "Supabase DNS",
    );
    add(dnsResult);
    if (dnsResult.state === STATES.PASS) {
      add(
        ...(await checkSupabaseAuth({
          url: supabaseUrl.url,
          key: supabaseKey.key,
          fetchImpl,
          timeoutMs,
        })),
      );
    }
  }

  const anthropicKey = inspectAnthropicKey(env.ANTHROPIC_API_KEY);
  add(anthropicKey.result);
  if (anthropicKey.key) {
    add(
      makeResult(
        STATES.PASS,
        "Anthropic Modell",
        `${DEFAULT_ANTHROPIC_MODEL} entspricht der fest konfigurierten App-Modell-ID.`,
      ),
    );
    add(
      await checkAnthropicModel({
        key: anthropicKey.key,
        model: DEFAULT_ANTHROPIC_MODEL,
        fetchImpl,
        timeoutMs,
      }),
    );
  }

  const appValue = env.APP_URL?.trim();
  if (!appValue) {
    add(
      makeResult(
        STATES.INFO,
        "APP_URL",
        "ist optional und nicht gesetzt; App- und Header-Check übersprungen.",
      ),
    );
  } else {
    const appUrl = parseHttpsEndpoint(appValue, "APP_URL", { allowPath: true });
    add(appUrl.result);
    if (appUrl.url) {
      add(
        ...(await checkApp({
          url: appUrl.url,
          fetchImpl,
          lookupImpl,
          timeoutMs,
        })),
      );
    }
  }

  for (const result of results) {
    write(`[${result.state}] ${result.check}: ${result.detail}`);
  }

  const passed = results.filter((result) => result.state === STATES.PASS).length;
  const failed = results.filter((result) => result.state === STATES.FAIL).length;
  const info = results.filter((result) => result.state === STATES.INFO).length;
  write("");
  write(`Ergebnis: ${passed} PASS, ${failed} FAIL, ${info} INFO`);
  write(failed === 0 ? "Vorführumgebung ist bereit." : "Vorführumgebung ist noch nicht bereit.");

  return { exitCode: failed === 0 ? 0 : 1, results };
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  try {
    const { exitCode } = await runPreflight();
    process.exitCode = exitCode;
  } catch {
    console.error("[FAIL] Preflight: unerwarteter interner Fehler (Details bewusst unterdrückt).");
    process.exitCode = 1;
  }
}
