export function PdfDownloadButton({ berichtId }: { berichtId: string }) {
  return (
    <a
      href={`/api/tagesberichte/${berichtId}/pdf`}
      className="btn-secondary print:hidden"
    >
      PDF herunterladen
    </a>
  );
}
