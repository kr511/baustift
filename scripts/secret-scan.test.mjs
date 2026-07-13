import assert from "node:assert/strict";
import test from "node:test";

import { findeSecrets } from "./secret-scan.mjs";

test("meldet nichts bei sauberem Inhalt", () => {
  const treffer = findeSecrets([
    { pfad: "a.ts", inhalt: "const x = 1;\nconst url = \"https://example.com\";" },
    { pfad: "b.md", inhalt: "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" },
  ]);
  assert.deepEqual(treffer, []);
});

test("erkennt einen Anthropic-API-Key", () => {
  const key = `sk-ant-${"A".repeat(40)}`;
  const treffer = findeSecrets([{ pfad: "leck.ts", inhalt: `const k = "${key}";` }]);
  assert.equal(treffer.length, 1);
  assert.equal(treffer[0].pfad, "leck.ts");
});

test("erkennt ein JWT (service_role-Format)", () => {
  const jwt = "eyJhbGciOiA6789.eyJyb2xlIjoic2Vydmlj.abcdefgh";
  const treffer = findeSecrets([{ pfad: "jwt.ts", inhalt: `token: ${jwt}` }]);
  assert.equal(treffer.length, 1);
});

test("erkennt einen privaten PEM-Schlüssel", () => {
  const treffer = findeSecrets([
    { pfad: "key.pem", inhalt: "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END" },
  ]);
  assert.equal(treffer.length, 1);
});

test("löst keinen Fehlalarm bei bloßer Erwähnung von service_role aus", () => {
  const treffer = findeSecrets([
    { pfad: "SECURITY.md", inhalt: "Der service_role-Key darf nie im Client verwendet werden." },
  ]);
  assert.deepEqual(treffer, []);
});
