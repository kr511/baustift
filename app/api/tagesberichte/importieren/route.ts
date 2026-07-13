import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import { extrahiereBerichtAusText } from "@/lib/anthropic/extractBerichtAusDokument";
import {
  DokumentLimitError,
  erkenneDokumentTyp,
  extrahiereText,
} from "@/lib/import/parseDokument";
import { getAuthenticatedClient } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel Functions akzeptieren maximal 4,5 MB Request-Payload. Multipart-
// Metadaten brauchen ebenfalls Platz, deshalb liegt das Dateilimit darunter.
const MAX_DATEIGROESSE = 4 * 1024 * 1024;
const MAX_TEXT_LAENGE = 12_000;
const TAGESLIMIT = 30;

const reservierungSchema = z.object({
  allowed: z.boolean(),
  reason: z.enum(["reserved", "daily_limit"]),
});

export async function POST(request: Request) {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    return NextResponse.json(
      { error: "Nicht angemeldet." },
      { status: 401 },
    );
  }

  // Die Reservierung liegt bewusst vor Multipart-Pufferung und Parsing:
  // auch beschädigte oder missbräuchliche Dateien dürfen CPU/Arbeitsspeicher
  // nicht unbegrenzt ohne Rate-Limit beanspruchen.
  const { data: reservierungRoh, error: reservierungFehler } =
    await auth.supabase.rpc("reserviere_ki_aufruf", {
      p_typ: "import",
      p_tagesbericht_id: null,
    });
  const reservierung = reservierungSchema.safeParse(reservierungRoh);

  if (reservierungFehler || !reservierung.success) {
    console.error("Import-Rate-Limit konnte nicht geprüft werden:", {
      reservierungFehler,
      reservierungRoh,
    });
    return NextResponse.json(
      { error: "Dokument-Import ist vorübergehend nicht verfügbar." },
      { status: 503 },
    );
  }

  if (!reservierung.data.allowed) {
    return NextResponse.json(
      {
        error: `Das Tageslimit von ${TAGESLIMIT} Dokument-Importen ist erreicht. Bitte morgen erneut versuchen.`,
      },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    console.error("Import-Formular konnte nicht gelesen werden:", error);
    return NextResponse.json(
      { error: "Die Dateiübertragung war ungültig oder zu groß." },
      { status: 400 },
    );
  }

  const datei = formData.get("datei");
  if (!(datei instanceof File)) {
    return NextResponse.json(
      { error: "Keine Datei übermittelt." },
      { status: 400 },
    );
  }

  if (datei.size <= 0) {
    return NextResponse.json(
      { error: "Die Datei ist leer." },
      { status: 400 },
    );
  }
  if (datei.size > MAX_DATEIGROESSE) {
    return NextResponse.json(
      { error: "Datei ist zu groß (max. 4 MB)." },
      { status: 413 },
    );
  }

  const typ = erkenneDokumentTyp(datei.type, datei.name);
  if (!typ) {
    return NextResponse.json(
      { error: "Nur echte Word- (.docx) und PDF-Dateien werden unterstützt." },
      { status: 400 },
    );
  }

  let text: string;
  try {
    const buffer = Buffer.from(await datei.arrayBuffer());
    text = (await extrahiereText(buffer, typ)).trim();
  } catch (error) {
    if (error instanceof DokumentLimitError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("Dokument-Parsing fehlgeschlagen:", error);
    return NextResponse.json(
      {
        error:
          "Die Datei konnte nicht gelesen werden. Ist sie beschädigt oder passwortgeschützt?",
      },
      { status: 422 },
    );
  }

  if (!text) {
    return NextResponse.json(
      { error: "Im Dokument wurde kein auslesbarer Text gefunden." },
      { status: 422 },
    );
  }

  const wurdeGekuerzt = text.length > MAX_TEXT_LAENGE;

  try {
    const daten = await extrahiereBerichtAusText(text.slice(0, MAX_TEXT_LAENGE));
    return NextResponse.json({ ...daten, wurdeGekuerzt });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        {
          error: `KI-Extraktion fehlgeschlagen (${error.status ?? "Verbindungsfehler"}). Bitte Daten manuell eintragen.`,
        },
        { status: 502 },
      );
    }
    console.error("Dokument-Import fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Unerwarteter Fehler beim Dokument-Import." },
      { status: 500 },
    );
  }
}
