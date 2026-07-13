import { redirect } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { getAuthenticatedClient } from "@/lib/supabase/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getAuthenticatedClient();
  if (!auth) redirect("/login");

  return (
    <>
      <a
        href="#main-content"
        className="bg-amber text-amber-ink fixed top-2 left-2 z-50 -translate-y-20 border-[1.5px] border-ink px-3 py-2 font-mono text-xs font-semibold tracking-wide uppercase transition-transform focus:translate-y-0 focus:outline-2 focus:outline-offset-2 focus:outline-white print:hidden"
      >
        Zum Inhalt springen
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        {children}
      </main>
    </>
  );
}
