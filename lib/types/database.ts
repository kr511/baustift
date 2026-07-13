// Hand-written to match supabase/migrations/0001_init.sql.
// Regenerate via the Supabase MCP `generate_typescript_types` tool once a
// live project is connected, and keep this file in sync after every
// schema change.

export type BaustelleStatus = "aktiv" | "pausiert" | "abgeschlossen";
export type TagesberichtStatus = "entwurf" | "final";
export type MaterialTyp = "material" | "geraet";
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      baustellen: {
        Row: {
          id: string;
          name: string;
          adresse: string | null;
          auftraggeber: string | null;
          status: BaustelleStatus;
          notiz: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          adresse?: string | null;
          auftraggeber?: string | null;
          status?: BaustelleStatus;
          notiz?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["baustellen"]["Insert"]>;
        Relationships: [];
      };
      tagesberichte: {
        Row: {
          id: string;
          baustelle_id: string;
          datum: string;
          wetter: string;
          stichpunkte: string;
          bericht_text: string | null;
          ki_generiert_am: string | null;
          status: TagesberichtStatus;
          finalized_at: string | null;
          finalized_by: string | null;
          baustelle_name_snapshot: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          baustelle_id: string;
          datum: string;
          wetter: string;
          stichpunkte: string;
          bericht_text?: string | null;
          ki_generiert_am?: string | null;
          status?: TagesberichtStatus;
          finalized_at?: string | null;
          finalized_by?: string | null;
          baustelle_name_snapshot?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["tagesberichte"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "tagesberichte_baustelle_id_fkey";
            columns: ["baustelle_id"];
            isOneToOne: false;
            referencedRelation: "baustellen";
            referencedColumns: ["id"];
          },
        ];
      };
      tagesbericht_personal: {
        Row: {
          id: string;
          tagesbericht_id: string;
          name: string;
          stunden: number;
          taetigkeit: string | null;
        };
        Insert: {
          id?: string;
          tagesbericht_id: string;
          name: string;
          stunden: number;
          taetigkeit?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["tagesbericht_personal"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "tagesbericht_personal_tagesbericht_id_fkey";
            columns: ["tagesbericht_id"];
            isOneToOne: false;
            referencedRelation: "tagesberichte";
            referencedColumns: ["id"];
          },
        ];
      };
      tagesbericht_material: {
        Row: {
          id: string;
          tagesbericht_id: string;
          bezeichnung: string;
          menge: string | null;
          typ: MaterialTyp;
        };
        Insert: {
          id?: string;
          tagesbericht_id: string;
          bezeichnung: string;
          menge?: string | null;
          typ?: MaterialTyp;
        };
        Update: Partial<
          Database["public"]["Tables"]["tagesbericht_material"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "tagesbericht_material_tagesbericht_id_fkey";
            columns: ["tagesbericht_id"];
            isOneToOne: false;
            referencedRelation: "tagesberichte";
            referencedColumns: ["id"];
          },
        ];
      };
      tagesbericht_fotos: {
        Row: {
          id: string;
          tagesbericht_id: string;
          storage_bucket: string;
          storage_path: string;
          dateiname: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tagesbericht_id: string;
          storage_bucket?: string;
          storage_path: string;
          dateiname?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["tagesbericht_fotos"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "tagesbericht_fotos_tagesbericht_id_fkey";
            columns: ["tagesbericht_id"];
            isOneToOne: false;
            referencedRelation: "tagesberichte";
            referencedColumns: ["id"];
          },
        ];
      };
      ki_importe: {
        Row: {
          id: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ki_importe"]["Insert"]>;
        Relationships: [];
      };
      ki_aufrufe: {
        Row: {
          id: string;
          typ: "bericht" | "import";
          tagesbericht_id: string | null;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          typ: "bericht" | "import";
          tagesbericht_id?: string | null;
          created_by: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ki_aufrufe"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "ki_aufrufe_tagesbericht_id_fkey";
            columns: ["tagesbericht_id"];
            isOneToOne: false;
            referencedRelation: "tagesberichte";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      speichere_tagesbericht: {
        Args: {
          p_id: string | null;
          p_erwartete_updated_at: string | null;
          p_baustelle_id: string;
          p_datum: string;
          p_wetter: string;
          p_stichpunkte: string;
          p_created_by: string | null;
          p_personal: Json;
          p_material: Json;
          p_fotos: Json;
        };
        Returns: string;
      };
      speichere_bericht_text: {
        Args: {
          p_id: string;
          p_bericht_text: string;
          p_erwartete_updated_at: string;
        };
        Returns: string;
      };
      finalisiere_tagesbericht: {
        Args: { p_id: string; p_erwartete_updated_at: string };
        Returns: string;
      };
      reserviere_ki_aufruf: {
        Args: { p_typ: "bericht" | "import"; p_tagesbericht_id: string | null };
        Returns: Json;
      };
    };
  };
}
