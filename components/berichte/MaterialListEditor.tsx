"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { MaterialTyp } from "@/lib/types/database";

export interface MaterialZeile {
  bezeichnung: string;
  menge: string;
  typ: MaterialTyp;
}

const leereZeile = (): MaterialZeile => ({ bezeichnung: "", menge: "", typ: "material" });

interface MaterialEditorZeile extends MaterialZeile {
  editorId: number;
}

export function MaterialListEditor({
  initialRows,
  onChanged,
}: {
  initialRows?: MaterialZeile[];
  onChanged?: () => void;
}) {
  const groupId = useId();
  const [zeilen, setZeilen] = useState<MaterialEditorZeile[]>(() =>
    (initialRows && initialRows.length > 0 ? initialRows : [leereZeile()]).map(
      (zeile, editorId) => ({ ...zeile, editorId }),
    ),
  );
  const nextRowId = useRef(zeilen.length);
  const bezeichnungRefs = useRef(new Map<number, HTMLInputElement>());
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<number | "add" | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const focusTarget = focusTargetRef.current;
    if (focusTarget === null) return;

    const element =
      focusTarget === "add"
        ? addButtonRef.current
        : bezeichnungRefs.current.get(focusTarget);
    element?.focus();
    focusTargetRef.current = null;
  }, [zeilen]);

  function updateZeile(index: number, patch: Partial<MaterialZeile>) {
    setZeilen((prev) =>
      prev.map((zeile, i) => (i === index ? { ...zeile, ...patch } : zeile)),
    );
  }

  function addZeile() {
    const editorId = nextRowId.current;
    nextRowId.current += 1;
    setZeilen((prev) => [...prev, { ...leereZeile(), editorId }]);
    setStatus("Neue Material- oder Gerätezeile hinzugefügt.");
    focusTargetRef.current = editorId;
    onChanged?.();
  }

  function removeZeile(index: number) {
    const zeile = zeilen[index];
    const naechstesZiel = zeilen[index + 1]?.editorId ?? zeilen[index - 1]?.editorId ?? "add";

    setZeilen((prev) => prev.filter((_, i) => i !== index));
    setStatus(
      zeile.bezeichnung.trim()
        ? `${zeile.bezeichnung} wurde aus der Materialliste entfernt.`
        : `Materialzeile ${index + 1} wurde entfernt.`,
    );
    focusTargetRef.current = naechstesZiel;
    onChanged?.();
  }

  const gefiltert = zeilen
    .filter(
      (zeile) => zeile.bezeichnung.trim() !== "" || zeile.menge.trim() !== "",
    )
    .map((zeile) => ({
      bezeichnung: zeile.bezeichnung,
      menge: zeile.menge,
      typ: zeile.typ,
    }));

  return (
    <div>
      <input type="hidden" name="material_json" value={JSON.stringify(gefiltert)} />
      <div className="space-y-2">
        {zeilen.map((zeile, index) => (
          <fieldset key={zeile.editorId} className="min-w-0">
            <legend className="sr-only">Material oder Gerät {index + 1}</legend>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <div className="w-auto shrink-0">
                <label
                  htmlFor={`${groupId}-material-${zeile.editorId}-typ`}
                  className="sr-only"
                >
                  Zeile {index + 1}: Typ
                </label>
                <select
                  id={`${groupId}-material-${zeile.editorId}-typ`}
                  value={zeile.typ}
                  onChange={(e) =>
                    updateZeile(index, { typ: e.target.value as MaterialTyp })
                  }
                  className="field-input font-mono w-auto text-sm"
                >
                  <option value="material">Material</option>
                  <option value="geraet">Gerät</option>
                </select>
              </div>
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`${groupId}-material-${zeile.editorId}-bezeichnung`}
                  className="sr-only"
                >
                  Zeile {index + 1}: Bezeichnung
                </label>
                <input
                  ref={(element) => {
                    if (element) bezeichnungRefs.current.set(zeile.editorId, element);
                    else bezeichnungRefs.current.delete(zeile.editorId);
                  }}
                  id={`${groupId}-material-${zeile.editorId}-bezeichnung`}
                  type="text"
                  maxLength={300}
                  required={zeile.menge.trim() !== ""}
                  placeholder="Bezeichnung"
                  value={zeile.bezeichnung}
                  onChange={(e) => updateZeile(index, { bezeichnung: e.target.value })}
                  className="field-input text-sm"
                />
              </div>
              <div className="w-44 max-w-full shrink-0">
                <label
                  htmlFor={`${groupId}-material-${zeile.editorId}-menge`}
                  className="sr-only"
                >
                  Zeile {index + 1}: Menge
                </label>
                <input
                  id={`${groupId}-material-${zeile.editorId}-menge`}
                  type="text"
                  maxLength={300}
                  placeholder="Menge (z. B. 3 Paletten)"
                  value={zeile.menge}
                  onChange={(e) => updateZeile(index, { menge: e.target.value })}
                  className="field-input text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => removeZeile(index)}
                className="border-line hover:border-brick hover:text-brick inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border-[1.5px] text-ink-soft transition-colors"
                aria-label={
                  zeile.bezeichnung.trim()
                    ? `${zeile.bezeichnung} aus der Materialliste entfernen`
                    : `Materialzeile ${index + 1} entfernen`
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
        + Material/Gerät hinzufügen
      </button>
    </div>
  );
}
