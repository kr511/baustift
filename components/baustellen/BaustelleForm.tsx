"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createBaustelle, type BaustelleFormState } from "@/lib/actions/baustellen";

const initialState: BaustelleFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full">
      {pending ? "Wird angelegt…" : "Baustelle anlegen"}
    </button>
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
          Name der Baustelle *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="z. B. Wohnbau Musterstraße 12"
          className="field-input"
        />
        {state.errors?.name && (
          <p className="text-brick mt-1 text-sm" role="alert">{state.errors.name[0]}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="adresse" className="label-tag mb-1 block">
            Adresse
          </label>
          <input id="adresse" name="adresse" type="text" className="field-input" />
        </div>
        <div>
          <label htmlFor="auftraggeber" className="label-tag mb-1 block">
            Auftraggeber
          </label>
          <input id="auftraggeber" name="auftraggeber" type="text" className="field-input" />
        </div>
      </div>

      <div>
        <label htmlFor="notiz" className="label-tag mb-1 block">
          Notiz
        </label>
        <textarea id="notiz" name="notiz" rows={2} className="field-input" />
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
  );
}
