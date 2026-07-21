"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import {
  createStilVorlage,
  deleteStilVorlage,
  setVorlageAktiv,
  type VorlageFormState,
} from "@/lib/actions/vorlagen";
import { STIL_VORLAGEN_MAX } from "@/lib/anthropic/generateBericht";

const initialState: VorlageFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Wird gespeichert…" : "Vorlage anlegen"}
    </button>
  );
}

export interface StilVorlageZeile {
  id: string;
  titel: string;
  beispiel_text: string;
  aktiv: boolean;
}

export function StilVorlagenEditor({
  vorlagen,
}: {
  vorlagen: StilVorlageZeile[];
}) {
  const [state, formAction] = useActionState(createStilVorlage, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (state.message === "success") formRef.current?.reset();
  }, [state]);

  const aktiveAnzahl = vorlagen.filter((v) => v.aktiv).length;

  return (
    <div className="space-y-6">
      <form ref={formRef} action={formAction} className="space-y-4">
        <div>
          <label htmlFor="titel" className="label-tag mb-1 block">
            Titel *
          </label>
          <input
            id="titel"
            name="titel"
            type="text"
            required
            placeholder="z. B. Bericht Wohnbau Musterstraße, Mai 2026"
            className="field-input"
          />
          {state.errors?.titel?.[0] && (
            <p className="text-brick mt-1 text-sm" role="alert">{state.errors.titel[0]}</p>
          )}
        </div>
        <div>
          <label htmlFor="beispiel_text" className="label-tag mb-1 block">
            Beispieltext (fertiger Bericht) *
          </label>
          <textarea
            id="beispiel_text"
            name="beispiel_text"
            required
            rows={8}
            maxLength={6000}
            className="field-input font-mono text-sm"
          />
          {state.errors?.beispiel_text?.[0] && (
            <p className="text-brick mt-1 text-sm" role="alert">
              {state.errors.beispiel_text[0]}
            </p>
          )}
        </div>

        {state.message && state.message !== "success" && (
          <p
            className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm"
            role="alert"
          >
            {state.message}
          </p>
        )}
        <SubmitButton />
      </form>

      <div>
        <span className="label-tag mb-2 block">
          Aktive Vorlagen: {aktiveAnzahl} — die KI nutzt maximal die{" "}
          {STIL_VORLAGEN_MAX} neuesten aktiven Vorlagen als Stil-Referenz.
        </span>
        {feedback && (
          <p className="text-brick mb-2 text-sm" role="alert">
            {feedback}
          </p>
        )}
        <ul className="divide-line divide-y-[1.5px]">
          {vorlagen.map((vorlage) => (
            <li key={vorlage.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold text-ink">{vorlage.titel}</p>
                <p className="mt-0.5 line-clamp-2 max-w-xl text-xs text-ink-soft">
                  {vorlage.beispiel_text}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="label-tag flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    disabled={isPending}
                    defaultChecked={vorlage.aktiv}
                    onChange={(e) => {
                      const aktiv = e.target.checked;
                      setFeedback(null);
                      startTransition(async () => {
                        const result = await setVorlageAktiv(vorlage.id, aktiv);
                        if (!result.ok) {
                          setFeedback(result.error ?? "Vorlagenstatus konnte nicht gespeichert werden.");
                          return;
                        }
                        router.refresh();
                      });
                    }}
                  />
                  Aktiv
                </label>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    setFeedback(null);
                    startTransition(async () => {
                      const result = await deleteStilVorlage(vorlage.id);
                      if (!result.ok) {
                        setFeedback(result.error ?? "Vorlage konnte nicht gelöscht werden.");
                        return;
                      }
                      router.refresh();
                    });
                  }}
                  className="text-brick focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber inline-flex min-h-11 items-center px-2 text-xs underline underline-offset-2"
                >
                  Löschen
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
