import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";
import { NameForm, PasswortForm } from "@/components/auth/KontoForm";

export const metadata: Metadata = {
  title: "Konto | Baustift",
};

export default async function KontoPage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    profil,
  ] = await Promise.all([supabase.auth.getUser(), getUserProfil()]);

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <span className="label-tag">Einstellungen</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Konto
        </h1>
        {user?.email && (
          <p className="mt-2 font-mono text-sm text-ink-soft">{user.email}</p>
        )}

        <div className="card ticked mt-6 p-6">
          <span className="label-tag mb-3 block">Profil</span>
          <NameForm displayName={profil?.displayName ?? ""} />
        </div>

        <div className="card ticked mt-6 p-6">
          <span className="label-tag mb-3 block">Passwort</span>
          <PasswortForm />
        </div>
      </div>
    </div>
  );
}
