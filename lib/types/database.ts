// Hand-written to match supabase/migrations/*.sql.
// Regenerate via the Supabase MCP `generate_typescript_types` tool once a
// live project is connected, and keep this file in sync after every
// schema change.

export type BaustelleStatus = "aktiv" | "pausiert" | "abgeschlossen";
export type TagesberichtStatus = "entwurf" | "final";
export type MaterialTyp = "material" | "geraet";
export type ProfilRolle = "admin" | "nutzer";

export interface Database {
  public: {
    Tables: {
      firmen: {
        Row: {
          id: string;
          name: string;
          wordmark: string;
          land: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          wordmark: string;
          land?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["firmen"]["Insert"]>;
        Relationships: [];
      };
      niederlassungen: {
        Row: {
          id: string;
          firma_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          firma_id: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["niederlassungen"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "niederlassungen_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firmen";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          firma_id: string;
          niederlassung_id: string | null;
          display_name: string;
          role: ProfilRolle;
          created_at: string;
        };
        Insert: {
          id: string;
          firma_id: string;
          niederlassung_id?: string | null;
          display_name: string;
          role?: ProfilRolle;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "profiles_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firmen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_niederlassung_id_fkey";
            columns: ["niederlassung_id"];
            isOneToOne: false;
            referencedRelation: "niederlassungen";
            referencedColumns: ["id"];
          },
        ];
      };
      baustellen: {
        Row: {
          id: string;
          name: string;
          adresse: string | null;
          auftraggeber: string | null;
          status: BaustelleStatus;
          notiz: string | null;
          created_by: string | null;
          created_by_user_id: string | null;
          created_at: string;
          firma_id: string;
          niederlassung_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          adresse?: string | null;
          auftraggeber?: string | null;
          status?: BaustelleStatus;
          notiz?: string | null;
          created_by?: string | null;
          created_by_user_id?: string | null;
          created_at?: string;
          // Wird per DB-Trigger aus dem Profil des Einloggten gesetzt.
          firma_id?: string;
          niederlassung_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["baustellen"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "baustellen_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firmen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "baustellen_niederlassung_id_fkey";
            columns: ["niederlassung_id"];
            isOneToOne: false;
            referencedRelation: "niederlassungen";
            referencedColumns: ["id"];
          },
        ];
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
          created_by: string | null;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
          firma_id: string;
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
          created_by?: string | null;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
          // Wird per DB-Trigger aus der Baustelle kopiert.
          firma_id?: string;
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
          {
            foreignKeyName: "tagesberichte_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firmen";
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
          storage_path: string;
          dateiname: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tagesbericht_id: string;
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
      baustelle_dokumente: {
        Row: {
          id: string;
          baustelle_id: string;
          firma_id: string;
          storage_path: string;
          dateiname: string;
          mime_type: string;
          groesse_bytes: number | null;
          ki_kontext: boolean;
          created_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          baustelle_id: string;
          firma_id?: string;
          storage_path: string;
          dateiname: string;
          mime_type: string;
          groesse_bytes?: number | null;
          ki_kontext?: boolean;
          created_by_user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["baustelle_dokumente"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "baustelle_dokumente_baustelle_id_fkey";
            columns: ["baustelle_id"];
            isOneToOne: false;
            referencedRelation: "baustellen";
            referencedColumns: ["id"];
          },
        ];
      };
      stil_vorlagen: {
        Row: {
          id: string;
          firma_id: string;
          titel: string;
          beispiel_text: string;
          aktiv: boolean;
          created_by_user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          firma_id: string;
          titel: string;
          beispiel_text: string;
          aktiv?: boolean;
          created_by_user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["stil_vorlagen"]["Insert"]
        >;
        Relationships: [
          {
            foreignKeyName: "stil_vorlagen_firma_id_fkey";
            columns: ["firma_id"];
            isOneToOne: false;
            referencedRelation: "firmen";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
