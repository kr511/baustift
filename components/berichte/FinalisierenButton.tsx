"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  erstelleKorrekturversion,
  finalisiereTagesbericht,
  pruefeTagesbericht,
} from "@/lib/actions/tagesberichte";
import { useBerichtFinalisierung } from "@/components/berichte/BerichtFinalisierungContext";
import type { TagesberichtWorkflowStatus } from "@/lib/types/tagesbericht-workflow";

export function FinalisierenButton({
  tagesberichtId,
  status,
  aktuelleVersion,
}: {
  tagesberichtId: string;
  status: TagesberichtWorkflowStatus;
  aktuelleVersion: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [korrekturOffen, setKorrekturOffen] = useState(false);
  const [korrekturgrund, setKorrekturgrund] = useState("");
  const { vorFinalisierungVorbereiten } = useBerichtFinalisierung();

  function handlePruefen() {
    setError(null);
    startTransition(async () => {
      const vorbereitet = await vorFinalisierungVorbereiten();
      if (!vorbereitet.ok) {
        setError(vorbereitet.error ?? "Bericht konnte nicht geprüft werden.");
        return;
      }

      const result = await pruefeTagesbericht(tagesberichtId);
      if (!result.ok) {
        setError(result.error ?? "Prüfstatus konnte nicht gespeichert werden.");
        return;
      }
      router.refresh();
    });
  }

  function handleFinalisieren() {
    if (
      !confirm(
        `Version ${aktuelleVersion + 1} finalisieren? Der aktuelle Stand wird unveränderlich gespeichert. Spätere Änderungen benötigen eine Korrekturversion.`,
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
        return;
      }
      router.refresh();
    });
  }

  function handleKorrektur() {
    setError(null);
    startTransition(async () => {
      const result = await erstelleKorrekturversion(tagesberichtId, korrekturgrund);
      if (!result.ok) {
        setError(result.error ?? "Korrekturversion konnte nicht erstellt werden.");
        return;
      }
      router.push(`/berichte/${tagesberichtId}/bearbeiten`);
      router.refresh();
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
      {error && (
        <p className="text-brick max-w-xs text-sm" role="alert">
          {error}
        </p>
      )}
      {status === "entwurf" && (
        <p className="max-w-xs text-xs text-ink-soft">
          Erstelle oder speichere zuerst einen Berichtstext. Danach kann der Inhalt geprüft werden.
        </p>
      )}

      {status === "generiert" && (
        <button
          type="button"
          disabled={isPending}
          onClick={handlePruefen}
          className="btn-primary min-h-11 disabled:opacity-50"
        >
          {isPending ? "Wird geprüft…" : "Inhalt geprüft"}
        </button>
      )}

      {status === "geprueft" && (
        <button
          type="button"
          disabled={isPending}
          onClick={handleFinalisieren}
          className="bg-safety-green inline-flex min-h-11 items-center justify-center gap-2 border-[1.5px] border-ink px-[1.15rem] py-[0.6rem] font-mono text-[0.8125rem] font-semibold tracking-[0.06em] text-white uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Wird finalisiert…" : `Version ${aktuelleVersion + 1} finalisieren`}
        </button>
      )}

      {status === "final" && !korrekturOffen && (
        <button
          type="button"
          onClick={() => setKorrekturOffen(true)}
          className="btn-secondary min-h-11"
        >
          Korrekturversion erstellen
        </button>
      )}

      {status === "final" && korrekturOffen && (
        <div className="border-amber bg-paper-raised max-w-md border-[1.5px] p-3">
          <label htmlFor="korrekturgrund" className="block text-sm font-semibold">
            Grund der Korrektur
          </label>
          <textarea
            id="korrekturgrund"
            rows={3}
            value={korrekturgrund}
            onChange={(event) => setKorrekturgrund(event.target.value)}
            placeholder="z. B. Stundenangabe von Mitarbeiter korrigiert"
            className="field-input mt-1 text-sm"
          />
          <p className="mt-1 text-xs text-ink-soft">
            Version {aktuelleVersion} bleibt unverändert erhalten. Nach erneuter Prüfung entsteht Version {aktuelleVersion + 1}.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending || korrekturgrund.trim().length < 5}
              onClick={handleKorrektur}
              className="btn-primary min-h-10 disabled:opacity-50"
            >
              {isPending ? "Wird geöffnet…" : "Korrektur öffnen"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setKorrekturOffen(false);
                setKorrekturgrund("");
                setError(null);
              }}
              className="btn-secondary min-h-10"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-brick max-w-md text-sm" role="alert">{error}</p>}
    </div>
  );
}
