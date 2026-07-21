import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getTagesberichtVersionVollstaendig } from "@/lib/data/tagesberichte";
import { istTagesberichtSnapshot } from "@/lib/types/tagesbericht-workflow";

// Bildet die Chainable-Query nach: from().select().eq().eq().maybeSingle().
function createFakeClient({
  data = null,
  error = null,
}: {
  data?: unknown;
  error?: unknown;
} = {}) {
  const query: Record<string, unknown> = {
    select: () => query,
    eq: () => query,
    maybeSingle: () => Promise.resolve({ data, error }),
  };
  return { from: () => query };
}

const gueltigerSnapshot = {
  schema_version: 1,
  version: 3,
  bericht: {
    id: "11111111-1111-1111-1111-111111111111",
    datum: "2026-07-10",
    wetter: "Sonnig, 20°C",
    stichpunkte: "Fundament betoniert",
    bericht_text: "Fertiger, finalisierter Bericht.",
    status: "final",
    created_by: "Max Mustermann",
    created_by_user_id: "22222222-2222-2222-2222-222222222222",
    created_at: "2026-07-10T08:00:00.000Z",
    updated_at: "2026-07-10T16:00:00.000Z",
    baustelle: { id: "33333333-3333-3333-3333-333333333333", name: "Baustelle Nord", adresse: null, auftraggeber: null },
    firma: { id: "44444444-4444-4444-4444-444444444444", name: "Bau GmbH", wordmark: "BAU", land: "DE" },
    personal: [{ name: "Max Mustermann", stunden: 8, taetigkeit: null }],
    material: [],
    fotos: [],
  },
  finalisierung: {
    am: "2026-07-10T16:30:00.000Z",
    von_user_id: "22222222-2222-2222-2222-222222222222",
    von_name: "Max Mustermann",
    grund: "Stundenkorrektur nach Rücksprache",
  },
};

const mockedCreateClient = vi.mocked(createClient);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTagesberichtVersionVollstaendig", () => {
  it("gibt null zurück und fragt die Datenbank nicht ab, wenn die Version kleiner als 1 ist", async () => {
    const result = await getTagesberichtVersionVollstaendig(
      "11111111-1111-1111-1111-111111111111",
      0,
    );

    expect(result).toBeNull();
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("gibt null zurück bei einer nicht ganzzahligen Version", async () => {
    const result = await getTagesberichtVersionVollstaendig(
      "11111111-1111-1111-1111-111111111111",
      1.5,
    );

    expect(result).toBeNull();
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("gibt null zurück, wenn die Version nicht existiert (gelöschte/fehlende Version)", async () => {
    mockedCreateClient.mockResolvedValue(createFakeClient({ data: null }) as never);

    const result = await getTagesberichtVersionVollstaendig(
      "11111111-1111-1111-1111-111111111111",
      2,
    );

    expect(result).toBeNull();
  });

  it("verwirft einen beschädigten Snapshot statt zu rendern", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({ data: { snapshot: { schema_version: 2 } } }) as never,
    );

    const result = await getTagesberichtVersionVollstaendig(
      "11111111-1111-1111-1111-111111111111",
      2,
    );

    expect(result).toBeNull();
  });

  it("liefert den eingefrorenen Stand einer gültigen Version", async () => {
    mockedCreateClient.mockResolvedValue(
      createFakeClient({ data: { snapshot: gueltigerSnapshot } }) as never,
    );

    const result = await getTagesberichtVersionVollstaendig(
      "11111111-1111-1111-1111-111111111111",
      3,
    );

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      status: "final",
      aktuelle_version: 3,
      angezeigte_version: 3,
      versionsgrund: "Stundenkorrektur nach Rücksprache",
      finalisiert_von: "Max Mustermann",
      fotos: [],
    });
  });
});

describe("istTagesberichtSnapshot", () => {
  it("akzeptiert einen vollständigen Snapshot", () => {
    expect(istTagesberichtSnapshot(gueltigerSnapshot)).toBe(true);
  });

  it("verwirft null, primitive Werte und falsche Schema-Versionen", () => {
    expect(istTagesberichtSnapshot(null)).toBe(false);
    expect(istTagesberichtSnapshot("snapshot")).toBe(false);
    expect(istTagesberichtSnapshot({ schema_version: 2, version: 1, bericht: {}, finalisierung: {} })).toBe(false);
    expect(istTagesberichtSnapshot({ schema_version: 1, bericht: {}, finalisierung: {} })).toBe(false);
  });
});
