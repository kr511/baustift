import { Header } from "@/components/layout/Header";
import { getUserFirma } from "@/lib/data/firma";
import { getUserProfil } from "@/lib/data/profile";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [firma, profil] = await Promise.all([getUserFirma(), getUserProfil()]);

  return (
    <>
      <Header
        firmaWordmark={firma?.wordmark ?? null}
        isAdmin={profil?.role === "admin"}
      />
      <main className="flex-1">{children}</main>
    </>
  );
}
