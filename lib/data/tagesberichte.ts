import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  istTagesberichtSnapshot,
  istTagesberichtWorkflowStatus,
  type TagesberichtAuditEintrag,
  type TagesberichtSnapshot,
  type TagesberichtVersionZusammenfassung,
  type TagesberichtWorkflowStatus,
} from "@/lib/types/tagesbericht-workflow";

export interface TagesberichtVollstaendig {
  id: string;
  datum: string;
  wetter: string;
  stichpunkte: string;
  bericht_text: string | null;
  status: TagesberichtWorkflowStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  finalisiert_am: string | null;
  finalisiert_von: string | null;
  aktuelle_version: number;
  offener_korrekturgrund: string | null;
  angezeigte_version?: number;
  versionsgrund?: string | null;
  firmaWordmark?: string | null;
  baustelle: {
    id: string;
    name: string;
    adresse?: string | null;
    auftraggeber?: string | null;
  } | null;
  personal: { name: string; stunden: number; taetigkeit: string | null }[];
  material: { bezeichnung: string; menge: string | null; typ: "material" | "geraet" }[];
  fotos: { storage_path: string; dateiname: string | null; url: string }[];
}

async function ladeFotoUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fotos: { storage_path: string; dateiname: string | null }[],
) {
  return Promise.all(
    fotos.map(async (foto) => {
      const { data: signed } = await supabase.storage
        .from("tagesbericht-fotos")
        .createSignedUrl(foto.storage_path, 60 * 60);
      return {
        storage_path: foto.storage_path,
        dateiname: foto.dateiname,
        url: signed?.signedUrl ?? "",
      };
    }),
  );
}

export async function getTagesberichtVollstaendig(
  id: string,
): Promise<TagesberichtVollstaendig | null> {
  const supabase = await createClient();

  const { data: bericht } = await supabase
    .from("tagesberichte")
    .select(
      "id, datum, wetter, stichpunkte, bericht_text, status, created_by, created_at, updated_at, finalisiert_am, finalisiert_von_user_id, aktuelle_version, offener_korrekturgrund, baustellen(id, name, adresse, auftraggeber)",
    )
    .eq("id", id)
    .single();

  if (!bericht) return null;

  const [{ data: personal }, { data: material }, { data: fotos }, finalisierer] =
    await Promise.all([
      supabase
        .from("tagesbericht_personal")
        .select("name, stunden, taetigkeit")
        .eq("tagesbericht_id", id),
      supabase
        .from("tagesbericht_material")
        .select("bezeichnung, menge, typ")
        .eq("tagesbericht_id", id),
      supabase
        .from("tagesbericht_fotos")
        .select("storage_path, dateiname")
        .eq("tagesbericht_id", id),
      bericht.finalisiert_von_user_id
        ? supabase
            .from("profiles")
            .select("display_name")
            .eq("id", bericht.finalisiert_von_user_id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

  const status = istTagesberichtWorkflowStatus(bericht.status)
    ? bericht.status
    : "entwurf";
  const fotosMitUrl = await ladeFotoUrls(supabase, fotos ?? []);

  return {
    id: bericht.id,
    datum: bericht.datum,
    wetter: bericht.wetter,
    stichpunkte: bericht.stichpunkte,
    bericht_text: bericht.bericht_text,
    status,
    created_by: bericht.created_by,
    created_at: bericht.created_at,
    updated_at: bericht.updated_at,
    finalisiert_am: bericht.finalisiert_am,
    finalisiert_von: finalisierer.data?.display_name ?? null,
    aktuelle_version: bericht.aktuelle_version,
    offener_korrekturgrund: bericht.offener_korrekturgrund,
    baustelle: bericht.baustellen,
    personal: personal ?? [],
    material: material ?? [],
    fotos: fotosMitUrl,
  };
}

interface VersionRow {
  version: number;
  grund: string | null;
  erstellt_at: string;
  erstellt_von_user_id: string | null;
  snapshot?: unknown;
}

interface AuditRow {
  id: string;
  aktion: string;
  details: unknown;
  created_at: string;
  user_id: string | null;
}

async function ladeProfilNamen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: (string | null)[],
): Promise<Map<string, string>> {
  const eindeutig = Array.from(new Set(ids.filter((id): id is string => !!id)));
  if (eindeutig.length === 0) return new Map();

  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", eindeutig);

  return new Map((data ?? []).map((profil) => [profil.id, profil.display_name]));
}

export async function getTagesberichtVersionen(
  id: string,
): Promise<TagesberichtVersionZusammenfassung[]> {
  const supabase = await createClient();
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped
    .from("tagesbericht_versionen")
    .select("version, grund, erstellt_at, erstellt_von_user_id")
    .eq("tagesbericht_id", id)
    .order("version", { ascending: false });

  if (error) {
    console.error("Tagesbericht-Versionen konnten nicht geladen werden:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as VersionRow[];
  const profilNamen = await ladeProfilNamen(
    supabase,
    rows.map((row) => row.erstellt_von_user_id),
  );

  return rows.map((row) => ({
    version: row.version,
    grund: row.grund,
    erstelltAm: row.erstellt_at,
    erstelltVon: row.erstellt_von_user_id
      ? profilNamen.get(row.erstellt_von_user_id) ?? null
      : null,
  }));
}

export async function getTagesberichtAudit(
  id: string,
): Promise<TagesberichtAuditEintrag[]> {
  const supabase = await createClient();
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped
    .from("tagesbericht_audit_log")
    .select("id, aktion, details, created_at, user_id")
    .eq("tagesbericht_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Tagesbericht-Audit konnte nicht geladen werden:", error);
    return [];
  }

  const rows = (data ?? []) as unknown as AuditRow[];
  const profilNamen = await ladeProfilNamen(
    supabase,
    rows.map((row) => row.user_id),
  );

  return rows.map((row) => ({
    id: row.id,
    aktion: row.aktion,
    details:
      row.details && typeof row.details === "object"
        ? (row.details as Record<string, unknown>)
        : {},
    createdAt: row.created_at,
    userName: row.user_id ? profilNamen.get(row.user_id) ?? null : null,
  }));
}

async function snapshotZuTagesbericht(
  supabase: Awaited<ReturnType<typeof createClient>>,
  snapshot: TagesberichtSnapshot,
): Promise<TagesberichtVollstaendig> {
  const fotos = await ladeFotoUrls(supabase, snapshot.bericht.fotos);

  return {
    id: snapshot.bericht.id,
    datum: snapshot.bericht.datum,
    wetter: snapshot.bericht.wetter,
    stichpunkte: snapshot.bericht.stichpunkte,
    bericht_text: snapshot.bericht.bericht_text,
    status: "final",
    created_by: snapshot.bericht.created_by,
    created_at: snapshot.bericht.created_at,
    updated_at: snapshot.bericht.updated_at,
    finalisiert_am: snapshot.finalisierung.am,
    finalisiert_von: snapshot.finalisierung.von_name,
    aktuelle_version: snapshot.version,
    offener_korrekturgrund: null,
    angezeigte_version: snapshot.version,
    versionsgrund: snapshot.finalisierung.grund,
    firmaWordmark: snapshot.bericht.firma.wordmark,
    baustelle: snapshot.bericht.baustelle,
    personal: snapshot.bericht.personal,
    material: snapshot.bericht.material,
    fotos,
  };
}

export async function getTagesberichtVersionVollstaendig(
  id: string,
  version: number,
): Promise<TagesberichtVollstaendig | null> {
  if (!Number.isInteger(version) || version < 1) return null;

  const supabase = await createClient();
  const untyped = supabase as unknown as SupabaseClient;
  const { data, error } = await untyped
    .from("tagesbericht_versionen")
    .select("snapshot")
    .eq("tagesbericht_id", id)
    .eq("version", version)
    .maybeSingle();

  if (error || !data) return null;
  const snapshot = (data as unknown as { snapshot: unknown }).snapshot;
  if (!istTagesberichtSnapshot(snapshot)) return null;

  return snapshotZuTagesbericht(supabase, snapshot);
}
