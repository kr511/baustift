import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data/profile", () => ({ getUserProfil: vi.fn() }));

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";
import {
  createTagesbericht,
  erstelleKorrekturversion,
  finalisiereTagesbericht,
  pruefeTagesbericht,
  updateBerichtText,
  updateTagesbericht,
} from "@/lib/actions/tagesberichte";

interface RpcAntwort {
  data: unknown;
  error: { message: string } | null;
}

function createFakeClient({
  status = "entwurf",
  rpcAntworten = {},
}: {
  status?: "entwurf" | "generiert" | "geprueft" | "final" | null;
  rpcAntworten?: Record<string, RpcAntwort>;
}) {
  const rpc = vi.fn((name: string) =>
    Promise.resolve(
      rpcAntworten[name] ?? {
        data: null,
        error: { message: `Keine Testantwort für ${name}` },
      },
    ),
  );

  return {
    from() {
      const query: Record<string, unknown> = {
        select: () => query,
        eq: () => query,
        single: () =>
          Promise.resolve({
            data: status === null ? null : { status },
            error: status === null ? { message: "not found" } : null,
          }),
        maybeSingle: () =>
          Promise.resolve({
            data: status === null ? null : { status },
            error: null,
          }),
      };
      return query;
    },
    rpc,
  };
}

const mockedCreateClient = vi.mocked(createClient);
const mockedGetUserProfil = vi.mocked(getUserProfil);
const mockedRevalidatePath = vi.mocked(revalidatePath);

function berichtFormData() {
  const formData = new FormData();
  formData.set("baustelle_id", "123e4567-e89b-12d3-a456-426614174000");
  formData.set("datum", "2026-07-14");
  formData.set("wetter", "Sonnig, 18°C");
  formData.set("stichpunkte", "Fundament betoniert");
  formData.set("personal_json", "[]");
  formData.set("material_json", "[]");
  formData.set("foto_json", "[]");
  return formData;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Berichtstext-Workflow", () => {
  it("lehnt das Bearbeiten eines finalisierten Berichts ab", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          speichere_tagesbericht_text: {
            data: [{ ok: false, neuer_status: "final", fehler: "finalisiert" }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await updateBerichtText(
      "123e4567-e89b-12d3-a456-426614174000",
      "Neuer Text",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/finalisiert/i);
  });

  it("setzt gespeicherten Text auf den Status generiert", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          speichere_tagesbericht_text: {
            data: [{ ok: true, neuer_status: "generiert", fehler: null }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await updateBerichtText(
      "123e4567-e89b-12d3-a456-426614174000",
      "Neuer Text",
    );

    expect(result).toMatchObject({ ok: true, status: "generiert" });
  });

  it("gibt technische RPC-Fehler verständlich zurück", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          speichere_tagesbericht_text: {
            data: null,
            error: { message: "boom" },
          },
        },
      }) as never,
    );

    const result = await updateBerichtText(
      "123e4567-e89b-12d3-a456-426614174000",
      "Neuer Text",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("setzt geleerten Text zurück auf den Status entwurf", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          speichere_tagesbericht_text: {
            data: [{ ok: true, neuer_status: "entwurf", fehler: null }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await updateBerichtText(
      "123e4567-e89b-12d3-a456-426614174000",
      "",
    );

    expect(result).toMatchObject({ ok: true, status: "entwurf" });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/berichte");
  });

  it("meldet einen nicht auffindbaren Bericht verständlich", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          speichere_tagesbericht_text: {
            data: [{ ok: false, neuer_status: null, fehler: "nicht_gefunden" }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await updateBerichtText(
      "123e4567-e89b-12d3-a456-426614174000",
      "Neuer Text",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/nicht gefunden/i);
  });

  it("weist eine ungültige Bericht-ID ab, ohne die Datenbank aufzurufen", async () => {
    const result = await updateBerichtText("keine-uuid", "Neuer Text");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ungültig/i);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });
});

describe("Prüfen und Finalisieren", () => {
  it("markiert einen generierten Bericht als geprüft", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          pruefe_tagesbericht: {
            data: [{ ok: true, neuer_status: "geprueft", fehler: null }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await pruefeTagesbericht(
      "123e4567-e89b-12d3-a456-426614174000",
    );

    expect(result).toMatchObject({ ok: true, status: "geprueft" });
  });

  it("verweigert Finalisierung ohne Prüfstatus", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          finalisiere_tagesbericht: {
            data: [{ ok: false, version: null, fehler: "nicht_geprueft" }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await finalisiereTagesbericht(
      "123e4567-e89b-12d3-a456-426614174000",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/geprüft/i);
  });

  it("liefert die erzeugte unveränderliche Versionsnummer", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          finalisiere_tagesbericht: {
            data: [{ ok: true, version: 2, fehler: null }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await finalisiereTagesbericht(
      "123e4567-e89b-12d3-a456-426614174000",
    );

    expect(result).toMatchObject({ ok: true, status: "final", version: 2 });
  });

  it("fordert bei Korrekturen einen konkreten Grund", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          erstelle_tagesbericht_korrektur: {
            data: [{ ok: false, neuer_status: null, fehler: "grund_zu_kurz" }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await erstelleKorrekturversion(
      "123e4567-e89b-12d3-a456-426614174000",
      "x",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/mindestens fünf/i);
  });

  it("erklärt, warum ein Bericht ohne Text nicht geprüft werden kann", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          pruefe_tagesbericht: {
            data: [{ ok: false, neuer_status: "generiert", fehler: "nicht_pruefbar" }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await pruefeTagesbericht("123e4567-e89b-12d3-a456-426614174000");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Berichtstext/i);
  });

  it("verweigert erneutes Prüfen eines finalisierten Berichts", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          pruefe_tagesbericht: {
            data: [{ ok: false, neuer_status: "final", fehler: "finalisiert" }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await pruefeTagesbericht("123e4567-e89b-12d3-a456-426614174000");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/finalisiert/i);
  });

  it("meldet einen fehlenden Bericht bei der Prüfung", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          pruefe_tagesbericht: {
            data: [{ ok: false, neuer_status: null, fehler: "nicht_gefunden" }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await pruefeTagesbericht("123e4567-e89b-12d3-a456-426614174000");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/nicht gefunden/i);
  });

  it("verweigert die Finalisierung eines leeren Berichts", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          finalisiere_tagesbericht: {
            data: [{ ok: false, version: null, fehler: "text_leer" }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await finalisiereTagesbericht("123e4567-e89b-12d3-a456-426614174000");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/leerer/i);
  });

  it("meldet einen fehlenden Bericht bei der Finalisierung", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          finalisiere_tagesbericht: {
            data: [{ ok: false, version: null, fehler: "nicht_gefunden" }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await finalisiereTagesbericht("123e4567-e89b-12d3-a456-426614174000");

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/nicht gefunden/i);
  });

  it("behandelt eine fehlende Versionsnummer als undefiniert", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          finalisiere_tagesbericht: {
            data: [{ ok: true, version: null, fehler: null }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await finalisiereTagesbericht("123e4567-e89b-12d3-a456-426614174000");

    expect(result).toMatchObject({ ok: true, status: "final" });
    expect(result.version).toBeUndefined();
  });

  it("öffnet eine Korrekturversion für einen finalisierten Bericht", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          erstelle_tagesbericht_korrektur: {
            data: [{ ok: true, neuer_status: "generiert", fehler: null }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await erstelleKorrekturversion(
      "123e4567-e89b-12d3-a456-426614174000",
      "Stundenangabe korrigiert",
    );

    expect(result).toMatchObject({ ok: true, status: "generiert" });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/berichte");
  });

  it("lehnt Korrekturen an nicht finalisierten Berichten ab", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          erstelle_tagesbericht_korrektur: {
            data: [{ ok: false, neuer_status: null, fehler: "nicht_final" }],
            error: null,
          },
        },
      }) as never,
    );

    const result = await erstelleKorrekturversion(
      "123e4567-e89b-12d3-a456-426614174000",
      "Stundenangabe korrigiert",
    );

    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/finalisierte/i);
  });
});

describe("Tagesbericht-Eckdaten", () => {
  it("lehnt Änderungen an finalisierten Berichten ab", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({ status: "final" }) as never,
    );

    const result = await updateTagesbericht(
      "123e4567-e89b-12d3-a456-426614174000",
      {},
      berichtFormData(),
    );

    expect(result.message).toMatch(/finalisiert/i);
  });

  it("weist Personal mit mehr als 24 Stunden zurück", async () => {
    const formData = berichtFormData();
    formData.set(
      "personal_json",
      JSON.stringify([{ name: "M. Mustermann", stunden: 30, taetigkeit: "Montage" }]),
    );

    const result = await updateTagesbericht(
      "123e4567-e89b-12d3-a456-426614174000",
      {},
      formData,
    );

    expect(result.errors?.personal_json?.[0]).toMatch(/ungültige Angaben/i);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("meldet einen nicht auffindbaren Bericht statt fälschlich „finalisiert“", async () => {
    mockedCreateClient.mockResolvedValue(createFakeClient({ status: null }) as never);

    const result = await updateTagesbericht(
      "123e4567-e89b-12d3-a456-426614174000",
      {},
      berichtFormData(),
    );

    expect(result.message).toMatch(/nicht gefunden/i);
    expect(result.message).not.toMatch(/finalisiert/i);
  });

  it("speichert gültige Eckdaten und leitet zur Detailseite weiter", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        status: "entwurf",
        rpcAntworten: {
          update_tagesbericht_mit_zeilen: { data: true, error: null },
        },
      }) as never,
    );

    const result = await updateTagesbericht(
      "123e4567-e89b-12d3-a456-426614174000",
      {},
      berichtFormData(),
    );

    expect(result).toMatchObject({
      success: true,
      redirectTo: "/berichte/123e4567-e89b-12d3-a456-426614174000",
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/berichte");
  });
});

describe("Bericht anlegen", () => {
  it("legt einen gültigen Bericht an und leitet zur neuen Detailseite weiter", async () => {
    mockedGetUserProfil.mockResolvedValue({
      id: "22222222-2222-2222-2222-222222222222",
      displayName: "Max Mustermann",
    } as never);
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          create_tagesbericht_mit_zeilen: {
            data: "99999999-9999-9999-9999-999999999999",
            error: null,
          },
        },
      }) as never,
    );

    const result = await createTagesbericht({}, berichtFormData());

    expect(result).toMatchObject({
      success: true,
      redirectTo: "/berichte/99999999-9999-9999-9999-999999999999",
    });
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/berichte");
  });

  it("gibt eine verständliche Meldung zurück, wenn die Anlage fehlschlägt", async () => {
    mockedGetUserProfil.mockResolvedValue(null as never);
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        rpcAntworten: {
          create_tagesbericht_mit_zeilen: { data: null, error: { message: "boom" } },
        },
      }) as never,
    );

    const result = await createTagesbericht({}, berichtFormData());

    expect(result.success).toBeUndefined();
    expect(result.message).toBeTruthy();
  });

  it("validiert Pflichtfelder vor jedem Datenbankzugriff", async () => {
    const formData = berichtFormData();
    formData.set("stichpunkte", "");

    const result = await createTagesbericht({}, formData);

    expect(result.errors?.stichpunkte?.[0]).toBeTruthy();
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });
});
