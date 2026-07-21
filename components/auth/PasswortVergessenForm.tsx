"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PasswortVergessenForm() {
  const [error, setError] = useState<string | null>(null);
  const [gesendet, setGesendet] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(
      String(formData.get("email")),
      {
        redirectTo: `${location.origin}/auth/confirm?next=/passwort-zuruecksetzen`,
      },
    );

    if (error) {
      setError(
        "E-Mail konnte nicht gesendet werden. Bitte später erneut versuchen.",
      );
      setPending(false);
      return;
    }

    setGesendet(true);
    setPending(false);
  }

  if (gesendet) {
    return (
      <p className="text-sm text-ink-soft" role="status" aria-live="polite">
        Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde ein Link zum
        Zurücksetzen des Passworts gesendet. Bitte Posteingang prüfen.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="label-tag mb-1 block">
          E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="field-input"
        />
      </div>

      {error && (
        <p
          className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm"
          role="alert"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Wird gesendet…" : "Link anfordern"}
      </button>
    </form>
  );
}
