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
