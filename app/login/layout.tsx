import { BaustiftMark } from "@/components/layout/BaustiftMark";

export default function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <div className="hazard-rule" />
      <header className="bg-graphite border-b border-ink">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
          <BaustiftMark className="h-7 w-7 shrink-0" />
          <span className="flex items-baseline gap-3">
            <span className="font-display text-2xl leading-none font-bold tracking-tight text-white">
              BAUSTIFT
            </span>
            <span className="label-tag text-amber hidden sm:inline">
              Tagesberichte
            </span>
          </span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </>
  );
}
