"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";

const navItems = [
  { href: "/berichte", label: "Übersicht" },
  { href: "/berichte/neu", label: "Neuer Bericht" },
  { href: "/baustellen", label: "Baustellen" },
  { href: "/einstellungen", label: "Einstellungen" },
];

function istAktiverNavigationspunkt(pathname: string, href: string) {
  if (href === "/berichte") {
    return (
      pathname === href ||
      (pathname.startsWith("/berichte/") && !pathname.startsWith("/berichte/neu"))
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();

  return (
    <div className="print:hidden">
      <div aria-hidden="true" className="hazard-rule" />
      <header className="bg-graphite border-b border-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:gap-4">
          <Link href="/berichte" className="flex min-w-0 items-baseline gap-3">
            <span className="font-display text-2xl leading-none font-bold tracking-tight text-white">
              SWIETELSKY&nbsp;FABER
            </span>
            <span className="label-tag text-amber hidden sm:inline">
              Tagesberichte
            </span>
          </Link>
          <nav
            aria-label="Hauptnavigation"
            className="grid w-full min-w-0 grid-cols-2 gap-1 text-sm sm:grid-cols-3 lg:flex lg:w-auto lg:flex-wrap lg:justify-end"
          >
            {navItems.map((item) => {
              const istAktiv = istAktiverNavigationspunkt(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={istAktiv ? "page" : undefined}
                  className={`label-tag flex min-h-11 min-w-0 items-center justify-center border px-2 py-2 text-center transition-colors lg:px-3 ${
                    istAktiv
                      ? "border-amber text-amber"
                      : "border-transparent text-white/80 hover:border-amber/60 hover:text-amber"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="min-h-11 [&_button]:h-full [&_button]:w-full lg:[&_button]:w-auto">
              <LogoutButton />
            </div>
          </nav>
        </div>
      </header>
    </div>
  );
}
