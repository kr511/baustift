"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { finalisiereTagesbericht } from "@/lib/actions/tagesberichte";
import { useBerichtBearbeitungsStatus } from "@/components/berichte/BerichtBearbeitungsStatus";

export function FinalisierenButton({
  tagesberichtId,
  kannFinalisieren,
}: {
  tagesberichtId: string;
  kannFinalisieren: boolean;
}) {
  const router = useRouter();
  const {
    dirty,
    operation,
    beginneOperation,
    beendeOperation,
    version,
    setVersion,
  } = useBerichtBearbeitungsStatus();
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const isPending = operation === "finalisieren";
  const blockiert = !kannFinalisieren || dirty || operation !== null;
  const hinweisId = `finalisieren-hinweis-${tagesberichtId}`;

  function handleFinalisieren() {
    if (
      !confirm(
        "Tagesbericht als final markieren? Er kann danach nicht mehr bearbeitet werden.",
      )
    ) {
      return;
    }

    if (!beginneOperation("finalisieren")) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await finalisiereTagesbericht(tagesberichtId, version);
        if (!result.ok) {
          setError(result.error ?? "Tagesbericht konnte nicht finalisiert werden.");
          return;
        }
        if (result.updatedAt) setVersion(result.updatedAt);
        router.refresh();
      } catch {
        setError("Tagesbericht konnte nicht finalisiert werden. Bitte erneut versuchen.");
      } finally {
        beendeOperation("finalisieren");
      }
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={blockiert}
        aria-busy={isPending}
        aria-describedby={blockiert ? hinweisId : undefined}
        title={
          kannFinalisieren
            ? undefined
            : "Vor dem Finalisieren muss ein Berichtstext gespeichert sein."
        }
        onClick={handleFinalisieren}
        className="bg-safety-green inline-flex items-center justify-center gap-2 border-[1.5px] border-ink px-[1.15rem] py-[0.6rem] font-mono text-[0.8125rem] font-semibold tracking-[0.06em] text-white uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Wird finalisiert…" : "Finalisieren"}
      </button>
      {blockiert && (
        <p id={hinweisId} className="mt-1 max-w-52 text-xs text-ink-soft">
          {!kannFinalisieren
            ? "Zuerst einen Berichtstext speichern."
            : dirty
              ? "Zuerst die Textänderungen speichern."
              : "Bitte den laufenden Vorgang abwarten."}
        </p>
      )}
      {error && (
        <p role="alert" className="text-brick mt-2 max-w-xs text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
