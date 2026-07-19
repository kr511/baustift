import { describe, expect, it } from "vitest";
import {
  erstelleTagesberichtEntwurf,
  istEntwurfNeuerAls,
  parseTagesberichtEntwurf,
} from "@/lib/client/tagesbericht-entwurf";

const inhalt = {
  baustelle_id: "123e4567-e89b-12d3-a456-426614174000",
  datum: "2026-07-19",
  wetter: "Sonnig, 22 °C",
  stichpunkte: "Fundament betoniert",
  personal: [{ name: "M. Mustermann", stunden: "8", taetigkeit: "Betonage" }],
  material: [{ bezeichnung: "Beton", menge: "12 m³", typ: "material" as const }],
};

describe("Tagesbericht-Entwurf", () => {
  it("serialisierte Entwürfe wieder einliest", () => {
    const entwurf = erstelleTagesberichtEntwurf(inhalt, "2026-07-19T12:30:00.000Z");

    expect(parseTagesberichtEntwurf(JSON.stringify(entwurf))).toEqual(entwurf);
  });

  it("beschädigtes JSON verwirft", () => {
    expect(parseTagesberichtEntwurf("{kaputt")).toBeNull();
  });

  it("Entwürfe mit unbekannter Version verwirft", () => {
    const entwurf = erstelleTagesberichtEntwurf(inhalt);

    expect(
      parseTagesberichtEntwurf(JSON.stringify({ ...entwurf, version: 99 })),
    ).toBeNull();
  });

  it("ungültige Materialtypen verwirft", () => {
    const entwurf = erstelleTagesberichtEntwurf(inhalt);
    const kaputt = {
      ...entwurf,
      inhalt: {
        ...entwurf.inhalt,
        material: [{ bezeichnung: "Bagger", menge: "1", typ: "fahrzeug" }],
      },
    };

    expect(parseTagesberichtEntwurf(JSON.stringify(kaputt))).toBeNull();
  });

  it("nur neuere lokale Stände zur Wiederherstellung anbietet", () => {
    const entwurf = erstelleTagesberichtEntwurf(inhalt, "2026-07-19T12:30:00.000Z");

    expect(istEntwurfNeuerAls(entwurf, "2026-07-19T12:00:00.000Z")).toBe(true);
    expect(istEntwurfNeuerAls(entwurf, "2026-07-19T13:00:00.000Z")).toBe(false);
  });
});
