"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import {
  updateDisplayName,
  type ProfilFormState,
} from "@/lib/actions/profile";

const initialState: ProfilFormState = {};

function NameSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary">
      {pending ? "Wird gespeichert…" : "Name speichern"}
    </button>
  );
}

export function NameForm({ displayName }: { displayName: string }) {
  const [state, formAction] = useActionState(updateDisplayName, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="display_name" className="label-tag mb-1 block">
          Anzeigename
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          defaultValue={displayName}
          className="field-input max-w-xs"
        />
        <p className="mt-1.5 text-xs text-ink-soft">
          Erscheint als &bdquo;Erstellt von&ldquo; auf neuen Berichten und
          Baustellen. Bereits erstellte Berichte behalten den alten Namen.
        </p>
        {state.errors?.display_name?.[0] && (
          <p className="text-brick mt-1 text-sm">
            {state.errors.display_name[0]}
          </p>
        )}
      </div>

      {state.message && state.message !== "success" && (
        <p className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm">
          {state.message}
        </p>
      )}
      {state.message === "success" && (
        <p className="text-safety-green text-sm">Name gespeichert.</p>
      )}

      <NameSubmitButton />
    </form>
  );
}

export function PasswortForm() {
  const [error, setError] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setGespeichert(false);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const passwort = String(formData.get("password"));
    const wiederholung = String(formData.get("password_wiederholung"));

    if (passwort !== wiederholung) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }

    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: passwort });

    if (error) {
      setError("Passwort konnte nicht geändert werden.");
      setPending(false);
      return;
    }

    form.reset();
    setGespeichert(true);
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="password" className="label-tag mb-1 block">
            Neues Passwort
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="field-input"
          />
        </div>
        <div>
          <label
            htmlFor="password_wiederholung"
            className="label-tag mb-1 block"
          >
            Passwort wiederholen
          </label>
          <input
            id="password_wiederholung"
            name="password_wiederholung"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="field-input"
          />
        </div>
      </div>

      {error && (
        <p className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm">
          {error}
        </p>
      )}
      {gespeichert && (
        <p className="text-safety-green text-sm">Passwort geändert.</p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Wird gespeichert…" : "Passwort ändern"}
      </button>
    </form>
  );
}
