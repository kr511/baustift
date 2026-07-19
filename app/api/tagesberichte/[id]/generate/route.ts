import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { getUserFirma } from "@/lib/data/firma";
import { getKiKontextDokumente } from "@/lib/data/kiKontextDokumente";
import { getAktiveStilVorlagen } from "@/lib/data/stilVorlagen";
import { generateBautagesbericht } from "@/lib/anthropic/generateBericht";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const { data: bericht, error: berichtError } = await supabase
    .from("tagesberichte")
    .select(
      "id, baustelle_id, datum, wetter, stichpunkte, status, baustellen(name)",
    )
    .eq("id", id)
    .single();

  if (berichtError || !bericht) {
    return NextResponse.json(
      { error: "Tagesbericht wurde nicht gefunden." },
      { status: 404 },
    );
  }

  if (bericht.status === "final") {
    return NextResponse.json(
      {
        error:
          "Der Bericht ist finalisiert und kann nicht mehr neu generiert werden.",
      },
      { status: 409 },
    );
  }

  // Reservierung, Cooldown und Tageslimit passieren in einer DB-Funktion.
  // Damit können parallele Tabs keine doppelte Anthropic-Anfrage auslösen.
  const { data: reservierungen, error: reservierungsError } = await supabase.rpc(
    "reserviere_ki_generierung",
    { p_tagesbericht_id: id },
  );
  const reservierung = reservierungen?.[0];

  if (reservierungsError || !reservierung) {
    console.error("KI-Generierung konnte nicht reserviert werden:", reservierungsError);
    return NextResponse.json(
      { error: "KI-Generierung konnte nicht vorbereitet werden. Bitte erneut versuchen." },
      { status: 500 },
    );
  }

  if (!reservierung.erlaubt) {
    if (reservierung.grund === "final") {
      return NextResponse.json(
        { error: "Der Bericht ist finalisiert und kann nicht mehr neu generiert werden." },
        { status: 409 },
      );
    }
    if (reservierung.grund === "tageslimit") {
      return NextResponse.json(
        { error: "Das Tageslimit von 100 KI-Generierungen ist erreicht. Bitte morgen erneut versuchen." },
        { status: 429 },
      );
    }
    if (reservierung.grund === "cooldown") {
      return NextResponse.json(
        {
          error: `Bitte kurz warten – die letzte Generierung ist erst wenige Sekunden her (noch ${reservierung.verbleibende_sekunden ?? 1} Sekunden).`,
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Tagesbericht wurde nicht gefunden." },
      { status: 404 },
    );
  }

  const firma = await getUserFirma();

  const [{ data: personal }, { data: material }, kiKontext, stilVorlagen] =
    await Promise.all([
      supabase
        .from("tagesbericht_personal")
        .select("name, stunden, taetigkeit")
        .eq("tagesbericht_id", id),
      supabase
        .from("tagesbericht_material")
        .select("bezeichnung, menge, typ")
        .eq("tagesbericht_id", id),
      getKiKontextDokumente(bericht.baustelle_id),
      firma ? getAktiveStilVorlagen(firma.id) : Promise.resolve([]),
    ]);

  try {
    const berichtText = await generateBautagesbericht({
      firma: firma ? { name: firma.name, land: firma.land } : null,
      baustelleName: bericht.baustellen?.name ?? "Unbekannte Baustelle",
      datum: bericht.datum,
      wetter: bericht.wetter,
      stichpunkte: bericht.stichpunkte,
      personal: personal ?? [],
      material: material ?? [],
      dokumente: kiKontext.dokumente,
      stilVorlagen,
    });

    const { data: gespeichert, error: speichernError } = await supabase
      .from("tagesberichte")
      .update({
        bericht_text: berichtText,
      })
      .eq("id", id)
      .eq("status", "entwurf")
      .select("id")
      .maybeSingle();

    if (speichernError || !gespeichert) {
      if (speichernError) {
        console.error("KI-Text konnte nicht gespeichert werden:", speichernError);
      }
      return NextResponse.json(
        {
          error:
            "Der generierte Text konnte nicht gespeichert werden, weil der Bericht inzwischen finalisiert wurde.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      berichtText,
      ausgelasseneDokumente: kiKontext.ausgelassen,
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        {
          error: `KI-Generierung fehlgeschlagen (${err.status ?? "Verbindungsfehler"}). Bitte erneut versuchen oder den Bericht manuell eintragen.`,
        },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { error: "Unerwarteter Fehler bei der KI-Generierung." },
      { status: 500 },
    );
  }
}
