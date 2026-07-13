"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);

    try {
      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
      });

      if (loginError) {
        const dienstNichtErreichbar =
          loginError.name === "AuthRetryableFetchError" ||
          (typeof loginError.status === "number" && loginError.status >= 500);
        const zuVieleVersuche =
          loginError.status === 429 ||
          loginError.code === "over_request_rate_limit";

        setError(
          dienstNichtErreichbar
            ? "Der Anmeldedienst ist gerade nicht erreichbar. Bitte später erneut versuchen."
            : zuVieleVersuche
              ? "Zu viele Anmeldeversuche. Bitte kurz warten und erneut versuchen."
            : "Anmeldung fehlgeschlagen. E-Mail oder Passwort prüfen.",
        );
        return;
      }

      router.push("/berichte");
      router.refresh();
    } catch {
      setError(
        "Der Anmeldedienst ist gerade nicht erreichbar. Bitte später erneut versuchen.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="space-y-4">
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
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-fehler" : undefined}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="label-tag mb-1 block">
          Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "login-fehler" : undefined}
          className="field-input"
        />
      </div>

      {error && (
        <p
          id="login-fehler"
          role="alert"
          className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm"
        >
          {error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary w-full">
        {pending ? "Wird angemeldet…" : "Anmelden"}
      </button>
    </form>
  );
}
