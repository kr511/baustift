"use client";

import { useState, useTransition } from "react";
import { setBaustelleStatus } from "@/lib/actions/baustellen";
import type { BaustelleStatus } from "@/lib/types/database";

const statusLabels: Record<BaustelleStatus, string> = {
  aktiv: "Aktiv",
  pausiert: "Pausiert",
  abgeschlossen: "Abgeschlossen",
};

export function BaustelleStatusSelect({
  baustelleId,
  status,
}: {
  baustelleId: string;
  status: BaustelleStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <select
        value={status}
        disabled={isPending}
        onChange={(event) => {
          const next = event.target.value as BaustelleStatus;
          setError(null);
          startTransition(async () => {
            const result = await setBaustelleStatus(baustelleId, next);
            if (!result.ok) setError(result.error ?? "Status konnte nicht gespeichert werden.");
          });
        }}
        className="field-input font-mono w-auto py-1.5 text-xs disabled:opacity-50"
      >
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {error && <p className="text-brick mt-1 text-xs">{error}</p>}
    </div>
  );
}
