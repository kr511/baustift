"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createDokument } from "@/lib/actions/dokumente";
import { sanitizeDateiname } from "@/lib/format";

const MAX_DATEIGROESSE = 20 * 1024 * 1024;
const ERLAUBTE_TYPEN = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

function istErlaubterTyp(typ: string): typ is (typeof ERLAUBTE_TYPEN)[number] {
  return (ERLAUBTE_TYPEN as readonly string[]).includes(typ);
}

export function DokumentUpload({
  baustelleId,
  firmaId,
}: {
  baustelleId: string;
  firmaId: string;
}) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setError(null);

    const supabase = createClient();

    for (const file of Array.from(fileList)) {
      const mimeType = file.type;
      if (!istErlaubterTyp(mimeType)) {
        setError(`"${file.name}" ist kein unterstütztes Format (PDF, JPG, PNG, DOCX).`);
        continue;
      }
      if (file.size > MAX_DATEIGROESSE) {
        setError(`"${file.name}" ist zu groß (max. 20 MB).`);
        continue;
      }

      const sichererName = sanitizeDateiname(file.name);
      const path = `${firmaId}/${baustelleId}/${crypto.randomUUID()}-${sichererName}`;

      const { error: uploadError } = await supabase.storage
        .from("baustellen-dokumente")
        .upload(path, file);

      if (uploadError) {
        setError(`"${file.name}" konnte nicht hochgeladen werden: ${uploadError.message}`);
        continue;
      }

      const result = await createDokument({
        baustelle_id: baustelleId,
        storage_path: path,
        dateiname: file.name,
        mime_type: mimeType,
        groesse_bytes: file.size,
      });
      if (!result.ok) {
        setError(`"${file.name}" konnte nicht gespeichert werden: ${result.error ?? "Unbekannter Fehler"}`);
        await supabase.storage.from("baustellen-dokumente").remove([path]);
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.docx"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        disabled={uploading}
        className="block w-full text-sm text-ink-soft file:mr-3 file:cursor-pointer file:border-[1.5px] file:border-ink file:bg-paper-raised file:px-3 file:py-2 file:font-mono file:text-xs file:font-semibold file:tracking-wide file:text-ink file:uppercase hover:file:bg-paper"
      />
      {uploading && <p className="label-tag mt-2">Dokument wird hochgeladen…</p>}
      {error && (
        <p className="border-brick bg-brick-bg text-brick mt-2 border-[1.5px] p-2 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
