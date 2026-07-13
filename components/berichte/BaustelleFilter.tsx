"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function BaustelleFilter({
  baustellen,
}: {
  baustellen: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const aktuelleBaustelle = searchParams.get("baustelle") ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("baustelle", value);
    } else {
      params.delete("baustelle");
    }
    startTransition(() => {
      router.push(`/berichte${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <label htmlFor="baustelle-filter" className="sr-only">
        Tagesberichte nach Baustelle filtern
      </label>
      <select
        id="baustelle-filter"
        value={aktuelleBaustelle}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        aria-busy={isPending}
        aria-describedby={isPending ? "baustelle-filter-status" : undefined}
        className="field-input font-mono w-auto min-w-0 max-w-full text-sm disabled:opacity-60"
      >
        <option value="">Alle Baustellen</option>
        {baustellen.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      {isPending && (
        <span
          id="baustelle-filter-status"
          role="status"
          aria-live="polite"
          className="label-tag"
        >
          Wird gefiltert…
        </span>
      )}
    </div>
  );
}
