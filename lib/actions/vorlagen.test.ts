import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data/profile", () => ({ getUserProfil: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";
import { createStilVorlage, setVorlageAktiv, deleteStilVorlage } from "@/lib/actions/vorlagen";

const mockedCreateClient = vi.mocked(createClient);
const mockedGetUserProfil = vi.mocked(getUserProfil);

const VORLAGE_ID = "123e4567-e89b-12d3-a456-426614174000";

function adminProfil(firmaId = "firma-1") {
  return {
    id: "admin-1",
    displayName: "Admin",
    role: "admin" as const,
    firmaId,
    niederlassungId: null,
  };
}

function nutzerProfil() {
  return {
    id: "nutzer-1",
    displayName: "Nutzer",
    role: "nutzer" as const,
    firmaId: "firma-1",
    niederlassungId: null,
  };
}

function vorlageFormData(fields: Partial<Record<"titel" | "beispiel_text", string>> = {}) {
  const fd = new FormData();
  fd.set("titel", fields.titel ?? "Titel");
  fd.set("beispiel_text", fields.beispiel_text ?? "Beispieltext");
  return fd;
}

// Zeichnet .eq()-Aufrufe auf, damit Tests prüfen können, dass Updates/Deletes
// tatsächlich nach firma_id gefiltert werden (Regressionsschutz für die
// Ownership-Prüfung), nicht nur, dass sie mit dem richtigen Ergebnis enden.
function createFakeClient(maybeSingleResult: { data: unknown; error: unknown }) {
  const eqCalls: [string, unknown][] = [];
  const qb = {
    eq(col: string, val: unknown) {
      eqCalls.push([col, val]);
      return qb;
    },
    update: () => qb,
    delete: () => qb,
    select: () => qb,
    maybeSingle: () => Promise.resolve(maybeSingleResult),
  };
  return { from: () => qb, eqCalls };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createStilVorlage", () => {
  it("lehnt Nicht-Admins ab", async () => {
    mockedGetUserProfil.mockResolvedValue(nutzerProfil());

    const result = await createStilVorlage({}, vorlageFormData());

    expect(result.message).toMatch(/Administratoren/i);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("lehnt leeren Titel ab", async () => {
    mockedGetUserProfil.mockResolvedValue(adminProfil());

    const result = await createStilVorlage({}, vorlageFormData({ titel: "" }));

    expect(result.errors?.titel).toBeTruthy();
  });

  it("lehnt Beispieltext über 6000 Zeichen ab", async () => {
    mockedGetUserProfil.mockResolvedValue(adminProfil());

    const result = await createStilVorlage(
      {},
      vorlageFormData({ beispiel_text: "x".repeat(6001) }),
    );

    expect(result.errors?.beispiel_text).toBeTruthy();
  });
});

describe("setVorlageAktiv", () => {
  it("lehnt Nicht-Admins ab", async () => {
    mockedGetUserProfil.mockResolvedValue(nutzerProfil());

    const result = await setVorlageAktiv(VORLAGE_ID, true);

    expect(result.ok).toBe(false);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("filtert das Update nach firma_id des Aufrufers (Ownership-Check)", async () => {
    mockedGetUserProfil.mockResolvedValue(adminProfil("firma-xyz"));
    const client = createFakeClient({ data: { id: VORLAGE_ID }, error: null });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await setVorlageAktiv(VORLAGE_ID, true);

    expect(result.ok).toBe(true);
    expect(client.eqCalls).toContainEqual(["firma_id", "firma-xyz"]);
  });
});

describe("deleteStilVorlage", () => {
  it("lehnt Nicht-Admins ab", async () => {
    mockedGetUserProfil.mockResolvedValue(nutzerProfil());

    const result = await deleteStilVorlage(VORLAGE_ID);

    expect(result.ok).toBe(false);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("filtert das Delete nach firma_id des Aufrufers (Ownership-Check)", async () => {
    mockedGetUserProfil.mockResolvedValue(adminProfil("firma-xyz"));
    const client = createFakeClient({ data: { id: VORLAGE_ID }, error: null });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await deleteStilVorlage(VORLAGE_ID);

    expect(result.ok).toBe(true);
    expect(client.eqCalls).toContainEqual(["firma_id", "firma-xyz"]);
  });
});
