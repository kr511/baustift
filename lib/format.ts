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

const viennaDatePartsFormatter = new Intl.DateTimeFormat("en", {
  timeZone: "Europe/Vienna",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const stundenFormatter = new Intl.NumberFormat("de-DE", {
  maximumFractionDigits: 2,
});

export function formatDatum(iso: string): string {
  return dateFormatter.format(new Date(`${iso}T00:00:00`));
}

export function formatDatumKurz(iso: string): string {
  return shortDateFormatter.format(new Date(`${iso}T00:00:00`));
}

export function formatStunden(stunden: number): string {
  return stundenFormatter.format(stunden);
}

export function heuteISO(): string {
  const teile = viennaDatePartsFormatter.formatToParts(new Date());
  const jahr = teile.find((teil) => teil.type === "year")?.value;
  const monat = teile.find((teil) => teil.type === "month")?.value;
  const tag = teile.find((teil) => teil.type === "day")?.value;

  if (!jahr || !monat || !tag) {
    throw new Error("Das aktuelle Datum konnte nicht ermittelt werden.");
  }

  return `${jahr}-${monat}-${tag}`;
}
