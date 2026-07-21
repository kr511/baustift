import { describe, it, expect } from "vitest";

import { findeSecrets } from "./secret-scan.mjs";

describe("findeSecrets", () => {
  it("meldet nichts bei sauberem Inhalt", () => {
    const treffer = findeSecrets([
      { pfad: "a.ts", inhalt: 'const x = 1;\nconst url = "https://example.com";' },
      { pfad: "b.md", inhalt: "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" },
    ]);
    expect(treffer).toEqual([]);
  });

  it("erkennt einen Anthropic-API-Key", () => {
    const key = `sk-ant-${"A".repeat(40)}`;
    const treffer = findeSecrets([{ pfad: "leck.ts", inhalt: `const k = "${key}";` }]);
    expect(treffer.length).toBe(1);
    expect(treffer[0].pfad).toBe("leck.ts");
  });

  it("erkennt ein JWT (service_role-Format)", () => {
    const jwt = "eyJhbGciOiA6789.eyJyb2xlIjoic2Vydmlj.abcdefgh";
    const treffer = findeSecrets([{ pfad: "jwt.ts", inhalt: `token: ${jwt}` }]);
    expect(treffer.length).toBe(1);
  });

  it("erkennt einen privaten PEM-Schlüssel", () => {
    const treffer = findeSecrets([
      { pfad: "key.pem", inhalt: "-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END" },
    ]);
    expect(treffer.length).toBe(1);
  });

  it("löst keinen Fehlalarm bei bloßer Erwähnung von service_role aus", () => {
    const treffer = findeSecrets([
      {
        pfad: "SECURITY.md",
        inhalt: "Der service_role-Key darf nie im Client verwendet werden.",
      },
    ]);
    expect(treffer).toEqual([]);
  });
});
