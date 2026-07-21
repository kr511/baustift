"use client";

import { useId } from "react";
import type { MaterialTyp } from "@/lib/types/database";

export interface MaterialZeile {
  bezeichnung: string;
  menge: string;
  typ: MaterialTyp;
}

const leereZeile = (): MaterialZeile => ({ bezeichnung: "", menge: "", typ: "material" });

export function MaterialListEditor({
  zeilen,
  onChange,
}: {
  zeilen: MaterialZeile[];
  onChange: (zeilen: MaterialZeile[]) => void;
}) {
  const groupId = useId();
  const sichtbareZeilen = zeilen.length > 0 ? zeilen : [leereZeile()];

  function updateZeile(index: number, patch: Partial<MaterialZeile>) {
    const basis = zeilen.length > 0 ? zeilen : [leereZeile()];
    onChange(basis.map((zeile, i) => (i === index ? { ...zeile, ...patch } : zeile)));
  }

  const gefiltert = zeilen.filter((z) => z.bezeichnung.trim() !== "");

  return (
    <div>
      <input type="hidden" name="material_json" value={JSON.stringify(gefiltert)} />
      <div className="space-y-2">
        {sichtbareZeilen.map((zeile, index) => (
          <div key={`${groupId}-${index}`} className="flex flex-wrap gap-2 sm:flex-nowrap">
            <select
              aria-label={`Typ, Material oder Gerät ${index + 1}`}
              value={zeile.typ}
              onChange={(e) => updateZeile(index, { typ: e.target.value as MaterialTyp })}
              className="field-input font-mono min-h-11 w-auto shrink-0 text-sm"
            >
              <option value="material">Material</option>
              <option value="geraet">Gerät</option>
            </select>
            <input
              type="text"
              aria-label={`Bezeichnung, Material oder Gerät ${index + 1}`}
              placeholder="Bezeichnung"
              value={zeile.bezeichnung}
              onChange={(e) => updateZeile(index, { bezeichnung: e.target.value })}
              className="field-input min-w-0 flex-1 text-sm"
            />
            <input
              type="text"
              aria-label={`Menge, Material oder Gerät ${index + 1}`}
              placeholder="Menge (z. B. 3 Paletten)"
              value={zeile.menge}
              onChange={(e) => updateZeile(index, { menge: e.target.value })}
              className="field-input w-full shrink-0 text-sm sm:w-44"
            />
            <button
              type="button"
              onClick={() => onChange(zeilen.filter((_, i) => i !== index))}
              className="border-line hover:border-brick hover:text-brick focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber min-h-11 min-w-11 shrink-0 border-[1.5px] px-3 text-ink-soft transition-colors"
              aria-label={`Material oder Gerät ${index + 1} entfernen`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...zeilen, leereZeile()])}
        className="label-tag hover:bg-amber hover:text-amber-ink hover:border-ink focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber mt-3 min-h-11 border border-transparent px-3 py-1"
      >
        + Material/Gerät hinzufügen
      </button>
    </div>
  );
}
