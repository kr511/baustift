export const TAGESBERICHT_STATUS = [
  "entwurf",
  "generiert",
  "geprueft",
  "final",
] as const;

export type TagesberichtWorkflowStatus = (typeof TAGESBERICHT_STATUS)[number];

export interface TagesberichtSnapshot {
  schema_version: 1;
  version: number;
  bericht: {
    id: string;
    datum: string;
    wetter: string;
    stichpunkte: string;
    bericht_text: string | null;
    status: "final";
    created_by: string | null;
    created_by_user_id: string | null;
    created_at: string;
    updated_at: string;
    baustelle: {
      id: string;
      name: string;
      adresse: string | null;
      auftraggeber: string | null;
    };
    firma: {
      id: string;
      name: string;
      wordmark: string;
      land: string;
    };
    personal: {
      name: string;
      stunden: number;
      taetigkeit: string | null;
    }[];
    material: {
      bezeichnung: string;
      menge: string | null;
      typ: "material" | "geraet";
    }[];
    fotos: {
      storage_path: string;
      dateiname: string | null;
    }[];
  };
  finalisierung: {
    am: string;
    von_user_id: string | null;
    von_name: string | null;
    grund: string | null;
  };
}

export interface TagesberichtVersionZusammenfassung {
  version: number;
  grund: string | null;
  erstelltAm: string;
  erstelltVon: string | null;
}

export interface TagesberichtAuditEintrag {
  id: string;
  aktion: string;
  details: Record<string, unknown>;
  createdAt: string;
  userName: string | null;
}

export function istTagesberichtWorkflowStatus(
  wert: unknown,
): wert is TagesberichtWorkflowStatus {
  return typeof wert === "string" && TAGESBERICHT_STATUS.includes(
    wert as TagesberichtWorkflowStatus,
  );
}

export function istTagesberichtSnapshot(wert: unknown): wert is TagesberichtSnapshot {
  if (!wert || typeof wert !== "object") return false;
  const snapshot = wert as Partial<TagesberichtSnapshot>;
  return (
    snapshot.schema_version === 1 &&
    typeof snapshot.version === "number" &&
    !!snapshot.bericht &&
    typeof snapshot.bericht === "object" &&
    !!snapshot.finalisierung &&
    typeof snapshot.finalisierung === "object"
  );
}
