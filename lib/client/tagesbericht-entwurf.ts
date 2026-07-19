export const TAGESBERICHT_ENTWURF_VERSION = 1 as const;

export interface EntwurfPersonalZeile {
  name: string;
  stunden: string;
  taetigkeit: string;
}

export interface EntwurfMaterialZeile {
  bezeichnung: string;
  menge: string;
  typ: "material" | "geraet";
}

export interface TagesberichtEntwurfInhalt {
  baustelle_id: string;
  datum: string;
  wetter: string;
  stichpunkte: string;
  personal: EntwurfPersonalZeile[];
  material: EntwurfMaterialZeile[];
}

export interface TagesberichtEntwurf {
  version: typeof TAGESBERICHT_ENTWURF_VERSION;
  gespeichertAm: string;
  inhalt: TagesberichtEntwurfInhalt;
}

function istObjekt(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function istString(value: unknown): value is string {
  return typeof value === "string";
}

function istPersonalZeile(value: unknown): value is EntwurfPersonalZeile {
  return (
    istObjekt(value) &&
    istString(value.name) &&
    istString(value.stunden) &&
    istString(value.taetigkeit)
  );
}

function istMaterialZeile(value: unknown): value is EntwurfMaterialZeile {
  return (
    istObjekt(value) &&
    istString(value.bezeichnung) &&
    istString(value.menge) &&
    (value.typ === "material" || value.typ === "geraet")
  );
}

function istInhalt(value: unknown): value is TagesberichtEntwurfInhalt {
  return (
    istObjekt(value) &&
    istString(value.baustelle_id) &&
    istString(value.datum) &&
    istString(value.wetter) &&
    istString(value.stichpunkte) &&
    Array.isArray(value.personal) &&
    value.personal.every(istPersonalZeile) &&
    Array.isArray(value.material) &&
    value.material.every(istMaterialZeile)
  );
}

export function erstelleTagesberichtEntwurf(
  inhalt: TagesberichtEntwurfInhalt,
  gespeichertAm = new Date().toISOString(),
): TagesberichtEntwurf {
  return {
    version: TAGESBERICHT_ENTWURF_VERSION,
    gespeichertAm,
    inhalt,
  };
}

export function parseTagesberichtEntwurf(raw: string): TagesberichtEntwurf | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (
    !istObjekt(value) ||
    value.version !== TAGESBERICHT_ENTWURF_VERSION ||
    !istString(value.gespeichertAm) ||
    Number.isNaN(Date.parse(value.gespeichertAm)) ||
    !istInhalt(value.inhalt)
  ) {
    return null;
  }

  return value as unknown as TagesberichtEntwurf;
}

export function istEntwurfNeuerAls(
  entwurf: TagesberichtEntwurf,
  serverZeitpunkt?: string,
): boolean {
  if (!serverZeitpunkt) return true;

  const entwurfZeit = Date.parse(entwurf.gespeichertAm);
  const serverZeit = Date.parse(serverZeitpunkt);
  if (Number.isNaN(serverZeit)) return true;

  return entwurfZeit > serverZeit;
}
