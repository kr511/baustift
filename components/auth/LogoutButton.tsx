"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });

      if (signOutError) {
        setError("Abmeldung fehlgeschlagen. Bitte erneut versuchen.");
        return;
      }

      router.push("/login");
      router.refresh();
    } catch {
      setError("Abmeldung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        aria-busy={pending}
        aria-describedby={error ? "logout-error" : undefined}
        className="label-tag border border-transparent px-3 py-2 text-white/50 transition-colors hover:border-amber/60 hover:text-amber disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Wird abgemeldet…" : "Abmelden"}
      </button>
      {error && (
        <p
          id="logout-error"
          role="alert"
          className="border-brick bg-brick-bg text-brick absolute top-full right-0 z-20 mt-1 w-max max-w-64 border-[1.5px] p-2 text-xs normal-case"
        >
          {error}
        </p>
      )}
    </div>
  );
}
