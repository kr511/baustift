"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_DATEIGROESSE = 10 * 1024 * 1024;
const MAX_FOTOS = 30;
const ERLAUBTE_TYPEN = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

interface HochgeladenesFoto {
  storage_path: string;
  dateiname: string;
  previewUrl: string;
  istNeu: boolean;
}

export function FotoUpload({
  initialFotos,
  disabled = false,
  onBusyChange,
  onChanged,
}: {
  initialFotos?: { storage_path: string; dateiname: string; url: string }[];
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  onChanged?: () => void;
}) {
  const [fotos, setFotos] = useState<HochgeladenesFoto[]>(
    (initialFotos ?? []).map((foto) => ({
      storage_path: foto.storage_path,
      dateiname: foto.dateiname,
      previewUrl: foto.url,
      istNeu: false,
    })),
  );
  const [operation, setOperation] = useState<"upload" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = disabled || operation !== null;

  function beginneOperation(naechsteOperation: "upload" | "delete") {
    setOperation(naechsteOperation);
    onBusyChange?.(true);
  }

  function beendeOperation() {
    setOperation(null);
    onBusyChange?.(false);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || busy) return;
    const freiePlaetze = MAX_FOTOS - fotos.length;
    if (freiePlaetze <= 0) {
      setError(`Pro Tagesbericht sind maximal ${MAX_FOTOS} Fotos möglich.`);
      return;
    }

    beginneOperation("upload");
    setError(null);
    setStatus("");
    const neueFotos: HochgeladenesFoto[] = [];

    try {
      const supabase = createClient();
      const ausgewaehlteDateien = Array.from(fileList).slice(0, freiePlaetze);
      if (fileList.length > freiePlaetze) {
        setError(
          `Es werden nur die ersten ${freiePlaetze} ausgewählten Fotos hochgeladen.`,
        );
      }

      for (const file of ausgewaehlteDateien) {
        if (!ERLAUBTE_TYPEN.includes(file.type)) {
          setError(
            `"${file.name}" ist kein unterstütztes Bildformat (JPG, PNG, WebP, HEIC).`,
          );
          continue;
        }
        if (file.size <= 0 || file.size > MAX_DATEIGROESSE) {
          setError(`"${file.name}" ist leer oder zu groß (max. 10 MB).`);
          continue;
        }

        const sichererName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `entwuerfe/${crypto.randomUUID()}-${sichererName}`;
        const { error: uploadError } = await supabase.storage
          .from("tagesbericht-fotos")
          .upload(path, file, { contentType: file.type, upsert: false });

        if (uploadError) {
          setError(`Foto "${file.name}" konnte nicht hochgeladen werden.`);
          continue;
        }

        neueFotos.push({
          storage_path: path,
          dateiname: file.name,
          previewUrl: URL.createObjectURL(file),
          istNeu: true,
        });
      }
    } catch (uploadFehler) {
      console.error("Foto-Upload fehlgeschlagen:", uploadFehler);
      setError("Foto-Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      if (neueFotos.length > 0) {
        setFotos((vorhandeneFotos) => [...vorhandeneFotos, ...neueFotos]);
        setStatus(
          neueFotos.length === 1
            ? `Foto ${neueFotos[0].dateiname} wurde hochgeladen.`
            : `${neueFotos.length} Fotos wurden hochgeladen.`,
        );
        onChanged?.();
      }
      beendeOperation();
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeFoto(path: string) {
    if (busy) return;
    const foto = fotos.find((eintrag) => eintrag.storage_path === path);
    if (!foto) return;

    beginneOperation("delete");
    setError(null);
    try {
      if (foto.istNeu) {
        const supabase = createClient();
        const { error: loeschFehler } = await supabase.storage
          .from("tagesbericht-fotos")
          .remove([foto.storage_path]);
        if (loeschFehler) {
          setError(
            `Foto "${foto.dateiname}" konnte nicht entfernt werden. Bitte erneut versuchen.`,
          );
          return;
        }
        URL.revokeObjectURL(foto.previewUrl);
      }

      setFotos((vorhandeneFotos) =>
        vorhandeneFotos.filter((eintrag) => eintrag.storage_path !== path),
      );
      setStatus(`Foto ${foto.dateiname || "ohne Dateinamen"} wurde entfernt.`);
      onChanged?.();
    } catch (loeschFehler) {
      console.error("Foto konnte nicht entfernt werden:", loeschFehler);
      setError("Foto konnte nicht entfernt werden. Bitte erneut versuchen.");
    } finally {
      beendeOperation();
    }
  }

  const fotoPayload = fotos.map(({ storage_path, dateiname }) => ({
    storage_path,
    dateiname,
  }));

  return (
    <div aria-busy={operation !== null}>
      <input type="hidden" name="foto_json" value={JSON.stringify(fotoPayload)} />
      <label htmlFor="bericht-fotos" className="label-tag mb-1 block">
        Fotos auswählen
      </label>
      <input
        ref={inputRef}
        id="bericht-fotos"
        type="file"
        accept={ERLAUBTE_TYPEN.join(",")}
        multiple
        capture="environment"
        onChange={(event) => void handleFiles(event.target.files)}
        disabled={busy}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error
            ? "bericht-fotos-hinweis bericht-fotos-fehler"
            : "bericht-fotos-hinweis"
        }
        className="block w-full text-sm text-ink-soft file:mr-3 file:cursor-pointer file:border-[1.5px] file:border-ink file:bg-paper-raised file:px-3 file:py-2 file:font-mono file:text-xs file:font-semibold file:tracking-wide file:text-ink file:uppercase hover:file:bg-paper disabled:opacity-60"
      />
      <p id="bericht-fotos-hinweis" className="mt-1.5 text-xs text-ink-soft">
        JPG, PNG, WebP oder HEIC, maximal 10 MB pro Foto und {MAX_FOTOS} Fotos.
      </p>
      {(operation || status) && (
        <p role="status" aria-live="polite" className="label-tag mt-2">
          {operation === "upload"
            ? "Fotos werden hochgeladen…"
            : operation === "delete"
              ? "Foto wird entfernt…"
              : status}
        </p>
      )}
      {error && (
        <p
          id="bericht-fotos-fehler"
          role="alert"
          className="border-brick bg-brick-bg text-brick mt-2 border-[1.5px] p-2 text-sm"
        >
          {error}
        </p>
      )}

      {fotos.length > 0 && (
        <ul
          aria-label="Ausgewählte Fotos"
          className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4"
        >
          {fotos.map((foto) => (
            <li
              key={foto.storage_path}
              className="group border-ink relative border-[1.5px]"
            >
              {foto.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={foto.previewUrl}
                  alt={`Berichtsfoto: ${foto.dateiname}`}
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <div
                  role="img"
                  aria-label={`${foto.dateiname}: Vorschau nicht verfügbar`}
                  className="flex aspect-square items-center justify-center p-2 text-center text-xs text-ink-soft"
                >
                  Vorschau nicht verfügbar
                </div>
              )}
              <button
                type="button"
                onClick={() => void removeFoto(foto.storage_path)}
                disabled={busy}
                className="bg-ink absolute top-1 right-1 inline-flex min-h-11 min-w-11 items-center justify-center border border-white/70 text-sm text-white opacity-90 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber disabled:cursor-wait disabled:opacity-50"
                aria-label={`${foto.dateiname} entfernen`}
              >
                <span aria-hidden="true">✕</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
