import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBaustelleDokumente } from "@/lib/data/dokumente";
import { getUserProfil } from "@/lib/data/profile";
import { DokumentUpload } from "@/components/baustellen/DokumentUpload";
import { DokumenteListe } from "@/components/baustellen/DokumenteListe";

export default async function BaustelleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: baustelle, error: baustelleError }, dokumente, profil] =
    await Promise.all([
      supabase
        .from("baustellen")
        .select("id, name, adresse, auftraggeber, status, notiz")
        .eq("id", id)
        .single(),
      getBaustelleDokumente(id),
      getUserProfil(),
    ]);

  // PGRST116 = "keine Zeile gefunden" (falsche ID/fremde Firma via RLS) —
  // das ist ein normales 404. Jeder andere Fehler ist ein echter
  // DB-/Netzwerkfehler und soll nicht als stilles 404 verschwinden.
  if (baustelleError && baustelleError.code !== "PGRST116") {
    console.error("BaustelleDetailPage: Baustelle konnte nicht geladen werden:", baustelleError);
    throw new Error("Baustelle konnte nicht geladen werden.");
  }
  if (!baustelle) notFound();

  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="border-b-2 border-ink pb-4">
          <span className="label-tag">Baustelle</span>
          <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            {baustelle.name}
          </h1>
          <p className="mt-1 font-mono text-xs text-ink-soft">
            {[baustelle.adresse, baustelle.auftraggeber].filter(Boolean).join(" · ") ||
              "Keine weiteren Angaben"}
          </p>
        </div>

        <div className="mt-6">
          <Link
            href={`/berichte?baustelle=${baustelle.id}`}
            className="btn-secondary"
          >
            Berichte dieser Baustelle
          </Link>
        </div>

        <div className="card ticked mt-8 p-6">
          <span className="label-tag mb-3 block">
            Dokumente-Ablage (Leistungsverzeichnis, Bauzeitenplan, Pläne …)
          </span>
          {profil?.firmaId && (
            <DokumentUpload baustelleId={baustelle.id} firmaId={profil.firmaId} />
          )}
          <div className="mt-4">
            <DokumenteListe baustelleId={baustelle.id} dokumente={dokumente} />
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Mit &bdquo;Für KI-Kontext verwenden&ldquo; markierte PDFs werden
            bei der Berichtserstellung an die KI übermittelt, damit sie
            Fachbegriffe und Positionsbezeichnungen korrekt übernimmt (siehe{" "}
            <Link href="/datenschutz" className="underline">
              Datenschutzerklärung
            </Link>
            ).
          </p>
        </div>
      </div>
    </div>
  );
}
