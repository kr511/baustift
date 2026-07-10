"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-blueprint flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="border-b-2 border-ink pb-4">
          <span className="label-tag">Fehler</span>
          <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            Etwas ist schiefgelaufen
          </h1>
        </div>
        <div className="card ticked mt-8 p-5 text-sm leading-relaxed">
          <p>
            Ein unerwarteter Fehler ist aufgetreten. Bitte erneut versuchen –
            falls das Problem bestehen bleibt, kurz warten und die Seite neu
            laden.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 inline-block cursor-pointer border-[1.5px] border-ink bg-paper-raised px-3 py-2 font-mono text-xs font-semibold tracking-wide uppercase hover:bg-paper"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    </div>
  );
}
