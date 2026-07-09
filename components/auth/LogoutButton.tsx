"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="label-tag border border-transparent px-3 py-2 text-white/50 transition-colors hover:border-amber/60 hover:text-amber"
    >
      Abmelden
    </button>
  );
}
