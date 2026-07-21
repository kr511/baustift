// Secret-Grenze: ANTHROPIC_API_KEY hat bewusst KEIN NEXT_PUBLIC_-Prefix, wird
// also in Client-Bundles zu `undefined` ersetzt — der Wert leakt nicht. Ein
// harter `import "server-only"`-Guard fehlt hier bewusst, weil ein
// Client-Component-Modul aktuell den Konstanten-Export von generateBericht.ts
// (und damit transitiv dieses Modul) zieht; siehe SECURITY.md.
import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}
