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
  const [ausgewaehlterStatus, setAusgewaehlterStatus] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const statusId = `baustelle-status-speichern-${baustelleId}`;
  const fehlerId = `baustelle-status-fehler-${baustelleId}`;
  const beschreibungIds = [isPending ? statusId : null, error ? fehlerId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <label htmlFor={`baustelle-status-${baustelleId}`} className="sr-only">
        Baustellenstatus
      </label>
      <select
        id={`baustelle-status-${baustelleId}`}
        value={ausgewaehlterStatus}
        disabled={isPending}
        aria-invalid={Boolean(error)}
        aria-describedby={beschreibungIds || undefined}
        onChange={(event) => {
          const vorherigerStatus = ausgewaehlterStatus;
          const next = event.target.value as BaustelleStatus;
          setAusgewaehlterStatus(next);
          setError(null);
          startTransition(async () => {
            try {
              const result = await setBaustelleStatus(baustelleId, next);
              if (!result.ok) {
                setAusgewaehlterStatus(vorherigerStatus);
                setError(result.error ?? "Status konnte nicht gespeichert werden.");
              }
            } catch {
              setAusgewaehlterStatus(vorherigerStatus);
              setError("Status konnte nicht gespeichert werden.");
            }
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
      {isPending && (
        <p id={statusId} role="status" className="sr-only">
          Baustellenstatus wird gespeichert.
        </p>
      )}
      {error && (
        <p
          id={fehlerId}
          role="alert"
          className="text-brick mt-1 max-w-56 text-xs"
        >
          {error}
        </p>
      )}
    </div>
  );
}
