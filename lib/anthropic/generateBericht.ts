import { getAnthropicClient } from "@/lib/anthropic/client";
import { formatDatum } from "@/lib/format";

export interface PersonalEintrag {
  name: string;
  stunden: number;
  taetigkeit: string | null;
}

export interface MaterialEintrag {
  bezeichnung: string;
  menge: string | null;
  typ: "material" | "geraet";
}

export interface BerichtGenerierungInput {
  baustelleName: string;
  datum: string; // ISO
  wetter: string;
  stichpunkte: string;
  personal: PersonalEintrag[];
  material: MaterialEintrag[];
}

const SYSTEM_PROMPT = `Du bist Assistent eines Bauleiters bei der österreichischen Baufirma Swietelsky Faber und formulierst aus Stichpunkten einen vollständigen, formellen deutschen Bautagesbericht.

Regeln:
- Schreibe in sachlicher, formeller dritter Person, wie in offiziellen Bautagesberichten üblich.
- Nutze ausschließlich die gegebenen Fakten (Stichpunkte, Wetter, Personal, Material). Erfinde keine zusätzlichen Fakten, Mengen oder Ereignisse.
- Gliedere den Bericht in folgende Abschnitte mit Überschriften: "Wetter", "Personal", "Material & Geräte", "Tätigkeiten", "Besonderheiten". Lass einen Abschnitt weg, wenn dazu keine Angaben vorliegen (außer Wetter und Tätigkeiten).
- Der Abschnitt "Tätigkeiten" ist die ausformulierte Fließtext-Version der Stichpunkte — professionell formuliert, aber ohne Informationen hinzuzudichten.
- Gib ausschließlich den fertigen Berichtstext zurück, keine Einleitung, keine Erklärung, kein Markdown mit "#"-Überschriften — nutze stattdessen die Überschriften gefolgt von einem Doppelpunkt und Zeilenumbruch.`;

function formatPersonal(personal: PersonalEintrag[]): string {
  if (personal.length === 0) return "Keine Angaben.";
  return personal
    .map(
      (p) =>
        `- ${p.name}: ${p.stunden} Std.${p.taetigkeit ? ` (${p.taetigkeit})` : ""}`,
    )
    .join("\n");
}

function formatMaterial(material: MaterialEintrag[]): string {
  if (material.length === 0) return "Keine Angaben.";
  return material
    .map(
      (m) =>
        `- [${m.typ === "geraet" ? "Gerät" : "Material"}] ${m.bezeichnung}${m.menge ? ` – ${m.menge}` : ""}`,
    )
    .join("\n");
}

export function buildUserPrompt(input: BerichtGenerierungInput): string {
  return `Baustelle: ${input.baustelleName}
Datum: ${formatDatum(input.datum)}
Wetter: ${input.wetter}

Personal & Stunden:
${formatPersonal(input.personal)}

Material & Geräte:
${formatMaterial(input.material)}

Stichpunkte des Bauleiters/der Bauleiterin zum Tagesverlauf:
${input.stichpunkte}`;
}

export async function generateBautagesbericht(
  input: BerichtGenerierungInput,
): Promise<string> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Die KI hat keinen Text zurückgegeben.");
  }

  return textBlock.text.trim();
}
