"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateBerichtText } from "@/lib/actions/tagesberichte";
import { useBerichtFinalisierung } from "@/components/berichte/BerichtFinalisierungContext";

export function KiGenerateButton({
  tagesberichtId,
  initialBerichtText,
}: {
  tagesberichtId: string;
  initialBerichtText: string | null;
}) {
  const router = useRouter();
  const [berichtText, setBerichtText] = useState(initialBerichtText ?? "");
  const [generating, setGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedHinweis, setSavedHinweis] = useState(false);
  const textRef = useRef(initialBerichtText ?? "");
  const dirtyRef = useRef(false);
  const generatingRef = useRef(false);
  const savingRef = useRef(false);
  const [dirty, setDirty] = useState(false);
  const { registriereVorbereitung } = useBerichtFinalisierung();

  useEffect(() => {
    if (!dirty) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    if (!savedHinweis) return;
    const t = setTimeout(() => setSavedHinweis(false), 3000);
    return () => clearTimeout(t);
  }, [savedHinweis]);

  const saveText = useCallback(async () => {
    if (!dirtyRef.current) return { ok: true };
    if (savingRef.current) {
      return {
        ok: false,
        error: "Die Textänderungen werden gerade gespeichert. Bitte kurz warten.",
      };
    }

    savingRef.current = true;
    setIsSaving(true);
    setSavedHinweis(false);
    setSaveError(null);
    const textZumSpeichern = textRef.current;
    try {
      const result = await updateBerichtText(tagesberichtId, textZumSpeichern);
      if (result.ok) {
        if (textRef.current !== textZumSpeichern) {
          const speicherFehler =
            "Der Text wurde während des Speicherns geändert. Bitte nochmals speichern.";
          dirtyRef.current = true;
          setDirty(true);
          setSaveError(speicherFehler);
          return { ok: false, error: speicherFehler };
        }
        dirtyRef.current = false;
        setDirty(false);
        setSavedHinweis(true);
        router.refresh();
        return { ok: true };
      }

      const speicherFehler = result.error ?? "Speichern fehlgeschlagen.";
      setSaveError(speicherFehler);
      return { ok: false, error: speicherFehler };
    } catch {
      const speicherFehler =
        "Text konnte nicht gespeichert werden. Bitte erneut versuchen.";
      setSaveError(speicherFehler);
      return { ok: false, error: speicherFehler };
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  }, [router, tagesberichtId]);

  const vorFinalisierungVorbereiten = useCallback(async () => {
    if (generatingRef.current) {
      return {
        ok: false,
        error: "Die KI erstellt gerade einen Bericht. Bitte erst danach fortfahren.",
      };
    }
    return saveText();
  }, [saveText]);

  useEffect(
    () => registriereVorbereitung(vorFinalisierungVorbereiten),
    [registriereVorbereitung, vorFinalisierungVorbereiten],
  );

  async function handleGenerate() {
    if (
      dirtyRef.current &&
      textRef.current &&
      !confirm(
        "Der aktuelle Text hat ungespeicherte Änderungen. Sie gehen beim Neu-Erstellen verloren. Fortfahren?",
      )
    ) {
      return;
    }
    generatingRef.current = true;
    setGenerating(true);
    setError(null);
    setSaveError(null);
    setHinweis(null);
    try {
      const res = await fetch(`/api/tagesberichte/${tagesberichtId}/generate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "KI-Generierung fehlgeschlagen.");
        return;
      }
      textRef.current = data.berichtText;
      setBerichtText(data.berichtText);
      dirtyRef.current = false;
      setDirty(false);
      router.refresh();
      if (data.ausgelasseneDokumente?.length > 0) {
        setHinweis(
          `Nicht berücksichtigt (Limit erreicht): ${data.ausgelasseneDokumente.join(", ")}`,
        );
      }
    } catch {
      setError("Verbindung zur KI fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }

  function handleSave() {
    void saveText();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || isSaving}
          className="btn-primary"
        >
          {generating
            ? "KI formuliert Bericht…"
            : berichtText
              ? "Bericht neu erstellen (KI)"
              : "Bericht erstellen (KI)"}
        </button>
        {(berichtText || dirty) && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !dirty || generating}
            className="btn-secondary"
          >
            {isSaving
              ? "Speichert…"
              : dirty
                ? "Änderungen speichern"
                : "Gespeichert"}
          </button>
        )}
        {savedHinweis && (
          <span className="tag-badge text-safety-green bg-safety-green-bg border-safety-green">
            Gespeichert – erneut prüfen
          </span>
        )}
      </div>

      {error && (
        <p className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm">
          {error}
        </p>
      )}
      {saveError && (
        <p className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm">
          {saveError}
        </p>
      )}
      {hinweis && <p className="text-xs text-ink-soft">{hinweis}</p>}

      {berichtText ? (
        <textarea
          value={berichtText}
          disabled={generating || isSaving}
          onChange={(e) => {
            textRef.current = e.target.value;
            dirtyRef.current = true;
            setBerichtText(e.target.value);
            setDirty(true);
            setSavedHinweis(false);
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
              e.preventDefault();
              if (dirtyRef.current && !savingRef.current) handleSave();
            }
          }}
          rows={16}
          className="field-input font-mono text-sm leading-relaxed"
        />
      ) : (
        <p className="card border-dashed p-6 text-sm text-ink-soft">
          Noch kein Berichtstext vorhanden. Erstelle ihn mit der KI oder trage ihn manuell ein.
        </p>
      )}
    </div>
  );
}
