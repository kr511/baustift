import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfil } from "@/lib/data/profile";
import { NutzerEinladenForm } from "@/components/admin/NutzerEinladenForm";

export const metadata: Metadata = {
  title: "Nutzerverwaltung | Baustift",
};

export default async function NutzerVerwaltungPage() {
  const profil = await getUserProfil();
  if (profil?.role !== "admin") notFound();

  const supabase = await createClient();
  // RLS liefert nur Profile der eigenen Firma.
  const { data: nutzer } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .order("display_name");

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <span className="label-tag">Verwaltung</span>
        <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
          Nutzer
        </h1>

        <div className="card ticked mt-6 p-6">
          <span className="label-tag mb-3 block">Nutzer einladen</span>
          <NutzerEinladenForm />
        </div>

        <div className="card ticked mt-6 p-6">
          <span className="label-tag mb-3 block">
            Nutzer dieser Firma ({nutzer?.length ?? 0})
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-ink text-left">
                  <th className="label-tag py-1 font-semibold">Name</th>
                  <th className="label-tag py-1 font-semibold">Rolle</th>
                  <th className="label-tag py-1 font-semibold">Seit</th>
                </tr>
              </thead>
              <tbody>
                {(nutzer ?? []).map((n) => (
                  <tr key={n.id} className="border-b border-line">
                    <td className="py-1.5">{n.display_name}</td>
                    <td className="py-1.5">
                      {n.role === "admin" ? "Administrator" : "Nutzer"}
                    </td>
                    <td className="py-1.5 font-mono">
                      {new Date(n.created_at).toLocaleDateString("de-DE")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
