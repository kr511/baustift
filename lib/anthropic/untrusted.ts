/**
 * Kapselt angreifer- bzw. nutzerkontrollierten Text als klar abgegrenzte Daten
 * für einen Prompt (Abwehr von Prompt-Injection, OWASP LLM01).
 *
 * Zusätzlich wird "Delimiter-Injection" verhindert: Enthielte der Inhalt selbst
 * ein schließendes `</tag>`, könnte er sonst aus der Umschließung ausbrechen und
 * der Folgetext als Anweisung interpretiert werden. Solche schließenden Delimiter
 * werden deshalb neutralisiert. Ein wörtliches `</dokument>` kommt in echten
 * Bau-Dokumenten praktisch nie vor, der Informationsverlust ist also
 * vernachlässigbar.
 */
export function alsAbgegrenzteDaten(tag: string, inhalt: string): string {
  const neutralisiert = inhalt.replace(
    new RegExp(`</\\s*${tag}\\b`, "gi"),
    `<⁄${tag}`,
  );
  return `<${tag}>\n${neutralisiert}\n</${tag}>`;
}
