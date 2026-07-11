"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteDokument, setKiKontext } from "@/lib/actions/dokumente";
import type { BaustelleDokument } from "@/lib/data/dokumente";

function formatGroesse(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DokumenteListe({
  baustelleId,
  dokumente,
}: {
  baustelleId: string;
  dokumente: BaustelleDokument[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (dokumente.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Noch keine Dokumente hochgeladen.
      </p>
    );
  }

  return (
    <ul className="divide-line divide-y-[1.5px]">
      {dokumente.map((dokument) => {
        const istPdf = dokument.mime_type === "application/pdf";
        return (
          <li
            key={dokument.id}
            className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
          >
            <div>
              <a
                href={dokument.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-ink decoration-line underline-offset-2 hover:underline"
              >
                {dokument.dateiname}
              </a>
              <p className="font-mono text-xs text-ink-soft">
                {formatGroesse(dokument.groesse_bytes)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label
                className={`label-tag flex items-center gap-1.5 ${istPdf ? "" : "opacity-40"}`}
                title={
                  istPdf
                    ? undefined
                    : "Nur PDFs können als KI-Kontext verwendet werden."
                }
              >
                <input
                  type="checkbox"
                  disabled={!istPdf || isPending}
                  defaultChecked={dokument.ki_kontext}
                  onChange={(e) =>
                    startTransition(async () => {
                      await setKiKontext(baustelleId, dokument.id, e.target.checked);
                      router.refresh();
                    })
                  }
                />
                Für KI-Kontext verwenden
              </label>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await deleteDokument(baustelleId, dokument.id);
                    router.refresh();
                  })
                }
                className="text-brick text-xs underline underline-offset-2"
              >
                Löschen
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
