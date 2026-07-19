"use client";

import { useState, useTransition } from "react";
import { finalisiereTagesbericht } from "@/lib/actions/tagesberichte";
import { useBerichtFinalisierung } from "@/components/berichte/BerichtFinalisierungContext";

export function FinalisierenButton({ tagesberichtId }: { tagesberichtId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { vorFinalisierungVorbereiten } = useBerichtFinalisierung();

  function handleFinalisieren() {
    if (
      !confirm(
        "Tagesbericht als final markieren? Er gilt danach als abgeschlossen. Ungespeicherte Textänderungen werden vorher gespeichert.",
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const vorbereitet = await vorFinalisierungVorbereiten();
      if (!vorbereitet.ok) {
        setError(vorbereitet.error ?? "Bericht konnte nicht finalisiert werden.");
        return;
      }

      const result = await finalisiereTagesbericht(tagesberichtId);
      if (!result.ok) {
        setError(result.error ?? "Bericht konnte nicht finalisiert werden.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={isPending}
        onClick={handleFinalisieren}
        className="bg-safety-green inline-flex items-center justify-center gap-2 border-[1.5px] border-ink px-[1.15rem] py-[0.6rem] font-mono text-[0.8125rem] font-semibold tracking-[0.06em] text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Wird finalisiert…" : "Finalisieren"}
      </button>
      {error && <p className="text-brick max-w-xs text-sm">{error}</p>}
    </div>
  );
}
