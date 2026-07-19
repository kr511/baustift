"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_DATEIGROESSE = 10 * 1024 * 1024;
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
}

export function FotoUpload({
  firmaId,
  initialFotos,
}: {
  firmaId: string;
  initialFotos?: { storage_path: string; dateiname: string; url: string }[];
}) {
  const [fotos, setFotos] = useState<HochgeladenesFoto[]>(
    (initialFotos ?? []).map((f) => ({
      storage_path: f.storage_path,
      dateiname: f.dateiname,
      previewUrl: f.url,
    })),
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    if (!firmaId) {
      setError("Ihre Firma konnte nicht geladen werden. Fotos können nicht hochgeladen werden.");
      return;
    }
    setUploading(true);
    setError(null);

    const supabase = createClient();
    const neueFotos: HochgeladenesFoto[] = [];

    for (const file of Array.from(fileList)) {
      if (!ERLAUBTE_TYPEN.includes(file.type)) {
        setError(`"${file.name}" ist kein unterstütztes Bildformat (JPG, PNG, WebP, HEIC).`);
        continue;
      }
      if (file.size > MAX_DATEIGROESSE) {
        setError(`"${file.name}" ist zu groß (max. 10 MB).`);
        continue;
      }

      const sichererName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${firmaId}/entwuerfe/${crypto.randomUUID()}-${sichererName}`;
      const { error: uploadError } = await supabase.storage
        .from("tagesbericht-fotos")
        .upload(path, file);

      if (uploadError) {
        setError(`Foto "${file.name}" konnte nicht hochgeladen werden: ${uploadError.message}`);
        continue;
      }

      neueFotos.push({
        storage_path: path,
        dateiname: file.name,
        previewUrl: URL.createObjectURL(file),
      });
    }

    setFotos((prev) => [...prev, ...neueFotos]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFoto(path: string) {
    setFotos((prev) => prev.filter((f) => f.storage_path !== path));
  }

  const fotoPayload = fotos.map(({ storage_path, dateiname }) => ({
    storage_path,
    dateiname,
  }));

  return (
    <div>
      <input type="hidden" name="foto_json" value={JSON.stringify(fotoPayload)} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={uploading}
        className="block w-full text-sm text-ink-soft file:mr-3 file:cursor-pointer file:border-[1.5px] file:border-ink file:bg-paper-raised file:px-3 file:py-2 file:font-mono file:text-xs file:font-semibold file:tracking-wide file:text-ink file:uppercase hover:file:bg-paper"
      />
      {uploading && <p className="label-tag mt-2">Fotos werden hochgeladen…</p>}
      {error && (
        <p className="border-brick bg-brick-bg text-brick mt-2 border-[1.5px] p-2 text-sm">
          {error}
        </p>
      )}

      {fotos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {fotos.map((foto) => (
            <li key={foto.storage_path} className="group border-ink relative border-[1.5px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={foto.previewUrl}
                alt={foto.dateiname}
                className="aspect-square w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeFoto(foto.storage_path)}
                className="bg-ink absolute top-1 right-1 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={`${foto.dateiname} entfernen`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
