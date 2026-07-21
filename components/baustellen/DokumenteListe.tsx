"use client";

import { useState, useTransition } from "react";
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
  const [feedback, setFeedback] = useState<string | null>(null);

  if (dokumente.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Noch keine Dokumente hochgeladen.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {feedback && (
        <p className="text-brick text-sm" role="alert">
          {feedback}
        </p>
      )}
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
                  onChange={(e) => {
                    const kiKontext = e.target.checked;
                    setFeedback(null);
                    startTransition(async () => {
                      const result = await setKiKontext(baustelleId, dokument.id, kiKontext);
                      if (!result.ok) {
                        setFeedback(result.error ?? "KI-Kontext konnte nicht gespeichert werden.");
                        return;
                      }
                      router.refresh();
                    });
                  }}
                />
                Für KI-Kontext verwenden
              </label>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setFeedback(null);
                  startTransition(async () => {
                    const result = await deleteDokument(baustelleId, dokument.id);
                    if (!result.ok) {
                      setFeedback(result.error ?? "Dokument konnte nicht gelöscht werden.");
                      return;
                    }
                    if (result.warning) setFeedback(result.warning);
                    router.refresh();
                  });
                }}
                className="text-brick focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber inline-flex min-h-11 items-center px-2 text-xs underline underline-offset-2"
              >
                Löschen
              </button>
            </div>
          </li>
        );
        })}
      </ul>
    </div>
  );
}
