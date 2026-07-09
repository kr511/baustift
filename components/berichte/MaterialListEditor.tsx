"use client";

import { useId, useState } from "react";
import type { MaterialTyp } from "@/lib/types/database";

export interface MaterialZeile {
  bezeichnung: string;
  menge: string;
  typ: MaterialTyp;
}

const leereZeile = (): MaterialZeile => ({ bezeichnung: "", menge: "", typ: "material" });

export function MaterialListEditor({
  initialRows,
}: {
  initialRows?: MaterialZeile[];
}) {
  const [zeilen, setZeilen] = useState<MaterialZeile[]>(
    initialRows && initialRows.length > 0 ? initialRows : [leereZeile()],
  );
  const groupId = useId();

  function updateZeile(index: number, patch: Partial<MaterialZeile>) {
    setZeilen((prev) =>
      prev.map((zeile, i) => (i === index ? { ...zeile, ...patch } : zeile)),
    );
  }

  const gefiltert = zeilen.filter((z) => z.bezeichnung.trim() !== "");

  return (
    <div>
      <input type="hidden" name="material_json" value={JSON.stringify(gefiltert)} />
      <div className="space-y-2">
        {zeilen.map((zeile, index) => (
          <div key={`${groupId}-${index}`} className="flex flex-wrap gap-2 sm:flex-nowrap">
            <select
              value={zeile.typ}
              onChange={(e) => updateZeile(index, { typ: e.target.value as MaterialTyp })}
              className="field-input font-mono w-auto shrink-0 text-sm"
            >
              <option value="material">Material</option>
              <option value="geraet">Gerät</option>
            </select>
            <input
              type="text"
              placeholder="Bezeichnung"
              value={zeile.bezeichnung}
              onChange={(e) => updateZeile(index, { bezeichnung: e.target.value })}
              className="field-input min-w-0 flex-1 text-sm"
            />
            <input
              type="text"
              placeholder="Menge (z. B. 3 Paletten)"
              value={zeile.menge}
              onChange={(e) => updateZeile(index, { menge: e.target.value })}
              className="field-input w-44 shrink-0 text-sm"
            />
            <button
              type="button"
              onClick={() => setZeilen((prev) => prev.filter((_, i) => i !== index))}
              className="border-line hover:border-brick hover:text-brick shrink-0 border-[1.5px] px-2.5 text-ink-soft transition-colors"
              aria-label="Zeile entfernen"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setZeilen((prev) => [...prev, leereZeile()])}
        className="label-tag hover:bg-amber hover:text-amber-ink hover:border-ink mt-3 border border-transparent px-2 py-1"
      >
        + Material/Gerät hinzufügen
      </button>
    </div>
  );
}
