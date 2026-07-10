import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { generateBautagesbericht } from "@/lib/anthropic/generateBericht";

const COOLDOWN_SEKUNDEN = 30;
const TAGESLIMIT_GESAMT = 100;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const { data: bericht, error: berichtError } = await supabase
    .from("tagesberichte")
    .select("id, datum, wetter, stichpunkte, ki_generiert_am, baustellen(name)")
    .eq("id", id)
    .single();

  if (berichtError || !bericht) {
    return NextResponse.json(
      { error: "Tagesbericht wurde nicht gefunden." },
      { status: 404 },
    );
  }

  if (bericht.ki_generiert_am) {
    const sekundenSeitLetzterGenerierung =
      (Date.now() - new Date(bericht.ki_generiert_am).getTime()) / 1000;
    if (sekundenSeitLetzterGenerierung < COOLDOWN_SEKUNDEN) {
      return NextResponse.json(
        {
          error: `Bitte kurz warten – die letzte Generierung ist erst wenige Sekunden her (max. eine alle ${COOLDOWN_SEKUNDEN} Sekunden).`,
        },
        { status: 429 },
      );
    }
  }

  const heuteStart = new Date();
  heuteStart.setHours(0, 0, 0, 0);
  const { count: generierungenHeute } = await supabase
    .from("tagesberichte")
    .select("id", { count: "exact", head: true })
    .gte("ki_generiert_am", heuteStart.toISOString());

  if ((generierungenHeute ?? 0) >= TAGESLIMIT_GESAMT) {
    return NextResponse.json(
      {
        error: `Das Tageslimit von ${TAGESLIMIT_GESAMT} KI-Generierungen ist erreicht. Bitte morgen erneut versuchen.`,
      },
      { status: 429 },
    );
  }

  const [{ data: personal }, { data: material }] = await Promise.all([
    supabase
      .from("tagesbericht_personal")
      .select("name, stunden, taetigkeit")
      .eq("tagesbericht_id", id),
    supabase
      .from("tagesbericht_material")
      .select("bezeichnung, menge, typ")
      .eq("tagesbericht_id", id),
  ]);

  try {
    const berichtText = await generateBautagesbericht({
      baustelleName: bericht.baustellen?.name ?? "Unbekannte Baustelle",
      datum: bericht.datum,
      wetter: bericht.wetter,
      stichpunkte: bericht.stichpunkte,
      personal: personal ?? [],
      material: material ?? [],
    });

    await supabase
      .from("tagesberichte")
      .update({
        bericht_text: berichtText,
        ki_generiert_am: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ berichtText });
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
