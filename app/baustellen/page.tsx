import { Suspense } from "react";
import { BaustelleForm } from "@/components/baustellen/BaustelleForm";
import { BaustellenListe } from "@/components/baustellen/BaustellenListe";

export default function BaustellenPage() {
  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="border-b-2 border-ink pb-4">
          <span className="label-tag">Verwaltung</span>
          <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            Baustellen
          </h1>
        </div>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="card ticked p-5">
            <span className="label-tag">Neue Baustelle</span>
            <div className="mt-4">
              <BaustelleForm />
            </div>
          </div>

          <div>
            <span className="label-tag">Alle Baustellen</span>
            <div className="mt-4">
              <Suspense fallback={<p className="text-sm text-ink-soft">Lädt…</p>}>
                <BaustellenListe />
              </Suspense>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
