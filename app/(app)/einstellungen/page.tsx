import { AccountSettingsForm } from "@/components/auth/AccountSettingsForm";

export default function EinstellungenPage() {
  return (
    <div className="bg-blueprint min-h-full">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <div className="border-b-2 border-ink pb-4">
          <span className="label-tag">Account</span>
          <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            Einstellungen
          </h1>
        </div>

        <div className="card mt-6 p-5">
          <AccountSettingsForm />
        </div>
      </div>
    </div>
  );
}
