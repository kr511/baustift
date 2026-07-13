import { formatDatum } from "@/lib/format";

function buildShareText(baustelleName: string, datum: string, status: string) {
  const statusLabel = status === "final" ? "Final" : "Entwurf";
  return `Tagesbericht ${baustelleName} vom ${formatDatum(datum)} (${statusLabel}). PDF bitte separat anhängen (Button „Drucken / Als PDF speichern“ auf der Druckansicht).`;
}

export function VersandButtons({
  baustelleName,
  datum,
  status,
}: {
  baustelleName: string;
  datum: string;
  status: string;
}) {
  const text = buildShareText(baustelleName, datum, status);
  const subject = `Tagesbericht ${baustelleName} – ${formatDatum(datum)}`;
  const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(text)}`;

  return (
    <>
      <a href={mailtoHref} className="btn-secondary print:hidden">
        Per E-Mail teilen
      </a>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary print:hidden"
      >
        Per WhatsApp teilen
      </a>
    </>
  );
}
