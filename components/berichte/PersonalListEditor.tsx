"use client";

import { useId, useState } from "react";

export interface PersonalZeile {
  name: string;
  stunden: string;
  taetigkeit: string;
}

const leereZeile = (): PersonalZeile => ({ name: "", stunden: "", taetigkeit: "" });

export function PersonalListEditor({
  initialRows,
}: {
  initialRows?: PersonalZeile[];
}) {
  const [zeilen, setZeilen] = useState<PersonalZeile[]>(
    initialRows && initialRows.length > 0 ? initialRows : [leereZeile()],
  );
  const groupId = useId();

  function updateZeile(index: number, patch: Partial<PersonalZeile>) {
    setZeilen((prev) =>
      prev.map((zeile, i) => (i === index ? { ...zeile, ...patch } : zeile)),
    );
  }

  const gefiltert = zeilen.filter((z) => z.name.trim() !== "");

  return (
    <div>
      <input type="hidden" name="personal_json" value={JSON.stringify(gefiltert)} />
      <div className="space-y-2">
        {zeilen.map((zeile, index) => (
          <div key={`${groupId}-${index}`} className="flex flex-wrap gap-2 sm:flex-nowrap">
            <input
              type="text"
              placeholder="Name"
              value={zeile.name}
              onChange={(e) => updateZeile(index, { name: e.target.value })}
              className="field-input min-w-0 flex-1 text-sm"
            />
            <input
              type="number"
              step="0.25"
              min="0"
              max="24"
              placeholder="Std."
              value={zeile.stunden}
              onChange={(e) => updateZeile(index, { stunden: e.target.value })}
              className="field-input font-mono w-24 shrink-0 text-sm"
            />
            <input
              type="text"
              placeholder="Tätigkeit (optional)"
              value={zeile.taetigkeit}
              onChange={(e) => updateZeile(index, { taetigkeit: e.target.value })}
              className="field-input min-w-0 flex-1 text-sm"
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
        + Person hinzufügen
      </button>
    </div>
  );
}
