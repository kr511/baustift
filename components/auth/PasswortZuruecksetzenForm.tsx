"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function PasswortZuruecksetzenForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
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
      setError(
        "Passwort konnte nicht gesetzt werden. Ist der Link abgelaufen? Dann bitte einen neuen anfordern.",
      );
      setPending(false);
      return;
    }

    router.push("/berichte");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label htmlFor="password_wiederholung" className="label-tag mb-1 block">
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

      {error && (
        <p className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Wird gespeichert…" : "Passwort speichern"}
      </button>
    </form>
  );
}
