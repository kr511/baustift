"use client";

import { useRef, useState } from "react";
import type { BerichtAusDokument } from "@/lib/anthropic/extractBerichtAusDokument";

const MAX_DATEIGROESSE = 4 * 1024 * 1024;

function leseApiFehler(data: unknown): string | null {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }
  return null;
}

function istImportAntwort(
  data: unknown,
): data is BerichtAusDokument & { wurdeGekuerzt?: boolean } {
  return Boolean(
    data &&
      typeof data === "object" &&
      "baustelleName" in data &&
      typeof data.baustelleName === "string" &&
      "datum" in data &&
      typeof data.datum === "string" &&
      "wetter" in data &&
      typeof data.wetter === "string" &&
      "stichpunkte" in data &&
      typeof data.stichpunkte === "string" &&
      "personal" in data &&
      Array.isArray(data.personal) &&
      "material" in data &&
      Array.isArray(data.material),
  );
}

export function DokumentImport({
  onImportiert,
  disabled = false,
  disabledReason,
  onBusyChange,
}: {
  onImportiert: (daten: BerichtAusDokument) => void;
  disabled?: boolean;
  disabledReason?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file || disabled || uploading) return;
    setError(null);
    setHinweis(null);

    if (file.size > MAX_DATEIGROESSE) {
      setError("Datei ist zu groß (max. 4 MB).");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    onBusyChange?.(true);
    try {
      const formData = new FormData();
      formData.append("datei", file);
      const res = await fetch("/api/tagesberichte/importieren", {
        method: "POST",
        body: formData,
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setError(leseApiFehler(data) ?? "Import fehlgeschlagen.");
        return;
      }
      if (!istImportAntwort(data)) {
        setError("Der Server hat keine gültigen Importdaten geliefert.");
        return;
      }
      onImportiert(data);
      setHinweis(
        data.wurdeGekuerzt
          ? "Daten wurden übernommen. Ein sehr langes Dokument wurde für die KI-Analyse gekürzt – bitte das Formular besonders sorgfältig prüfen."
          : "Daten wurden übernommen. Bitte das ausgefüllte Formular prüfen.",
      );
    } catch {
      setError("Verbindung zum Server fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setUploading(false);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div aria-busy={uploading} className="card border-dashed p-4">
      <label htmlFor="dokument-import" className="label-tag">
        Aus bestehendem Dokument importieren
      </label>
      <p id="dokument-import-hinweis" className="mt-1 text-xs text-ink-soft">
        Word (.docx) oder PDF eines vorhandenen Tagesberichts hochladen — die
        KI befüllt das Formular unten damit vor. Bitte danach prüfen und
        ergänzen.
      </p>
      <input
        ref={inputRef}
        id="dokument-import"
        type="file"
        accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={uploading || disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error
            ? `dokument-import-hinweis${disabledReason ? " dokument-import-deaktiviert" : ""} dokument-import-fehler`
            : `dokument-import-hinweis${disabledReason ? " dokument-import-deaktiviert" : ""}`
        }
        className="mt-3 block w-full text-sm text-ink-soft file:mr-3 file:cursor-pointer file:border-[1.5px] file:border-ink file:bg-paper-raised file:px-3 file:py-2 file:font-mono file:text-xs file:font-semibold file:tracking-wide file:text-ink file:uppercase hover:file:bg-paper"
      />
      {disabledReason && (
        <p id="dokument-import-deaktiviert" className="mt-2 text-xs text-ink-soft">
          {disabledReason}
        </p>
      )}
      {uploading && (
        <p role="status" aria-live="polite" className="label-tag mt-2">
          Dokument wird analysiert…
        </p>
      )}
      {error && (
        <p
          id="dokument-import-fehler"
          role="alert"
          className="border-brick bg-brick-bg text-brick mt-2 border-[1.5px] p-2 text-sm"
        >
          {error}
        </p>
      )}
      {hinweis && (
        <p
          role="status"
          aria-live="polite"
          className="border-safety-green bg-safety-green-bg text-safety-green mt-2 border-[1.5px] p-2 text-sm"
        >
          {hinweis}
        </p>
      )}
    </div>
  );
}
