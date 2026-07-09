"use client";

import Link from "next/link";
import { useActionState } from "react";
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

const initialState: TagesberichtFormState = {};

export interface TagesberichtInitialData {
  baustelle_id: string;
  datum: string;
  wetter: string;
  stichpunkte: string;
  created_by: string | null;
  personal: PersonalZeile[];
  material: MaterialZeile[];
  fotos: { storage_path: string; dateiname: string; url: string }[];
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full sm:w-auto">
      {pending ? "Wird gespeichert…" : label}
    </button>
  );
}

function FeldFehler({ messages }: { messages?: string[] }) {
  if (!messages?.[0]) return null;
  return <p className="text-brick mt-1 text-sm">{messages[0]}</p>;
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
  vorausgewaehlteBaustelleId,
  initialData,
  submitLabel = "Tagesbericht speichern",
}: {
  baustellen: { id: string; name: string }[];
  action?: (
    state: TagesberichtFormState,
    formData: FormData,
  ) => Promise<TagesberichtFormState>;
  vorausgewaehlteBaustelleId?: string;
  initialData?: TagesberichtInitialData;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(
    action ?? createTagesbericht,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-5">
      <Sektion nr="01" titel="Baustelle & Datum">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <select
              id="baustelle_id"
              name="baustelle_id"
              required
              defaultValue={initialData?.baustelle_id ?? vorausgewaehlteBaustelleId ?? ""}
              className="field-input"
            >
              <option value="" disabled>
                Bitte wählen…
              </option>
              {baustellen.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
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
            <input
              id="datum"
              name="datum"
              type="date"
              required
              defaultValue={initialData?.datum ?? heuteISO()}
              className="field-input font-mono"
            />
            <FeldFehler messages={state.errors?.datum} />
          </div>
        </div>
      </Sektion>

      <Sektion nr="02" titel="Wetter">
        <input
          id="wetter"
          name="wetter"
          type="text"
          required
          defaultValue={initialData?.wetter}
          placeholder="z. B. Sonnig, 18°C, leichter Wind"
          className="field-input"
        />
        <FeldFehler messages={state.errors?.wetter} />
      </Sektion>

      <Sektion nr="03" titel="Personal & Stunden">
        <PersonalListEditor initialRows={initialData?.personal} />
      </Sektion>

      <Sektion nr="04" titel="Material & Geräte">
        <MaterialListEditor initialRows={initialData?.material} />
      </Sektion>

      <Sektion nr="05" titel="Stichpunkte zum Tag">
        <textarea
          id="stichpunkte"
          name="stichpunkte"
          required
          rows={6}
          defaultValue={initialData?.stichpunkte}
          placeholder={"z. B.\n- Fundament Achse 3-5 betoniert\n- Lieferung Bewehrungsstahl verspätet\n- Elektriker war vor Ort, hat Verteiler vorbereitet"}
          className="field-input"
        />
        <p className="mt-1.5 text-xs text-ink-soft">
          Kurze Stichpunkte reichen — die KI formuliert daraus den vollständigen Bericht.
        </p>
        <FeldFehler messages={state.errors?.stichpunkte} />
      </Sektion>

      <Sektion nr="06" titel="Fotos">
        <FotoUpload initialFotos={initialData?.fotos} />
      </Sektion>

      <Sektion nr="07" titel="Erstellt von">
        <input
          id="created_by"
          name="created_by"
          type="text"
          defaultValue={initialData?.created_by ?? undefined}
          placeholder="Dein Name"
          className="field-input max-w-xs"
        />
      </Sektion>

      {state.message && (
        <p className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm">
          {state.message}
        </p>
      )}

      <div className="border-line border-t-[1.5px] pt-5">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
