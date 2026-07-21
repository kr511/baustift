import { describe, it, expect } from "vitest";
import { waehleKiKontextDokumente } from "@/lib/data/kiKontextDokumente";

function dok(dateiname: string, groesse_bytes: number | null) {
  return { dateiname, groesse_bytes };
}

describe("waehleKiKontextDokumente", () => {
  it("wählt alle Dokumente, wenn Anzahl- und Byte-Limit nicht erreicht werden", () => {
    const { ausgewaehlt, ausgelassen } = waehleKiKontextDokumente(
      [dok("a.pdf", 100), dok("b.pdf", 200)],
      3,
      1000,
    );
    expect(ausgewaehlt.map((d) => d.dateiname)).toEqual(["a.pdf", "b.pdf"]);
    expect(ausgelassen).toEqual([]);
  });

  it("bricht bei maxAnzahl ab und lässt den Rest aus", () => {
    const { ausgewaehlt, ausgelassen } = waehleKiKontextDokumente(
      [dok("a.pdf", 10), dok("b.pdf", 10), dok("c.pdf", 10)],
      2,
      1_000_000,
    );
    expect(ausgewaehlt.map((d) => d.dateiname)).toEqual(["a.pdf", "b.pdf"]);
    expect(ausgelassen).toEqual(["c.pdf"]);
  });

  it("lässt ein Dokument aus, das das Byte-Limit überschreiten würde, prüft aber weitere kleinere Dokumente nicht nach", () => {
    const { ausgewaehlt, ausgelassen } = waehleKiKontextDokumente(
      [dok("gross.pdf", 900), dok("klein.pdf", 150)],
      5,
      1000,
    );
    expect(ausgewaehlt.map((d) => d.dateiname)).toEqual(["gross.pdf"]);
    expect(ausgelassen).toEqual(["klein.pdf"]);
  });

  it("behandelt groesse_bytes: null als 0 Bytes", () => {
    const { ausgewaehlt, ausgelassen } = waehleKiKontextDokumente(
      [dok("ohne-groesse.pdf", null)],
      5,
      1000,
    );
    expect(ausgewaehlt.map((d) => d.dateiname)).toEqual(["ohne-groesse.pdf"]);
    expect(ausgelassen).toEqual([]);
  });

  it("liefert leere Listen bei leerer Eingabe", () => {
    const { ausgewaehlt, ausgelassen } = waehleKiKontextDokumente([], 3, 1000);
    expect(ausgewaehlt).toEqual([]);
    expect(ausgelassen).toEqual([]);
  });
});
