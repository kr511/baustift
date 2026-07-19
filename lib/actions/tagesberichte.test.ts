import { describe, it, expect, vi, beforeEach } from "vitest";

// next/cache + next/navigation sind in Server Actions importiert, aber im Test
// ohne Next-Runtime – als No-ops mocken.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import {
  finalisiereTagesbericht,
  updateBerichtText,
  updateTagesbericht,
} from "@/lib/actions/tagesberichte";

function createFakeClient({
  status,
  updateError = null,
}: {
  status: "entwurf" | "final" | null;
  updateError?: unknown;
}) {
  return {
    from() {
      let mode: "update" | "other" = "other";
      const qb: Record<string, unknown> = {
        select: () => qb,
        update: () => {
          mode = "update";
          return qb;
        },
        delete: () => qb,
        insert: () => qb,
        eq: () => qb,
        single: () =>
          Promise.resolve({
            data: status === null ? null : { status },
            error: status === null ? { message: "not found" } : null,
          }),
        maybeSingle: () =>
          Promise.resolve(
            mode === "update"
              ? { data: updateError ? null : { id: "id-1" }, error: updateError }
              : { data: null, error: null },
          ),
      };
      return qb;
    },
    rpc: vi.fn(),
  };
}

const mockedCreateClient = vi.mocked(createClient);

function berichtFormData() {
  const fd = new FormData();
  fd.set("baustelle_id", "123e4567-e89b-12d3-a456-426614174000");
  fd.set("datum", "2026-07-14");
  fd.set("wetter", "Sonnig, 18°C");
  fd.set("stichpunkte", "Fundament betoniert");
  fd.set("personal_json", "[]");
  fd.set("material_json", "[]");
  fd.set("foto_json", "[]");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("updateBerichtText", () => {
  it("lehnt finalisierte Berichte ab (Server-Guard)", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({ status: "final" }) as never,
    );
    const result = await updateBerichtText(
      "123e4567-e89b-12d3-a456-426614174000",
      "Neuer Text",
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/finalisiert/i);
  });

  it("liefert ok:false bei einem Supabase-Fehler", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        status: "entwurf",
        updateError: { message: "boom" },
      }) as never,
    );
    const result = await updateBerichtText(
      "123e4567-e89b-12d3-a456-426614174000",
      "Neuer Text",
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("liefert ok:true bei erfolgreichem Speichern", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({ status: "entwurf" }) as never,
    );
    const result = await updateBerichtText(
      "123e4567-e89b-12d3-a456-426614174000",
      "Neuer Text",
    );
    expect(result.ok).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe("Tagesbericht-Integrität", () => {
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

  it("weist Personal mit mehr als 24 Stunden zurück, statt die Zeile zu verwerfen", async () => {
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

  it("meldet einen Fehler beim Finalisieren zurück", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({
        status: "entwurf",
        updateError: { message: "boom" },
      }) as never,
    );
    const result = await finalisiereTagesbericht(
      "123e4567-e89b-12d3-a456-426614174000",
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
