import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { generateBautagesbericht } from "@/lib/anthropic/generateBericht";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();

  const { data: bericht, error: berichtError } = await supabase
    .from("tagesberichte")
    .select("id, datum, wetter, stichpunkte, baustellen(name)")
    .eq("id", id)
    .single();

  if (berichtError || !bericht) {
    return NextResponse.json(
      { error: "Tagesbericht wurde nicht gefunden." },
      { status: 404 },
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
      .update({ bericht_text: berichtText })
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
