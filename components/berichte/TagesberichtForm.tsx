"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createTagesbericht,
  type TagesberichtFormState,
} from "@/lib/actions/tagesberichte";
import {
  PersonalListEditor,
  type PersonalZeile,
} from "@/components/berichte/PersonalListEditor";
import {
  MaterialListEditor,
  type MaterialZeile,
} from "@/components/berichte/MaterialListEditor";
import { FotoUpload } from "@/components/berichte/FotoUpload";
import { heuteISO } from "@/lib/format";
import {
  erstelleTagesberichtEntwurf,
  istEntwurfNeuerAls,
  parseTagesberichtEntwurf,
  type TagesberichtEntwurf,
  type TagesberichtEntwurfInhalt,
} from "@/lib/client/tagesbericht-entwurf";

const initialState: TagesberichtFormState = {};

type SpeicherStatus = "bereit" | "speichert" | "gespeichert" | "fehler";

export interface TagesberichtInitialData {
  baustelle_id: string;
  datum: string;
  wetter: string;
  stichpunkte: string;
  personal: PersonalZeile[];
  material: MaterialZeile[];
  fotos: { storage_path: string; dateiname: string; url: string }[];
  updated_at?: string;
}

function leerePersonalzeile(): PersonalZeile {
  return { name: "", stunden: "", taetigkeit: "" };
}

function leereMaterialzeile(): MaterialZeile {
  return { bezeichnung: "", menge: "", typ: "material" };
}

function normalisiereInhalt(inhalt: TagesberichtEntwurfInhalt): TagesberichtEntwurfInhalt {
  return {
    ...inhalt,
    personal: inhalt.personal.length > 0 ? inhalt.personal : [leerePersonalzeile()],
    material: inhalt.material.length > 0 ? inhalt.material : [leereMaterialzeile()],
  };
}

function formatiereEntwurfZeitpunkt(zeitpunkt: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(zeitpunkt));
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary min-h-11 w-full sm:w-auto">
      {pending ? "Wird gespeichert…" : label}
    </button>
  );
}

function FeldFehler({ messages }: { messages?: string[] }) {
  if (!messages?.[0]) return null;
  return (
    <p className="text-brick mt-1 text-sm" role="alert">
      {messages[0]}
    </p>
  );
}

function Sektion({
  nr,
  titel,
  children,
}: {
  nr: string;
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-line border-t-[1.5px] pt-5 first:border-t-0 first:pt-0">
      <div className="mb-2 flex items-baseline gap-2">
        <span className="font-mono text-xs font-semibold text-amber">{nr}</span>
        <span className="label-tag">{titel}</span>
      </div>
      {children}
    </div>
  );
}

export function TagesberichtForm({
  baustellen,
  action,
  firmaId,
  entwurfKey,
  vorausgewaehlteBaustelleId,
  initialData,
  submitLabel = "Tagesbericht speichern",
}: {
  baustellen: { id: string; name: string }[];
  action?: (
    state: TagesberichtFormState,
    formData: FormData,
  ) => Promise<TagesberichtFormState>;
  firmaId: string;
  entwurfKey: string;
  vorausgewaehlteBaustelleId?: string;
  initialData?: TagesberichtInitialData;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(
    action ?? createTagesbericht,
    initialState,
  );
  const [werte, setWerte] = useState<TagesberichtEntwurfInhalt>(() =>
    normalisiereInhalt({
      baustelle_id: initialData?.baustelle_id ?? vorausgewaehlteBaustelleId ?? "",
      datum: initialData?.datum ?? heuteISO(),
      wetter: initialData?.wetter ?? "",
      stichpunkte: initialData?.stichpunkte ?? "",
      personal: initialData?.personal ?? [],
      material: initialData?.material ?? [],
    }),
  );
  const [wiederherstellbarerEntwurf, setWiederherstellbarerEntwurf] =
    useState<TagesberichtEntwurf | null>(null);
  const [autosaveBereit, setAutosaveBereit] = useState(false);
  const [geaendert, setGeaendert] = useState(false);
  const [speicherStatus, setSpeicherStatus] = useState<SpeicherStatus>("bereit");
  const [zuletztGespeichert, setZuletztGespeichert] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(entwurfKey);
      const entwurf = raw ? parseTagesberichtEntwurf(raw) : null;

      if (entwurf && istEntwurfNeuerAls(entwurf, initialData?.updated_at)) {
        setWiederherstellbarerEntwurf(entwurf);
      } else if (raw) {
        window.localStorage.removeItem(entwurfKey);
      }
    } catch {
      setSpeicherStatus("fehler");
    } finally {
      setAutosaveBereit(true);
    }
  }, [entwurfKey, initialData?.updated_at]);

  useEffect(() => {
    if (!autosaveBereit || !geaendert || wiederherstellbarerEntwurf) return;

    setSpeicherStatus("speichert");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      try {
        const gespeichertAm = new Date().toISOString();
        const entwurf = erstelleTagesberichtEntwurf(
          {
            ...werte,
            personal: werte.personal.filter((zeile) => zeile.name.trim() !== ""),
            material: werte.material.filter(
              (zeile) => zeile.bezeichnung.trim() !== "",
            ),
          },
          gespeichertAm,
        );
        window.localStorage.setItem(entwurfKey, JSON.stringify(entwurf));
        setZuletztGespeichert(gespeichertAm);
        setSpeicherStatus("gespeichert");
      } catch {
        setSpeicherStatus("fehler");
      }
    }, 1000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [autosaveBereit, entwurfKey, geaendert, werte, wiederherstellbarerEntwurf]);

  useEffect(() => {
    if (!geaendert || speicherStatus === "gespeichert") return;

    const warnen = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnen);
    return () => window.removeEventListener("beforeunload", warnen);
  }, [geaendert, speicherStatus]);

  useEffect(() => {
    if (state.errors || state.message) {
      setGeaendert(true);
    }
  }, [state]);

  function aktualisiere<K extends keyof TagesberichtEntwurfInhalt>(
    feld: K,
    wert: TagesberichtEntwurfInhalt[K],
  ) {
    setWerte((vorher) => ({ ...vorher, [feld]: wert }));
    setGeaendert(true);
  }

  function entwurfWiederherstellen() {
    if (!wiederherstellbarerEntwurf) return;
    setWerte(normalisiereInhalt(wiederherstellbarerEntwurf.inhalt));
    setWiederherstellbarerEntwurf(null);
    setGeaendert(true);
    setSpeicherStatus("speichert");
  }

  function entwurfVerwerfen() {
    try {
      window.localStorage.removeItem(entwurfKey);
    } catch {
      setSpeicherStatus("fehler");
    }
    setWiederherstellbarerEntwurf(null);
    setGeaendert(false);
    setSpeicherStatus("bereit");
  }

  function vorServerSpeicherung() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    try {
      window.localStorage.removeItem(entwurfKey);
    } catch {
      // Der Server-Submit soll nicht am lokalen Speicher scheitern.
    }
    setGeaendert(false);
  }

  const speicherText =
    speicherStatus === "speichert"
      ? "Wird lokal gespeichert …"
      : speicherStatus === "gespeichert" && zuletztGespeichert
        ? `Lokal gespeichert um ${new Intl.DateTimeFormat("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(new Date(zuletztGespeichert))} Uhr`
        : speicherStatus === "fehler"
          ? "Lokales Speichern ist auf diesem Gerät nicht verfügbar."
          : "Lokale Sicherung wird bei der ersten Änderung aktiviert.";

  return (
    <form action={formAction} onSubmit={vorServerSpeicherung} className="space-y-5">
      {wiederherstellbarerEntwurf && (
        <div className="border-amber bg-paper-raised border-[1.5px] p-4" role="status">
          <p className="font-semibold text-ink">Nicht gespeicherter Entwurf gefunden</p>
          <p className="mt-1 text-sm text-ink-soft">
            Lokaler Stand vom {formatiereEntwurfZeitpunkt(wiederherstellbarerEntwurf.gespeichertAm)}.
            Serverdaten werden nicht automatisch überschrieben.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={entwurfWiederherstellen} className="btn-primary min-h-10">
              Entwurf wiederherstellen
            </button>
            <button type="button" onClick={entwurfVerwerfen} className="btn-secondary min-h-10">
              Entwurf verwerfen
            </button>
          </div>
        </div>
      )}

      <div
        className={`border-[1.5px] p-3 text-sm ${
          speicherStatus === "fehler"
            ? "border-brick bg-brick-bg text-brick"
            : "border-line bg-paper text-ink-soft"
        }`}
        aria-live="polite"
      >
        {speicherText}
      </div>

      <Sektion nr="01" titel="Baustelle & Datum">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="baustelle_id" className="mb-1 block text-sm font-semibold">
              Baustelle
            </label>
            <select
              id="baustelle_id"
              name="baustelle_id"
              required
              value={werte.baustelle_id}
              onChange={(event) => aktualisiere("baustelle_id", event.target.value)}
              className="field-input"
            >
              <option value="" disabled>
                Bitte wählen…
              </option>
              {baustellen.map((baustelle) => (
                <option key={baustelle.id} value={baustelle.id}>
                  {baustelle.name}
                </option>
              ))}
            </select>
            <FeldFehler messages={state.errors?.baustelle_id} />
            <Link
              href="/baustellen"
              target="_blank"
              className="mt-1.5 inline-block text-sm text-ink-soft underline decoration-line underline-offset-2 hover:text-ink"
            >
              + neue Baustelle anlegen (neuer Tab)
            </Link>
          </div>

          <div>
            <label htmlFor="datum" className="mb-1 block text-sm font-semibold">
              Datum
            </label>
            <input
              id="datum"
              name="datum"
              type="date"
              required
              value={werte.datum}
              onChange={(event) => aktualisiere("datum", event.target.value)}
              className="field-input font-mono"
            />
            <FeldFehler messages={state.errors?.datum} />
          </div>
        </div>
      </Sektion>

      <Sektion nr="02" titel="Wetter">
        <label htmlFor="wetter" className="mb-1 block text-sm font-semibold">
          Wetterlage
        </label>
        <input
          id="wetter"
          name="wetter"
          type="text"
          required
          value={werte.wetter}
          onChange={(event) => aktualisiere("wetter", event.target.value)}
          placeholder="z. B. Sonnig, 18 °C, leichter Wind"
          className="field-input"
        />
        <FeldFehler messages={state.errors?.wetter} />
      </Sektion>

      <Sektion nr="03" titel="Personal & Stunden">
        <PersonalListEditor
          zeilen={werte.personal}
          onChange={(zeilen) => aktualisiere("personal", zeilen)}
        />
        <FeldFehler messages={state.errors?.personal_json} />
      </Sektion>

      <Sektion nr="04" titel="Material & Geräte">
        <MaterialListEditor
          zeilen={werte.material}
          onChange={(zeilen) => aktualisiere("material", zeilen)}
        />
        <FeldFehler messages={state.errors?.material_json} />
      </Sektion>

      <Sektion nr="05" titel="Stichpunkte zum Tag">
        <label htmlFor="stichpunkte" className="mb-1 block text-sm font-semibold">
          Ausgeführte Arbeiten und besondere Ereignisse
        </label>
        <textarea
          id="stichpunkte"
          name="stichpunkte"
          required
          rows={6}
          value={werte.stichpunkte}
          onChange={(event) => aktualisiere("stichpunkte", event.target.value)}
          placeholder={
            "z. B.\n- Fundament Achse 3–5 betoniert\n- Lieferung Bewehrungsstahl verspätet\n- Elektriker hat Verteiler vorbereitet"
          }
          className="field-input"
        />
        <p className="mt-1.5 text-xs text-ink-soft">
          Kurze Stichpunkte reichen — die KI formuliert daraus den vollständigen Bericht.
          Bitte möglichst keine vollen Namen von Mitarbeitenden eintragen.
        </p>
        <FeldFehler messages={state.errors?.stichpunkte} />
      </Sektion>

      <Sektion nr="06" titel="Fotos">
        <FotoUpload firmaId={firmaId} initialFotos={initialData?.fotos} />
        <p className="mt-2 text-xs text-ink-soft">
          Fotos werden separat hochgeladen und aus Speichergründen nicht im lokalen Entwurf gesichert.
        </p>
        <FeldFehler messages={state.errors?.foto_json} />
      </Sektion>

      {state.message && (
        <p
          className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm"
          role="alert"
        >
          {state.message}
        </p>
      )}

      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] pt-5">
        <p className="max-w-md text-xs text-ink-soft">
          Nach erfolgreichem Speichern wird die lokale Sicherung dieses Formulars gelöscht.
        </p>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
