"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateBerichtText } from "@/lib/actions/tagesberichte";
import { useBerichtBearbeitungsStatus } from "@/components/berichte/BerichtBearbeitungsStatus";

function leseApiFehler(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }
  return fallback;
}

export function KiGenerateButton({
  tagesberichtId,
  initialBerichtText,
}: {
  tagesberichtId: string;
  initialBerichtText: string | null;
}) {
  const router = useRouter();
  const {
    dirty,
    setDirty,
    operation,
    beginneOperation,
    beendeOperation,
    version,
    setVersion,
  } = useBerichtBearbeitungsStatus();
  const [berichtText, setBerichtText] = useState(initialBerichtText ?? "");
  const [gespeicherterText, setGespeicherterText] = useState(
    initialBerichtText ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [savedHinweis, setSavedHinweis] = useState(false);
  const [, startSaving] = useTransition();
  const hatText = berichtText.trim().length > 0;
  const istGeaendert = berichtText !== gespeicherterText;
  const generating = operation === "generieren";
  const isSaving = operation === "speichern";
  const busy = operation !== null;

  async function handleGenerate() {
    if (
      dirty &&
      !confirm(
        "Ungespeicherte Textänderungen werden durch den neuen KI-Bericht ersetzt. Fortfahren?",
      )
    ) {
      return;
    }
    if (!beginneOperation("generieren")) return;
    setError(null);
    setSavedHinweis(false);
    try {
      const response = await fetch(`/api/tagesberichte/${tagesberichtId}/generate`, {
        method: "POST",
      });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        setError(leseApiFehler(data, "KI-Generierung fehlgeschlagen."));
        return;
      }
      if (
        !data ||
        typeof data !== "object" ||
        !("berichtText" in data) ||
        typeof data.berichtText !== "string" ||
        !data.berichtText.trim() ||
        !("updatedAt" in data) ||
        typeof data.updatedAt !== "string"
      ) {
        setError("Die KI hat keinen gültigen Berichtstext geliefert.");
        return;
      }

      setBerichtText(data.berichtText);
      setGespeicherterText(data.berichtText);
      setDirty(false);
      setVersion(data.updatedAt);
      setSavedHinweis(true);
      router.refresh();
    } catch {
      setError("Verbindung zur KI fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      beendeOperation("generieren");
    }
  }

  function handleSave() {
    if (!beginneOperation("speichern")) return;
    setSavedHinweis(false);
    setError(null);
    startSaving(async () => {
      try {
        const result = await updateBerichtText(tagesberichtId, berichtText, version);
        if (!result.ok) {
          setError(result.error ?? "Bericht konnte nicht gespeichert werden.");
          return;
        }
        if (!result.updatedAt) {
          setError("Bericht konnte nicht gespeichert werden.");
          return;
        }
        const normalisierterText = berichtText.trim();
        setBerichtText(normalisierterText);
        setGespeicherterText(normalisierterText);
        setDirty(false);
        setVersion(result.updatedAt);
        setSavedHinweis(true);
        router.refresh();
      } catch {
        setError("Bericht konnte nicht gespeichert werden. Bitte erneut versuchen.");
      } finally {
        beendeOperation("speichern");
      }
    });
  }

  return (
    <div aria-busy={busy} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="btn-primary"
        >
          {generating
            ? "KI formuliert Bericht…"
            : hatText
              ? "Bericht neu erstellen (KI)"
              : "Bericht erstellen (KI)"}
        </button>
        {hatText && (
          <button
            type="button"
            onClick={handleSave}
          disabled={busy || !istGeaendert}
            className="btn-secondary"
          >
            {isSaving ? "Speichert…" : "Änderungen speichern"}
          </button>
        )}
        {savedHinweis && (
          <span
            role="status"
            aria-live="polite"
            className="tag-badge text-safety-green bg-safety-green-bg border-safety-green"
          >
            Gespeichert
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm"
        >
          {error}
        </p>
      )}

      <div>
        <label htmlFor="bericht-text" className="sr-only">
          Berichtstext
        </label>
        <textarea
          id="bericht-text"
          value={berichtText}
          onChange={(event) => {
            const naechsterText = event.target.value;
            setBerichtText(naechsterText);
            setDirty(naechsterText !== gespeicherterText);
            setSavedHinweis(false);
          }}
          disabled={busy}
          rows={16}
          maxLength={50_000}
          placeholder="Bericht hier manuell eingeben oder mit der KI erstellen lassen.…"
          className="field-input font-mono text-sm leading-relaxed"
        />
      </div>
      <p className="text-xs text-ink-soft">
        KI-Texte bitte vor dem Finalisieren fachlich prüfen. Eigene Änderungen
        werden erst mit „Änderungen speichern“ übernommen.
      </p>
    </div>
  );
}
