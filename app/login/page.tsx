import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Anmelden | Swietelsky Faber Tagesberichte",
};

export default function LoginPage() {
  return (
    <div className="bg-blueprint flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="border-b-2 border-ink pb-4">
          <span className="label-tag">Interner Bereich</span>
          <h1 className="font-display mt-1 text-4xl leading-none font-bold tracking-tight">
            Anmelden
          </h1>
        </div>
        <div className="card ticked mt-8 p-5">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
