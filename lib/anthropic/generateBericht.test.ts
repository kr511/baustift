import { describe, it, expect } from "vitest";
import {
  pseudonymisierePersonal,
  buildUserPrompt,
  buildSystemPrompt,
  STIL_VORLAGEN_MAX,
  type PersonalEintrag,
  type BerichtGenerierungInput,
} from "@/lib/anthropic/generateBericht";

const personal: PersonalEintrag[] = [
  { name: "Max Mustermann", stunden: 8, taetigkeit: "Maurer" },
  { name: "Erika Musterfrau", stunden: 6, taetigkeit: null },
];

describe("pseudonymisierePersonal", () => {
  it("ersetzt jeden Namen durch einen stabilen Platzhalter", () => {
    const ergebnis = pseudonymisierePersonal(personal);
    expect(ergebnis.map((p) => p.name)).toEqual([
      "Mitarbeiter 1",
      "Mitarbeiter 2",
    ]);
  });

  it("behält Stunden und Tätigkeit unverändert", () => {
    const ergebnis = pseudonymisierePersonal(personal);
    expect(ergebnis[0].stunden).toBe(8);
    expect(ergebnis[0].taetigkeit).toBe("Maurer");
    expect(ergebnis[1].taetigkeit).toBeNull();
  });

  it("liefert ein leeres Array für leere Eingabe", () => {
    expect(pseudonymisierePersonal([])).toEqual([]);
  });
});

describe("buildUserPrompt", () => {
  const baseInput: BerichtGenerierungInput = {
    firma: { name: "Swietelsky Faber", land: "AT" },
    baustelleName: "Wohnbau Musterstraße",
    datum: "2026-07-11",
    wetter: "Sonnig, 20°C",
    stichpunkte: "Fundament betoniert",
    personal,
    material: [],
  };

  it("enthält keinen echten Mitarbeiternamen", () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).not.toContain("Max Mustermann");
    expect(prompt).not.toContain("Erika Musterfrau");
    expect(prompt).toContain("Mitarbeiter 1");
    expect(prompt).toContain("Mitarbeiter 2");
  });

  it("enthält Baustelle und Stichpunkte", () => {
    const prompt = buildUserPrompt(baseInput);
    expect(prompt).toContain("Wohnbau Musterstraße");
    expect(prompt).toContain("Fundament betoniert");
  });
});

describe("buildSystemPrompt", () => {
  it("nennt die Firma mit Landes-Adjektiv", () => {
    const prompt = buildSystemPrompt({ name: "Swietelsky Faber", land: "AT" });
    expect(prompt).toContain("österreichischen Baufirma Swietelsky Faber");
  });

  it("fällt ohne Firma auf eine neutrale Persona zurück", () => {
    const prompt = buildSystemPrompt(null);
    expect(prompt).toContain("einer Baufirma");
  });

  it("enthält die Regel gegen Namensnennung", () => {
    const prompt = buildSystemPrompt({ name: "Test GmbH", land: "DE" });
    expect(prompt).toMatch(/keine Personen namentlich/);
  });

  it("hängt höchstens STIL_VORLAGEN_MAX aktive Vorlagen an", () => {
    const vorlagen = [
      { titel: "A", beispiel_text: "Text A" },
      { titel: "B", beispiel_text: "Text B" },
      { titel: "C", beispiel_text: "Text C" },
    ];
    const prompt = buildSystemPrompt(null, vorlagen);
    expect(prompt).toContain("Text A");
    expect(prompt).toContain("Text B");
    expect(prompt).not.toContain("Text C");
    expect(vorlagen.length).toBeGreaterThan(STIL_VORLAGEN_MAX);
  });

  it("ohne Vorlagen keine Stil-Referenz-Sektion", () => {
    const prompt = buildSystemPrompt(null, []);
    expect(prompt).not.toContain("Stil-Referenz");
  });
});
