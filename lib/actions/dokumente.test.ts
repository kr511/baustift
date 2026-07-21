import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/data/profile", () => ({ getUserProfil: vi.fn() }));

import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";
import { createDokument, deleteDokument, setKiKontext } from "@/lib/actions/dokumente";

const mockedCreateClient = vi.mocked(createClient);
const mockedGetUserProfil = vi.mocked(getUserProfil);

const BAUSTELLE_ID = "123e4567-e89b-12d3-a456-426614174000";
const DOKUMENT_ID = "223e4567-e89b-12d3-a456-426614174001";

// Zeichnet .eq()-Aufrufe auf, damit Tests belegen können, dass Queries
// tatsächlich nach baustelle_id gefiltert werden (Regressionsschutz für die
// Ownership-Prüfung aus deleteDokument/setKiKontext), statt nur das
// Endergebnis zu prüfen.
function createFakeClient(options: {
  singleResult?: { data: unknown; error: unknown };
  maybeSingleResult?: { data: unknown; error: unknown };
  insertError?: unknown;
}) {
  const eqCalls: [string, unknown][] = [];
  const storageRemove = vi.fn().mockResolvedValue({ error: null });
  const qb = {
    eq(col: string, val: unknown) {
      eqCalls.push([col, val]);
      return qb;
    },
    select: () => qb,
    update: () => qb,
    delete: () => qb,
    single: () => Promise.resolve(options.singleResult ?? { data: null, error: null }),
    maybeSingle: () =>
      Promise.resolve(options.maybeSingleResult ?? { data: null, error: null }),
  };
  return {
    from: () => ({
      ...qb,
      insert: () => Promise.resolve({ error: options.insertError ?? null }),
    }),
    storage: { from: () => ({ remove: storageRemove }) },
    eqCalls,
    storageRemove,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedGetUserProfil.mockResolvedValue(null);
});

describe("createDokument", () => {
  it("lehnt nicht erlaubte MIME-Types ab", async () => {
    const result = await createDokument({
      baustelle_id: BAUSTELLE_ID,
      storage_path: "firma/baustelle/uuid-datei.exe",
      dateiname: "datei.exe",
      mime_type: "application/x-msdownload",
    } as never);

    expect(result.ok).toBe(false);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("akzeptiert erlaubte MIME-Types und speichert das Dokument", async () => {
    const client = createFakeClient({ insertError: null });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await createDokument({
      baustelle_id: BAUSTELLE_ID,
      storage_path: "firma/baustelle/uuid-plan.pdf",
      dateiname: "plan.pdf",
      mime_type: "application/pdf",
    });

    expect(result.ok).toBe(true);
  });
});

describe("deleteDokument", () => {
  it("filtert das Lesen und Löschen nach baustelle_id (Ownership-Check)", async () => {
    const client = createFakeClient({
      singleResult: { data: { storage_path: "p" }, error: null },
      maybeSingleResult: { data: { id: DOKUMENT_ID }, error: null },
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await deleteDokument(BAUSTELLE_ID, DOKUMENT_ID);

    expect(result.ok).toBe(true);
    expect(client.eqCalls).toContainEqual(["baustelle_id", BAUSTELLE_ID]);
  });

  it("scheitert, wenn kein zur baustelle_id passendes Dokument gefunden wird", async () => {
    const client = createFakeClient({
      singleResult: { data: null, error: { message: "not found" } },
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await deleteDokument(BAUSTELLE_ID, DOKUMENT_ID);

    expect(result.ok).toBe(false);
  });
});

describe("setKiKontext", () => {
  it("filtert das Update nach baustelle_id (Ownership-Check)", async () => {
    const client = createFakeClient({
      maybeSingleResult: { data: { id: DOKUMENT_ID }, error: null },
    });
    mockedCreateClient.mockResolvedValue(client as never);

    const result = await setKiKontext(BAUSTELLE_ID, DOKUMENT_ID, true);

    expect(result.ok).toBe(true);
    expect(client.eqCalls).toContainEqual(["baustelle_id", BAUSTELLE_ID]);
  });

  it("scheitert bei ungültiger dokumentId", async () => {
    const result = await setKiKontext(BAUSTELLE_ID, "keine-uuid", true);
    expect(result.ok).toBe(false);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });
});
