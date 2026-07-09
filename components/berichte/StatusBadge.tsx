import type { TagesberichtStatus } from "@/lib/types/database";

const styles: Record<TagesberichtStatus, string> = {
  entwurf: "text-amber-ink bg-amber border-ink",
  final: "text-safety-green bg-safety-green-bg border-safety-green",
};

const labels: Record<TagesberichtStatus, string> = {
  entwurf: "Entwurf",
  final: "Final",
};

export function StatusBadge({ status }: { status: TagesberichtStatus }) {
  return (
    <span className={`tag-badge ${styles[status]}`}>{labels[status]}</span>
  );
}
