"use client";

import { useId } from "react";

export interface PersonalZeile {
  name: string;
  stunden: string;
  taetigkeit: string;
}

const leereZeile = (): PersonalZeile => ({ name: "", stunden: "", taetigkeit: "" });

export function PersonalListEditor({
  zeilen,
  onChange,
}: {
  zeilen: PersonalZeile[];
  onChange: (zeilen: PersonalZeile[]) => void;
}) {
  const groupId = useId();
  const sichtbareZeilen = zeilen.length > 0 ? zeilen : [leereZeile()];

  function updateZeile(index: number, patch: Partial<PersonalZeile>) {
    const basis = zeilen.length > 0 ? zeilen : [leereZeile()];
    onChange(basis.map((zeile, i) => (i === index ? { ...zeile, ...patch } : zeile)));
  }

  const gefiltert = zeilen.filter((z) => z.name.trim() !== "");

  return (
    <div>
      <input type="hidden" name="personal_json" value={JSON.stringify(gefiltert)} />
      <div className="space-y-2">
        {sichtbareZeilen.map((zeile, index) => (
          <div key={`${groupId}-${index}`} className="flex flex-wrap gap-2 sm:flex-nowrap">
            <input
              type="text"
              aria-label={`Name, Person ${index + 1}`}
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
              aria-label={`Arbeitsstunden, Person ${index + 1}`}
              placeholder="Std."
              value={zeile.stunden}
              onChange={(e) => updateZeile(index, { stunden: e.target.value })}
              className="field-input font-mono w-24 shrink-0 text-sm"
            />
            <input
              type="text"
              aria-label={`Tätigkeit, Person ${index + 1}`}
              placeholder="Tätigkeit (optional)"
              value={zeile.taetigkeit}
              onChange={(e) => updateZeile(index, { taetigkeit: e.target.value })}
              className="field-input min-w-0 flex-1 text-sm"
            />
            <button
              type="button"
              onClick={() => onChange(zeilen.filter((_, i) => i !== index))}
              className="border-line hover:border-brick hover:text-brick min-h-11 shrink-0 border-[1.5px] px-3 text-ink-soft transition-colors"
              aria-label={`Person ${index + 1} entfernen`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...zeilen, leereZeile()])}
        className="label-tag hover:bg-amber hover:text-amber-ink hover:border-ink mt-3 min-h-10 border border-transparent px-3 py-1"
      >
        + Person hinzufügen
      </button>
    </div>
  );
}
