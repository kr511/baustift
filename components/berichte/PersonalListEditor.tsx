"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface PersonalZeile {
  name: string;
  stunden: string;
  taetigkeit: string;
}

const leereZeile = (): PersonalZeile => ({ name: "", stunden: "", taetigkeit: "" });

interface PersonalEditorZeile extends PersonalZeile {
  editorId: number;
}

export function PersonalListEditor({
  initialRows,
  onChanged,
}: {
  initialRows?: PersonalZeile[];
  onChanged?: () => void;
}) {
  const groupId = useId();
  const [zeilen, setZeilen] = useState<PersonalEditorZeile[]>(() =>
    (initialRows && initialRows.length > 0 ? initialRows : [leereZeile()]).map(
      (zeile, editorId) => ({ ...zeile, editorId }),
    ),
  );
  const nextRowId = useRef(zeilen.length);
  const nameRefs = useRef(new Map<number, HTMLInputElement>());
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<number | "add" | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const focusTarget = focusTargetRef.current;
    if (focusTarget === null) return;

    const element =
      focusTarget === "add" ? addButtonRef.current : nameRefs.current.get(focusTarget);
    element?.focus();
    focusTargetRef.current = null;
  }, [zeilen]);

  function updateZeile(index: number, patch: Partial<PersonalZeile>) {
    setZeilen((prev) =>
      prev.map((zeile, i) => (i === index ? { ...zeile, ...patch } : zeile)),
    );
  }

  function addZeile() {
    const editorId = nextRowId.current;
    nextRowId.current += 1;
    setZeilen((prev) => [...prev, { ...leereZeile(), editorId }]);
    setStatus("Neue Personalzeile hinzugefügt.");
    focusTargetRef.current = editorId;
    onChanged?.();
  }

  function removeZeile(index: number) {
    const zeile = zeilen[index];
    const naechstesZiel = zeilen[index + 1]?.editorId ?? zeilen[index - 1]?.editorId ?? "add";

    setZeilen((prev) => prev.filter((_, i) => i !== index));
    setStatus(
      zeile.name.trim()
        ? `${zeile.name} wurde aus der Personalliste entfernt.`
        : `Personalzeile ${index + 1} wurde entfernt.`,
    );
    focusTargetRef.current = naechstesZiel;
    onChanged?.();
  }

  const gefiltert = zeilen
    .filter(
      (zeile) =>
        zeile.name.trim() !== "" ||
        zeile.stunden.trim() !== "" ||
        zeile.taetigkeit.trim() !== "",
    )
    .map((zeile) => ({
      name: zeile.name,
      stunden: zeile.stunden,
      taetigkeit: zeile.taetigkeit,
    }));

  return (
    <div>
      <input type="hidden" name="personal_json" value={JSON.stringify(gefiltert)} />
      <div className="space-y-2">
        {zeilen.map((zeile, index) => (
          <fieldset key={zeile.editorId} className="min-w-0">
            <legend className="sr-only">Person {index + 1}</legend>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`${groupId}-person-${zeile.editorId}-name`}
                  className="sr-only"
                >
                  Person {index + 1}: Name
                </label>
                <input
                  ref={(element) => {
                    if (element) nameRefs.current.set(zeile.editorId, element);
                    else nameRefs.current.delete(zeile.editorId);
                  }}
                  id={`${groupId}-person-${zeile.editorId}-name`}
                  type="text"
                  maxLength={200}
                  required={
                    zeile.stunden.trim() !== "" || zeile.taetigkeit.trim() !== ""
                  }
                  placeholder="Name"
                  value={zeile.name}
                  onChange={(e) => updateZeile(index, { name: e.target.value })}
                  className="field-input text-sm"
                />
              </div>
              <div className="w-24 shrink-0">
                <label
                  htmlFor={`${groupId}-person-${zeile.editorId}-stunden`}
                  className="sr-only"
                >
                  Person {index + 1}: Stunden
                </label>
                <input
                  id={`${groupId}-person-${zeile.editorId}-stunden`}
                  type="number"
                  step="0.25"
                  min="0"
                  max="24"
                  required={
                    zeile.name.trim() !== "" || zeile.taetigkeit.trim() !== ""
                  }
                  placeholder="Std."
                  value={zeile.stunden}
                  onChange={(e) => updateZeile(index, { stunden: e.target.value })}
                  className="field-input font-mono text-sm"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`${groupId}-person-${zeile.editorId}-taetigkeit`}
                  className="sr-only"
                >
                  Person {index + 1}: Tätigkeit (optional)
                </label>
                <input
                  id={`${groupId}-person-${zeile.editorId}-taetigkeit`}
                  type="text"
                  maxLength={500}
                  placeholder="Tätigkeit (optional)"
                  value={zeile.taetigkeit}
                  onChange={(e) => updateZeile(index, { taetigkeit: e.target.value })}
                  className="field-input text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeZeile(index)}
                className="border-line hover:border-brick hover:text-brick inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border-[1.5px] text-ink-soft transition-colors"
                aria-label={
                  zeile.name.trim()
                    ? `${zeile.name} aus der Personalliste entfernen`
                    : `Personalzeile ${index + 1} entfernen`
                }
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
          </fieldset>
        ))}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>
      <button
        ref={addButtonRef}
        type="button"
        onClick={addZeile}
        className="label-tag hover:bg-amber hover:text-amber-ink hover:border-ink mt-3 min-h-11 border border-transparent px-3 py-1"
      >
        + Person hinzufügen
      </button>
    </div>
  );
}
