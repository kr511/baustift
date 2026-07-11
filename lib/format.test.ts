import { describe, it, expect } from "vitest";
import { sanitizeDateiname } from "@/lib/format";

describe("sanitizeDateiname", () => {
  it("transliteriert Umlaute statt sie zu entfernen", () => {
    expect(sanitizeDateiname("Müller")).toBe("Mueller");
    expect(sanitizeDateiname("Straße")).toBe("Strasse");
  });

  it("ersetzt Leerzeichen und Sonderzeichen durch Bindestriche", () => {
    expect(sanitizeDateiname("Müller & Söhne / Bau 2")).toBe(
      "Mueller-Soehne-Bau-2",
    );
  });

  it("entfernt führende und folgende Bindestriche", () => {
    expect(sanitizeDateiname("!!!Wichtig!!!")).toBe("Wichtig");
  });

  it("fällt bei komplett leerem Ergebnis auf 'bericht' zurück", () => {
    expect(sanitizeDateiname("###")).toBe("bericht");
    expect(sanitizeDateiname("")).toBe("bericht");
  });

  it("lässt bereits sichere Namen unverändert", () => {
    expect(sanitizeDateiname("Wohnbau_Musterstrasse_12")).toBe(
      "Wohnbau_Musterstrasse_12",
    );
  });
});
