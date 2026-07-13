import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateBautagesbericht } from "@/lib/anthropic/generateBericht";
import { getAuthenticatedClient } from "@/lib/supabase/auth";

const TAGESLIMIT_GESAMT = 100;

const reservierungSchema = z.object({
  allowed: z.boolean(),
  reason: z.enum(["reserved", "not_found", "final", "cooldown", "daily_limit"]),
  retry_after: z.number().int().nonnegative().optional(),
});

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const validatedId = z.string().uuid().safeParse(id);
  if (!validatedId.success) {
    return NextResponse.json(
      { error: "Ungültiger Tagesbericht." },
      { status: 400 },
    );
  }

  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json(
      { error: "Nicht angemeldet." },
      { status: 401 },
    );
  }

  const { data: reservierungRoh, error: reservierungFehler } =
    await auth.supabase.rpc("reserviere_ki_aufruf", {
      p_typ: "bericht",
      p_tagesbericht_id: validatedId.data,
    });
  const reservierung = reservierungSchema.safeParse(reservierungRoh);

  if (reservierungFehler || !reservierung.success) {
    console.error("KI-Rate-Limit konnte nicht geprüft werden:", {
      reservierungFehler,
      reservierungRoh,
    });
    return NextResponse.json(
      { error: "KI-Generierung ist vorübergehend nicht verfügbar." },
      { status: 503 },
    );
  }

  if (!reservierung.data.allowed) {
    if (reservierung.data.reason === "not_found") {
      return NextResponse.json(
        { error: "Tagesbericht wurde nicht gefunden." },
        { status: 404 },
      );
    }
    if (reservierung.data.reason === "final") {
      return NextResponse.json(
        { error: "Finalisierte Tagesberichte können nicht neu generiert werden." },
        { status: 409 },
      );
    }
    if (reservierung.data.reason === "cooldown") {
      const retryAfter = Math.max(1, reservierung.data.retry_after ?? 30);
      return NextResponse.json(
        {
          error: `Bitte ${retryAfter} Sekunden warten, bevor der Bericht erneut generiert wird.`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
    return NextResponse.json(
      {
        error: `Das Tageslimit von ${TAGESLIMIT_GESAMT} KI-Generierungen ist erreicht. Bitte morgen erneut versuchen.`,
      },
      { status: 429 },
    );
  }

  const { data: bericht, error: berichtError } = await auth.supabase
    .from("tagesberichte")
    .select("id, datum, wetter, stichpunkte, status, updated_at, baustellen(name)")
    .eq("id", validatedId.data)
    .single();

  if (berichtError || !bericht) {
    console.error("Tagesbericht für KI konnte nicht geladen werden:", berichtError);
    return NextResponse.json(
      { error: "Tagesbericht konnte nicht geladen werden." },
      { status: berichtError?.code === "PGRST116" ? 404 : 500 },
    );
  }

  if (bericht.status === "final") {
    return NextResponse.json(
      { error: "Finalisierte Tagesberichte können nicht neu generiert werden." },
      { status: 409 },
    );
  }

  const [personalResult, materialResult] = await Promise.all([
    auth.supabase
      .from("tagesbericht_personal")
      .select("name, stunden, taetigkeit")
      .eq("tagesbericht_id", validatedId.data),
    auth.supabase
      .from("tagesbericht_material")
      .select("bezeichnung, menge, typ")
      .eq("tagesbericht_id", validatedId.data),
  ]);

  if (personalResult.error || materialResult.error) {
    console.error("Berichtsdetails für KI konnten nicht geladen werden:", {
      personal: personalResult.error,
      material: materialResult.error,
    });
    return NextResponse.json(
      { error: "Berichtsdetails konnten nicht vollständig geladen werden." },
      { status: 500 },
    );
  }

  try {
    const berichtText = await generateBautagesbericht({
      baustelleName: bericht.baustellen?.name ?? "Unbekannte Baustelle",
      datum: bericht.datum,
      wetter: bericht.wetter,
      stichpunkte: bericht.stichpunkte,
      personal: personalResult.data ?? [],
      material: materialResult.data ?? [],
    });

    const { data: updatedAt, error: speicherFehler } = await auth.supabase.rpc(
      "speichere_bericht_text",
      {
        p_id: validatedId.data,
        p_bericht_text: berichtText,
        p_erwartete_updated_at: bericht.updated_at,
      },
    );

    if (speicherFehler) {
      console.error("KI-Bericht konnte nicht gespeichert werden:", speicherFehler);
      return NextResponse.json(
        {
          error:
            speicherFehler.code === "55000"
              ? "Der Tagesbericht wurde inzwischen finalisiert."
              : speicherFehler.code === "40001"
                ? "Der Tagesbericht wurde während der Generierung geändert. Die KI-Antwort wurde deshalb nicht gespeichert. Bitte erneut generieren."
                : "Der erzeugte Bericht konnte nicht gespeichert werden.",
        },
        {
          status:
            speicherFehler.code === "55000" || speicherFehler.code === "40001"
              ? 409
              : 500,
        },
      );
    }

    if (!updatedAt) {
      return NextResponse.json(
        { error: "Der erzeugte Bericht konnte nicht gespeichert werden." },
        { status: 500 },
      );
    }

    return NextResponse.json({ berichtText, updatedAt });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        {
          error: `KI-Generierung fehlgeschlagen (${error.status ?? "Verbindungsfehler"}). Bitte erneut versuchen oder den Bericht manuell eintragen.`,
        },
        { status: 502 },
      );
    }
    console.error("KI-Generierung fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Unerwarteter Fehler bei der KI-Generierung." },
      { status: 500 },
    );
  }
}
