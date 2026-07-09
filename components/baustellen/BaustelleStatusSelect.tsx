"use client";

import { useTransition } from "react";
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

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(event) => {
        const next = event.target.value as BaustelleStatus;
        startTransition(() => {
          setBaustelleStatus(baustelleId, next);
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
  );
}
