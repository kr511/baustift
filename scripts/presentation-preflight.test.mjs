import assert from "node:assert/strict";
import test from "node:test";

import { runPreflight } from "./presentation-preflight.mjs";

const TEST_SUPABASE_KEY = "sb_publishable_test_value_that_is_not_a_real_secret";
const TEST_ANTHROPIC_KEY = `sk-ant-${"test-only-".repeat(8)}`;
const TEST_MODEL = "claude-sonnet-5";

const securityHeaders = {
  "content-security-policy":
    "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
  "permissions-policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-permitted-cross-domain-policies": "none",
};

function validEnv(overrides = {}) {
  return {
    NEXT_PUBLIC_SUPABASE_URL: "https://demo-project.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: TEST_SUPABASE_KEY,
    ANTHROPIC_API_KEY: TEST_ANTHROPIC_KEY,
    ...overrides,
  };
}

function okFetch(input, options = {}) {
  const url = new URL(input);

  if (url.pathname === "/auth/v1/settings") {
    assert.equal(options.headers.apikey, TEST_SUPABASE_KEY);
    return Promise.resolve(
      Response.json({
        disable_signup: true,
        external: { email: true, anonymous_users: false },
      }),
    );
  }

  if (url.hostname === "api.anthropic.com") {
    assert.equal(options.headers["x-api-key"], TEST_ANTHROPIC_KEY);
    assert.equal(url.pathname, `/v1/models/${TEST_MODEL}`);
    return Promise.resolve(Response.json({ id: TEST_MODEL, type: "model" }));
  }

  if (url.hostname === "praesentation.swietelsky-faber.test") {
    return Promise.resolve(new Response("ok", { status: 200, headers: securityHeaders }));
  }

  throw new Error("unexpected request");
}

const okLookup = async () => [{ address: "203.0.113.10", family: 4 }];

test("vollständige sichere Mock-Umgebung besteht ohne Secret-Ausgabe", async () => {
  const output = [];
  const result = await runPreflight({
    env: validEnv({ APP_URL: "https://praesentation.swietelsky-faber.test" }),
    fetchImpl: okFetch,
    lookupImpl: okLookup,
    write: (line) => output.push(line),
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.results.some((entry) => entry.state === "FAIL"), false);
  assert.match(output.join("\n"), /Vorführumgebung ist bereit\./);
  assert.doesNotMatch(output.join("\n"), new RegExp(TEST_SUPABASE_KEY));
  assert.doesNotMatch(output.join("\n"), new RegExp(TEST_ANTHROPIC_KEY));
});

test("DNS-Ausfall und Platzhalter führen zu Exit-Code 1", async () => {
  const output = [];
  let fetchCalls = 0;
  const result = await runPreflight({
    env: validEnv({ ANTHROPIC_API_KEY: "your-anthropic-api-key" }),
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("must not be called");
    },
    lookupImpl: async () => {
      const error = new Error("not found");
      error.code = "ENOTFOUND";
      throw error;
    },
    write: (line) => output.push(line),
  });

  assert.equal(result.exitCode, 1);
  assert.equal(fetchCalls, 0);
  assert.match(output.join("\n"), /\[FAIL\] Supabase DNS/);
  assert.match(output.join("\n"), /\[FAIL\] Anthropic API-Key/);
});

test("service_role-Key wird vor jedem Netzwerkzugriff abgewiesen", async () => {
  const payload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
  const serviceRoleKey = `header.${payload}.signature`;
  const output = [];
  let networkCalls = 0;

  const result = await runPreflight({
    env: validEnv({
      NEXT_PUBLIC_SUPABASE_ANON_KEY: serviceRoleKey,
      ANTHROPIC_API_KEY: "your-anthropic-api-key",
    }),
    fetchImpl: async () => {
      networkCalls += 1;
      throw new Error("must not be called");
    },
    lookupImpl: async () => {
      networkCalls += 1;
      return [{ address: "203.0.113.10", family: 4 }];
    },
    write: (line) => output.push(line),
  });

  assert.equal(result.exitCode, 1);
  assert.equal(networkCalls, 0);
  assert.match(output.join("\n"), /service_role-Key/);
  assert.doesNotMatch(output.join("\n"), new RegExp(serviceRoleKey.replaceAll(".", "\\.")));
});

test("unsichere öffentliche Auth-Einstellungen schlagen fehl", async () => {
  const result = await runPreflight({
    env: validEnv(),
    lookupImpl: okLookup,
    fetchImpl: async (input, options) => {
      const url = new URL(input);
      if (url.pathname === "/auth/v1/settings") {
        assert.equal(options.headers.apikey, TEST_SUPABASE_KEY);
        return Response.json({
          disable_signup: false,
          external: { email: true, anonymous_users: true },
        });
      }
      return okFetch(input, options);
    },
    write: () => {},
  });

  assert.equal(result.exitCode, 1);
  assert.equal(
    result.results.find((entry) => entry.check === "Öffentliche Registrierung")?.state,
    "FAIL",
  );
  assert.equal(
    result.results.find((entry) => entry.check === "Anonyme Anmeldung")?.state,
    "FAIL",
  );
});

test("fehlender Security-Header der optionalen App schlägt fehl", async () => {
  const result = await runPreflight({
    env: validEnv({ APP_URL: "https://praesentation.swietelsky-faber.test" }),
    lookupImpl: okLookup,
    fetchImpl: async (input, options) => {
      const url = new URL(input);
      if (url.hostname === "praesentation.swietelsky-faber.test") {
        const headers = { ...securityHeaders };
        delete headers["content-security-policy"];
        return new Response("ok", { status: 200, headers });
      }
      return okFetch(input, options);
    },
    write: () => {},
  });

  assert.equal(result.exitCode, 1);
  assert.equal(
    result.results.find((entry) => entry.check === "Security-Header")?.state,
    "FAIL",
  );
});

test("vorhandener X-Powered-By-Header schlägt fehl", async () => {
  const result = await runPreflight({
    env: validEnv({ APP_URL: "https://praesentation.swietelsky-faber.test" }),
    lookupImpl: okLookup,
    fetchImpl: async (input, options) => {
      const url = new URL(input);
      if (url.hostname === "praesentation.swietelsky-faber.test") {
        const headers = { ...securityHeaders, "x-powered-by": "Next.js" };
        return new Response("ok", { status: 200, headers });
      }
      return okFetch(input, options);
    },
    write: () => {},
  });

  assert.equal(result.exitCode, 1);
  assert.equal(
    result.results.find((entry) => entry.check === "Security-Header")?.state,
    "FAIL",
  );
});
