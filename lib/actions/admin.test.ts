import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/profile", () => ({ getUserProfil: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { getUserProfil } from "@/lib/data/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteNutzer } from "@/lib/actions/admin";

const mockedGetUserProfil = vi.mocked(getUserProfil);
const mockedCreateAdminClient = vi.mocked(createAdminClient);

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

function einladungFormData(fields: Partial<Record<"email" | "display_name" | "role", string>> = {}) {
  const fd = new FormData();
  fd.set("email", fields.email ?? "neu@example.com");
  fd.set("display_name", fields.display_name ?? "Neue Person");
  fd.set("role", fields.role ?? "nutzer");
  return fd;
}

function fakeAdminClient(inviteResult: { error: unknown }) {
  const inviteUserByEmail = vi.fn().mockResolvedValue(inviteResult);
  return { auth: { admin: { inviteUserByEmail } } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("inviteNutzer", () => {
  it("lehnt Nicht-Admins ab, bevor der Admin-Client überhaupt erstellt wird", async () => {
    mockedGetUserProfil.mockResolvedValue(nutzerProfil());

    const result = await inviteNutzer({}, einladungFormData());

    expect(result.message).toMatch(/Administratoren/i);
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
  });

  it("lehnt ungültige E-Mail-Adressen ab", async () => {
    mockedGetUserProfil.mockResolvedValue(adminProfil());

    const result = await inviteNutzer({}, einladungFormData({ email: "keine-email" }));

    expect(result.errors?.email).toBeTruthy();
    expect(mockedCreateAdminClient).not.toHaveBeenCalled();
  });

  it("setzt firma_id immer auf die des einladenden Admins, nie aus Client-Eingabe", async () => {
    mockedGetUserProfil.mockResolvedValue(adminProfil("firma-xyz"));
    const client = fakeAdminClient({ error: null });
    mockedCreateAdminClient.mockReturnValue(client as never);

    await inviteNutzer({}, einladungFormData({ role: "admin" }));

    expect(client.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      "neu@example.com",
      expect.objectContaining({
        data: expect.objectContaining({ firma_id: "firma-xyz" }),
      }),
    );
  });

  it("liefert bei bereits existierender E-Mail dieselbe generische Meldung wie bei jedem anderen Fehler (keine User-Enumeration)", async () => {
    mockedGetUserProfil.mockResolvedValue(adminProfil());

    mockedCreateAdminClient.mockReturnValue(
      fakeAdminClient({ error: { code: "email_exists", message: "existiert" } }) as never,
    );
    const existiertBereits = await inviteNutzer({}, einladungFormData());

    mockedCreateAdminClient.mockReturnValue(
      fakeAdminClient({ error: { code: "unexpected_failure", message: "boom" } }) as never,
    );
    const andererFehler = await inviteNutzer({}, einladungFormData());

    expect(existiertBereits.message).toBe(andererFehler.message);
  });
});
