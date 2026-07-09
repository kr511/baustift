"use client";

import { useTransition } from "react";
import { finalisiereTagesbericht } from "@/lib/actions/tagesberichte";

export function FinalisierenButton({ tagesberichtId }: { tagesberichtId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (!confirm("Tagesbericht als final markieren? Er gilt danach als abgeschlossen.")) {
          return;
        }
        startTransition(() => {
          finalisiereTagesbericht(tagesberichtId);
        });
      }}
      className="bg-safety-green inline-flex items-center justify-center gap-2 border-[1.5px] border-ink px-[1.15rem] py-[0.6rem] font-mono text-[0.8125rem] font-semibold tracking-[0.06em] text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
    >
      {isPending ? "Wird finalisiert…" : "Finalisieren"}
    </button>
  );
}
