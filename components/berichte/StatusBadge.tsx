import type { TagesberichtWorkflowStatus } from "@/lib/types/tagesbericht-workflow";

const styles: Record<TagesberichtWorkflowStatus, string> = {
  entwurf: "text-amber-ink bg-amber border-ink",
  generiert: "text-blue-900 bg-blue-100 border-blue-700",
  geprueft: "text-safety-green bg-safety-green-bg border-safety-green",
  final: "text-white bg-safety-green border-ink",
};

const labels: Record<TagesberichtWorkflowStatus, string> = {
  entwurf: "Entwurf",
  generiert: "Text erstellt",
  geprueft: "Geprüft",
  final: "Finalisiert",
};

export function StatusBadge({ status }: { status: TagesberichtWorkflowStatus }) {
  return <span className={`tag-badge ${styles[status]}`}>{labels[status]}</span>;
}
