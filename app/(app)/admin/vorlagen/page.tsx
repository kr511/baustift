import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";
import { StilVorlagenEditor } from "@/components/admin/StilVorlagenEditor";

export const metadata: Metadata = {
  title: "Stil-Vorlagen | Baustift",
};

export default async function StilVorlagenPage() {
  const profil = await getUserProfil();
  if (profil?.role !== "admin") notFound();

  const supabase = await createClient();
  const { data: vorlagen } = await supabase
    .from("stil_vorlagen")
    .select("id, titel, beispiel_text, aktiv")
    .order("created_at", { ascending: false });

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <span className="label-tag">Verwaltung</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Stil-Vorlagen
        </h1>
        <p className="mt-2 max-w-xl text-sm text-ink-soft">
          Beispielberichte, deren Ton und Gliederung die KI bei neuen Berichten
          übernimmt. Inhalte, Namen und Mengen aus den Beispielen fließen
          niemals in neue Berichte ein.
        </p>

        <div className="card ticked mt-6 p-6">
          <StilVorlagenEditor vorlagen={vorlagen ?? []} />
        </div>
      </div>
    </div>
  );
}
