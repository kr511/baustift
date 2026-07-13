"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createBaustelle, type BaustelleFormState } from "@/lib/actions/baustellen";

const initialState: BaustelleFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="btn-primary w-full"
    >
      {pending ? "Wird angelegt…" : "Baustelle anlegen"}
    </button>
  );
}

function FeldFehler({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.[0]) return null;
  return (
    <p id={id} role="alert" className="text-brick mt-1 text-sm">
      {messages[0]}
    </p>
  );
}

export function BaustelleForm() {
  const [state, formAction] = useActionState(createBaustelle, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="label-tag mb-1 block">
          Name der Baustelle
          <span aria-hidden="true" className="text-brick"> *</span>
          <span className="sr-only"> (Pflichtfeld)</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={300}
          placeholder="z. B. Wohnbau Musterstraße 12"
          aria-invalid={Boolean(state.errors?.name)}
          aria-describedby={state.errors?.name ? "baustelle-name-fehler" : undefined}
          className="field-input"
        />
        <FeldFehler id="baustelle-name-fehler" messages={state.errors?.name} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="adresse" className="label-tag mb-1 block">
            Adresse
          </label>
          <input
            id="adresse"
            name="adresse"
            type="text"
            maxLength={500}
            aria-invalid={Boolean(state.errors?.adresse)}
            aria-describedby={state.errors?.adresse ? "baustelle-adresse-fehler" : undefined}
            className="field-input"
          />
          <FeldFehler id="baustelle-adresse-fehler" messages={state.errors?.adresse} />
        </div>
        <div>
          <label htmlFor="auftraggeber" className="label-tag mb-1 block">
            Auftraggeber
          </label>
          <input
            id="auftraggeber"
            name="auftraggeber"
            type="text"
            maxLength={300}
            aria-invalid={Boolean(state.errors?.auftraggeber)}
            aria-describedby={
              state.errors?.auftraggeber ? "baustelle-auftraggeber-fehler" : undefined
            }
            className="field-input"
          />
          <FeldFehler
            id="baustelle-auftraggeber-fehler"
            messages={state.errors?.auftraggeber}
          />
        </div>
      </div>

      <div>
        <label htmlFor="notiz" className="label-tag mb-1 block">
          Notiz
        </label>
        <textarea
          id="notiz"
          name="notiz"
          rows={2}
          maxLength={5_000}
          aria-invalid={Boolean(state.errors?.notiz)}
          aria-describedby={state.errors?.notiz ? "baustelle-notiz-fehler" : undefined}
          className="field-input"
        />
        <FeldFehler id="baustelle-notiz-fehler" messages={state.errors?.notiz} />
      </div>

      <div>
        <label htmlFor="created_by" className="label-tag mb-1 block">
          Angelegt von
        </label>
        <input
          id="created_by"
          name="created_by"
          type="text"
          maxLength={200}
          placeholder="Dein Name"
          aria-invalid={Boolean(state.errors?.created_by)}
          aria-describedby={
            state.errors?.created_by ? "baustelle-created-by-fehler" : undefined
          }
          className="field-input max-w-xs"
        />
        <FeldFehler
          id="baustelle-created-by-fehler"
          messages={state.errors?.created_by}
        />
      </div>

      {state.message && state.message !== "success" && (
        <p role="alert" className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm">
          {state.message}
        </p>
      )}

      {state.message === "success" && (
        <p role="status" aria-live="polite" className="sr-only">
          Baustelle wurde angelegt.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
