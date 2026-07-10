import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-blueprint flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="border-b-2 border-ink pb-4">
          <span className="label-tag">Fehler 404</span>
          <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            Seite nicht gefunden
          </h1>
        </div>
        <div className="card ticked mt-8 p-5 text-sm leading-relaxed">
          <p>Die aufgerufene Seite existiert nicht oder wurde verschoben.</p>
          <Link
            href="/berichte"
            className="mt-4 inline-block border-[1.5px] border-ink bg-paper-raised px-3 py-2 font-mono text-xs font-semibold tracking-wide uppercase hover:bg-paper"
          >
            Zur Übersicht
          </Link>
        </div>
      </div>
    </div>
  );
}
