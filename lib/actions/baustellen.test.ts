import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data/profile", () => ({ getUserProfil: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";
import { createBaustelle, setBaustelleStatus } from "@/lib/actions/baustellen";

const mockedCreateClient = vi.mocked(createClient);
const mockedGetUserProfil = vi.mocked(getUserProfil);

const BAUSTELLE_ID = "123e4567-e89b-12d3-a456-426614174000";

function profil(firmaId = "firma-1") {
  return {
    id: "user-1",
    displayName: "Nutzer",
    role: "nutzer" as const,
    firmaId,
    niederlassungId: null,
  };
}

function baustelleFormData(
  fields: Partial<Record<"name" | "adresse" | "auftraggeber" | "notiz", string>> = {},
) {
  const fd = new FormData();
  // FormData.get() liefert null für nicht gesetzte Felder, echte
  // <input>-Elemente senden aber immer "" — Felder daher wie im echten
  // Formular immer setzen, sonst schlägt z.string().optional() auf null fehl.
  fd.set("name", fields.name ?? "Wohnbau Musterstraße");
  fd.set("adresse", fields.adresse ?? "");
  fd.set("auftraggeber", fields.auftraggeber ?? "");
  fd.set("notiz", fields.notiz ?? "");
  return fd;
}

function createFakeInsertClient(insertError: unknown = null) {
  return { from: () => ({ insert: () => Promise.resolve({ error: insertError }) }) };
}

// Zeichnet .eq()-Aufrufe auf, damit Tests belegen können, dass Updates
// tatsächlich nach firma_id gefiltert werden (Regressionsschutz für die
// Ownership-Prüfung in setBaustelleStatus).
function createFakeUpdateClient(maybeSingleResult: { data: unknown; error: unknown }) {
  const eqCalls: [string, unknown][] = [];
  const qb = {
    eq(col: string, val: unknown) {
      eqCalls.push([col, val]);
      return qb;
    },
    update: () => qb,
    select: () => qb,
    maybeSingle: () => Promise.resolve(maybeSingleResult),
  };
  return { from: () => qb, eqCalls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createBaustelle", () => {
  it("lehnt fehlenden Namen ab", async () => {
    const result = await createBaustelle({}, baustelleFormData({ name: "" }));
    expect(result.errors?.name).toBeTruthy();
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("lehnt einen Namen über 200 Zeichen ab", async () => {
    const result = await createBaustelle({}, baustelleFormData({ name: "x".repeat(201) }));
    expect(result.errors?.name).toBeTruthy();
  });

  it("lehnt eine Adresse über 300 Zeichen ab", async () => {
    const result = await createBaustelle({}, baustelleFormData({ adresse: "x".repeat(301) }));
    expect(result.errors?.adresse).toBeTruthy();
  });

  it("lehnt eine Notiz über 2000 Zeichen ab", async () => {
    const result = await createBaustelle({}, baustelleFormData({ notiz: "x".repeat(2001) }));
    expect(result.errors?.notiz).toBeTruthy();
  });

  it("legt bei gültigen Daten die Baustelle an", async () => {
    mockedGetUserProfil.mockResolvedValue(profil());
    mockedCreateClient.mockResolvedValue(createFakeInsertClient(null) as never);

    const result = await createBaustelle({}, baustelleFormData());

    expect(result.message).toBe("success");
  });
});

describe("setBaustelleStatus", () => {
  it("lehnt nicht angemeldete Nutzer ab", async () => {
    mockedGetUserProfil.mockResolvedValue(null);

    const result = await setBaustelleStatus(BAUSTELLE_ID, "pausiert");

    expect(result.ok).toBe(false);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("filtert das Update nach firma_id des Aufrufers (Ownership-Check)", async () => {
    mockedGetUserProfil.mockResolvedValue(profil("firma-xyz"));
    const client = createFakeUpdateClient({ data: { id: BAUSTELLE_ID }, error: null });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await setBaustelleStatus(BAUSTELLE_ID, "abgeschlossen");

    expect(result.ok).toBe(true);
    expect(client.eqCalls).toContainEqual(["firma_id", "firma-xyz"]);
  });

  it("lehnt einen ungültigen Status ab", async () => {
    mockedGetUserProfil.mockResolvedValue(profil());

    const result = await setBaustelleStatus(BAUSTELLE_ID, "erledigt" as never);

    expect(result.ok).toBe(false);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });
});
