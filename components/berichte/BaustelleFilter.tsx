"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function BaustelleFilter({
  baustellen,
}: {
  baustellen: { id: string; name: string }[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aktuelleBaustelle = searchParams.get("baustelle") ?? "";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("baustelle", value);
    } else {
      params.delete("baustelle");
    }
    router.push(`/berichte${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <select
      value={aktuelleBaustelle}
      onChange={(e) => handleChange(e.target.value)}
      className="field-input font-mono w-auto max-w-xs text-sm"
    >
      <option value="">Alle Baustellen</option>
      {baustellen.map((b) => (
        <option key={b.id} value={b.id}>
          {b.name}
        </option>
      ))}
    </select>
  );
}
