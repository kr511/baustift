import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // `server-only` ist ein Next-Build-Alias und existiert nicht als echtes
      // npm-Paket. Im Test auf den leeren Server-Shim von Next mappen, damit
      // Module mit `import "server-only"` (Secret-Grenze) unter Vitest laden;
      // die Build-Zeit-Prüfung bleibt im echten Next-Build erhalten.
      "server-only": path.resolve(
        __dirname,
        "node_modules/next/dist/compiled/server-only/empty.js",
      ),
    },
  },
  test: {
    environment: "node",
  },
});
