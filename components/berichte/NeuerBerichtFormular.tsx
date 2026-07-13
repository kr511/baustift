"use client";

import { useState } from "react";
import { DokumentImport } from "@/components/berichte/DokumentImport";
import {
  TagesberichtForm,
  type TagesberichtInitialData,
} from "@/components/berichte/TagesberichtForm";
import type { BerichtAusDokument } from "@/lib/anthropic/extractBerichtAusDokument";
import { heuteISO } from "@/lib/format";

function passendeBaustelleId(
  baustelleName: string,
  baustellen: { id: string; name: string }[],
): string | null {
  const gefunden = baustellen.filter(
    (b) => b.name.trim().toLowerCase() === baustelleName.trim().toLowerCase(),
  );
  return gefunden.length === 1 ? gefunden[0].id : null;
}

function zuInitialData(
  daten: BerichtAusDokument,
  baustellen: { id: string; name: string }[],
  vorausgewaehlteBaustelleId?: string,
): TagesberichtInitialData {
  return {
    baustelle_id:
      passendeBaustelleId(daten.baustelleName, baustellen) ??
      vorausgewaehlteBaustelleId ??
      "",
    datum: daten.datum || heuteISO(),
    wetter: daten.wetter,
    stichpunkte: daten.stichpunkte,
    created_by: null,
    personal: daten.personal.map((p) => ({
      name: p.name,
      stunden: String(p.stunden),
      taetigkeit: p.taetigkeit,
    })),
    material: daten.material.map((m) => ({
      bezeichnung: m.bezeichnung,
      menge: m.menge,
      typ: m.typ,
    })),
    fotos: [],
  };
}

export function NeuerBerichtFormular({
  baustellen,
  vorausgewaehlteBaustelleId,
}: {
  baustellen: { id: string; name: string }[];
  vorausgewaehlteBaustelleId?: string;
}) {
  const [importiertesDaten, setImportiertesDaten] =
    useState<BerichtAusDokument | null>(null);
  const [importZaehler, setImportZaehler] = useState(0);
  const [formularGeaendert, setFormularGeaendert] = useState(false);
  const [importLaeuft, setImportLaeuft] = useState(false);
  const [formularBeschaeftigt, setFormularBeschaeftigt] = useState(false);

  function handleImport(daten: BerichtAusDokument) {
    setImportiertesDaten(daten);
    setImportZaehler((n) => n + 1);
    setFormularGeaendert(false);
  }

  const baustelleNichtGefunden =
    importiertesDaten !== null &&
    passendeBaustelleId(importiertesDaten.baustelleName, baustellen) === null;

  return (
    <div className="space-y-6">
      <DokumentImport
        onImportiert={handleImport}
        disabled={formularBeschaeftigt || formularGeaendert}
        disabledReason={
          formularGeaendert
            ? "Der Dokumentimport ist nach manuellen Eingaben deaktiviert, damit keine Angaben oder Fotos überschrieben werden. Für einen neuen Import bitte diese Seite neu laden."
            : undefined
        }
        onBusyChange={setImportLaeuft}
      />

      {baustelleNichtGefunden && (
        <p className="border-amber bg-paper-raised border-[1.5px] p-3 text-sm">
          Baustelle &bdquo;{importiertesDaten!.baustelleName || "unbekannt"}
          &ldquo; aus dem Dokument konnte keiner bestehenden Baustelle
          eindeutig zugeordnet werden — bitte unten manuell auswählen.
        </p>
      )}

      <TagesberichtForm
        key={importZaehler}
        baustellen={baustellen}
        disabled={importLaeuft}
        onDirtyChange={setFormularGeaendert}
        onBusyChange={setFormularBeschaeftigt}
        vorausgewaehlteBaustelleId={vorausgewaehlteBaustelleId}
        initialData={
          importiertesDaten
            ? zuInitialData(importiertesDaten, baustellen, vorausgewaehlteBaustelleId)
            : undefined
        }
      />
    </div>
  );
}
