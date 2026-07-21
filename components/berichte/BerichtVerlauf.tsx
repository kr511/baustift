import Link from "next/link";
import type {
  TagesberichtAuditEintrag,
  TagesberichtVersionZusammenfassung,
} from "@/lib/types/tagesbericht-workflow";

const aktionsLabels: Record<string, string> = {
  bericht_erstellt: "Bericht angelegt",
  bericht_bearbeitet: "Eckdaten bearbeitet",
  bericht_text_bearbeitet: "Berichtstext bearbeitet",
  ki_generiert: "Berichtstext mit KI erstellt",
  bericht_geprueft: "Inhalt als geprüft bestätigt",
  bericht_finalisiert: "Bericht finalisiert",
  korrekturversion_erstellt: "Korrekturversion geöffnet",
  bestand_finalisiert_importiert: "Bestehende Finalisierung übernommen",
};

function zeitpunkt(value: string) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(new Date(value));
}

export function BerichtVerlauf({
  berichtId,
  versionen,
  audit,
}: {
  berichtId: string;
  versionen: TagesberichtVersionZusammenfassung[];
  audit: TagesberichtAuditEintrag[];
}) {
  if (versionen.length === 0 && audit.length === 0) return null;

  return (
    <section className="mt-8 border-t-2 border-ink pt-6">
      <h2 className="font-display text-2xl font-bold">Versionen &amp; Verlauf</h2>

      {versionen.length > 0 && (
        <div className="mt-4">
          <span className="label-tag">Unveränderliche Versionen</span>
          <ul className="card mt-2 divide-y-[1.5px] divide-line">
            {versionen.map((version) => (
              <li
                key={version.version}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div>
                  <p className="font-semibold">Version {version.version}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {zeitpunkt(version.erstelltAm)}
                    {version.erstelltVon ? ` · ${version.erstelltVon}` : ""}
                  </p>
                  {version.grund && (
                    <p className="mt-1 text-sm text-ink-soft">{version.grund}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/berichte/${berichtId}/versionen/${version.version}`}
                    className="btn-secondary min-h-10"
                  >
                    Anzeigen
                  </Link>
                  <a
                    href={`/api/tagesberichte/${berichtId}/pdf?version=${version.version}`}
                    className="btn-secondary min-h-10"
                  >
                    PDF
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {audit.length > 0 && (
        <details className="card mt-4 p-4">
          <summary className="cursor-pointer font-semibold">
            Aktivitätsverlauf ({audit.length})
          </summary>
          <ol className="mt-4 space-y-3 border-l-[1.5px] border-line pl-4">
            {audit.map((eintrag) => (
              <li key={eintrag.id} className="relative text-sm">
                <span className="bg-ink absolute top-1.5 -left-[1.28rem] h-2 w-2 rounded-full" />
                <p className="font-semibold">
                  {aktionsLabels[eintrag.aktion] ?? eintrag.aktion}
                </p>
                <p className="font-mono text-xs text-ink-soft">
                  {zeitpunkt(eintrag.createdAt)}
                  {eintrag.userName ? ` · ${eintrag.userName}` : ""}
                </p>
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
