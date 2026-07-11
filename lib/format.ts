const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export function formatDatum(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00`));
}

export function formatDatumKurz(iso: string): string {
  return shortDateFormatter.format(new Date(`${iso}T00:00:00`));
}

export function heuteISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const UMLAUT_MAP: Record<string, string> = {
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  ß: "ss",
};

// Für Content-Disposition-Dateinamen: nur [A-Za-z0-9._-], Umlaute
// transliteriert statt entfernt, alles andere durch "-" ersetzt.
export function sanitizeDateiname(input: string): string {
  const transliteriert = input.replace(
    /[äöüÄÖÜß]/g,
    (zeichen) => UMLAUT_MAP[zeichen] ?? zeichen,
  );
  const bereinigt = transliteriert
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return bereinigt || "bericht";
}
