import Link from "next/link";

const navItems = [
  { href: "/berichte", label: "Übersicht" },
  { href: "/berichte/neu", label: "Neuer Bericht" },
  { href: "/baustellen", label: "Baustellen" },
];

export function Header() {
  return (
    <div className="print:hidden">
      <div className="hazard-rule" />
      <header className="bg-graphite border-b border-ink">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/berichte" className="flex items-baseline gap-3">
            <span className="font-display text-2xl leading-none font-bold tracking-tight text-white">
              SWIETELSKY&nbsp;FABER
            </span>
            <span className="label-tag text-amber hidden sm:inline">
              Tagesberichte
            </span>
          </Link>
          <nav className="flex gap-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="label-tag border border-transparent px-3 py-2 text-white/80 transition-colors hover:border-amber/60 hover:text-amber"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
    </div>
  );
}
