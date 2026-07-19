import Link from "next/link";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { BaustiftMark } from "@/components/layout/BaustiftMark";

const navItems = [
  { href: "/berichte", label: "Übersicht" },
  { href: "/berichte/neu", label: "Neuer Bericht" },
  { href: "/baustellen", label: "Baustellen" },
  { href: "/konto", label: "Konto" },
];

const adminNavItems = [
  { href: "/admin/nutzer", label: "Nutzer" },
  { href: "/admin/vorlagen", label: "Stil-Vorlagen" },
];

export function Header({
  firmaWordmark,
  isAdmin,
}: {
  firmaWordmark: string | null;
  isAdmin: boolean;
}) {
  return (
    <div className="print:hidden">
      <div className="hazard-rule" />
      <header className="bg-graphite border-b border-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/berichte" className="flex items-center gap-3">
            <BaustiftMark className="h-8 w-8 shrink-0" />
            <span className="flex items-baseline gap-3">
              <span className="font-display text-2xl leading-none font-bold tracking-tight text-white">
                {firmaWordmark ?? "BAUSTIFT"}
              </span>
              <span className="label-tag text-amber hidden sm:inline">
                Tagesberichte
              </span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {[...navItems, ...(isAdmin ? adminNavItems : [])].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="label-tag border border-transparent px-3 py-2 text-white/80 transition-colors hover:border-amber/60 hover:text-amber"
              >
                {item.label}
              </Link>
            ))}
            <LogoutButton />
          </nav>
        </div>
      </header>
    </div>
  );
}
