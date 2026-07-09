"use client";

import { useState, useTransition } from "react";
import { updateBerichtText } from "@/lib/actions/tagesberichte";

export function KiGenerateButton({
  tagesberichtId,
  initialBerichtText,
}: {
  tagesberichtId: string;
  initialBerichtText: string | null;
}) {
  const [berichtText, setBerichtText] = useState(initialBerichtText ?? "");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHinweis, setSavedHinweis] = useState(false);
  const [isSaving, startSaving] = useTransition();

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/tagesberichte/${tagesberichtId}/generate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "KI-Generierung fehlgeschlagen.");
        return;
      }
      setBerichtText(data.berichtText);
    } catch {
      setError("Verbindung zur KI fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setGenerating(false);
    }
  }

  function handleSave() {
    setSavedHinweis(false);
    startSaving(async () => {
      await updateBerichtText(tagesberichtId, berichtText);
      setSavedHinweis(true);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="btn-primary"
        >
          {generating
            ? "KI formuliert Bericht…"
            : berichtText
              ? "Bericht neu erstellen (KI)"
              : "Bericht erstellen (KI)"}
        </button>
        {berichtText && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-secondary"
          >
            {isSaving ? "Speichert…" : "Änderungen speichern"}
          </button>
        )}
        {savedHinweis && (
          <span className="tag-badge text-safety-green bg-safety-green-bg border-safety-green">
            Gespeichert
          </span>
        )}
      </div>

      {error && (
        <p className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm">
          {error}
        </p>
      )}

      {berichtText ? (
        <textarea
          value={berichtText}
          onChange={(e) => {
            setBerichtText(e.target.value);
            setSavedHinweis(false);
          }}
          rows={16}
          className="field-input font-mono text-sm leading-relaxed"
        />
      ) : (
        <p className="card border-dashed p-6 text-sm text-ink-soft">
          Noch kein Bericht generiert. Der Text bleibt jederzeit manuell
          editierbar, auch nach der KI-Generierung.
        </p>
      )}
    </div>
  );
}
