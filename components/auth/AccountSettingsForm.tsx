"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

async function bestaetigeAktuellesPasswort(
  supabase: ReturnType<typeof createClient>,
  password: string,
): Promise<boolean> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user?.email) return false;

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  return !error;
}

function EmailForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setSuccess(null);
    setPending(true);

    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const aktuellesPasswort = String(formData.get("aktuelles_passwort") ?? "");

    try {
      const supabase = createClient();
      if (!(await bestaetigeAktuellesPasswort(supabase, aktuellesPasswort))) {
        setError("Das aktuelle Passwort ist nicht korrekt.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        email,
        current_password: aktuellesPasswort,
      });
      if (updateError) {
        setError("E-Mail konnte nicht geändert werden. Bitte erneut versuchen.");
        return;
      }

      setSuccess(
        "Bestätigungslink wurde an die alte und neue E-Mail-Adresse verschickt. Die Änderung wird erst nach Bestätigung wirksam.",
      );
      form.reset();
    } catch {
      setError("E-Mail konnte nicht geändert werden. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="space-y-4">
      <div>
        <label htmlFor="email" className="label-tag mb-1 block">
          Neue E-Mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "account-email-fehler" : undefined}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="email-aktuelles-passwort" className="label-tag mb-1 block">
          Aktuelles Passwort
        </label>
        <input
          id="email-aktuelles-passwort"
          name="aktuelles_passwort"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "account-email-fehler" : undefined}
          className="field-input"
        />
      </div>

      {error && (
        <p
          id="account-email-fehler"
          role="alert"
          className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          aria-live="polite"
          className="border-safety-green bg-safety-green-bg text-safety-green border-[1.5px] p-3 text-sm"
        >
          {success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Wird gespeichert…" : "E-Mail ändern"}
      </button>
    </form>
  );
}

function PasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setError(null);
    setSuccess(null);

    const formData = new FormData(form);
    const aktuellesPasswort = String(formData.get("aktuelles_passwort") ?? "");
    const password = String(formData.get("password") ?? "");
    const passwordWiederholen = String(formData.get("password_wiederholen") ?? "");

    if (password.length < 12) {
      setError("Das neue Passwort muss mindestens 12 Zeichen lang sein.");
      return;
    }
    if (password !== passwordWiederholen) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    if (password === aktuellesPasswort) {
      setError("Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      if (!(await bestaetigeAktuellesPasswort(supabase, aktuellesPasswort))) {
        setError("Das aktuelle Passwort ist nicht korrekt.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
        current_password: aktuellesPasswort,
      });
      if (updateError) {
        setError("Passwort konnte nicht geändert werden. Bitte erneut versuchen.");
        return;
      }

      setSuccess("Passwort wurde geändert.");
      form.reset();
    } catch {
      setError("Passwort konnte nicht geändert werden. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="space-y-4">
      <div>
        <label htmlFor="passwort-aktuell" className="label-tag mb-1 block">
          Aktuelles Passwort
        </label>
        <input
          id="passwort-aktuell"
          name="aktuelles_passwort"
          type="password"
          required
          autoComplete="current-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "account-passwort-fehler" : undefined}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="password" className="label-tag mb-1 block">
          Neues Passwort
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "account-passwort-fehler" : undefined}
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="password_wiederholen" className="label-tag mb-1 block">
          Neues Passwort wiederholen
        </label>
        <input
          id="password_wiederholen"
          name="password_wiederholen"
          type="password"
          required
          minLength={12}
          autoComplete="new-password"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "account-passwort-fehler" : undefined}
          className="field-input"
        />
      </div>

      {error && (
        <p
          id="account-passwort-fehler"
          role="alert"
          className="border-brick bg-brick-bg text-brick border-[1.5px] p-3 text-sm"
        >
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          aria-live="polite"
          className="border-safety-green bg-safety-green-bg text-safety-green border-[1.5px] p-3 text-sm"
        >
          {success}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Wird gespeichert…" : "Passwort ändern"}
      </button>
    </form>
  );
}

export function AccountSettingsForm() {
  return (
    <div className="space-y-8">
      <div className="border-line border-t-[1.5px] pt-5 first:border-t-0 first:pt-0">
        <div className="mb-3">
          <span className="label-tag">E-Mail-Adresse</span>
        </div>
        <EmailForm />
      </div>

      <div className="border-line border-t-[1.5px] pt-5">
        <div className="mb-3">
          <span className="label-tag">Passwort</span>
        </div>
        <PasswordForm />
      </div>
    </div>
  );
}
