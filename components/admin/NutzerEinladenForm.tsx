"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { inviteNutzer, type EinladungFormState } from "@/lib/actions/admin";

const initialState: EinladungFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Wird gesendet…" : "Einladung senden"}
    </button>
  );
}

export function NutzerEinladenForm() {
  const [state, formAction] = useActionState(inviteNutzer, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="email" className="label-tag mb-1 block">
            E-Mail *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="field-input"
          />
          {state.errors?.email?.[0] && (
            <p className="text-brick mt-1 text-sm">{state.errors.email[0]}</p>
          )}
        </div>
        <div>
          <label htmlFor="display_name" className="label-tag mb-1 block">
            Name *
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            placeholder="Vor- und Nachname"
            className="field-input"
          />
          {state.errors?.display_name?.[0] && (
            <p className="text-brick mt-1 text-sm">
              {state.errors.display_name[0]}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="role" className="label-tag mb-1 block">
          Rolle
        </label>
        <select id="role" name="role" defaultValue="nutzer" className="field-input max-w-xs">
          <option value="nutzer">Nutzer</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      {state.message && state.message !== "success" && (
        <p className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm">
          {state.message}
        </p>
      )}
      {state.message === "success" && (
        <p className="text-safety-green text-sm">
          Einladung gesendet. Die Person erhält eine E-Mail mit einem Link zum
          Festlegen des Passworts.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
