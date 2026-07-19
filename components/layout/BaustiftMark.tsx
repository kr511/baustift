// Zimmermannsstift-Symbol: im selben −45°-Winkel wie .hazard-rule (globals.css),
// zugespitzt auf den Namen "Bau-stift".
export function BaustiftMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g transform="rotate(-45 50 50)">
        <polygon
          points="10,42 66,42 90,50 66,58 10,58"
          fill="var(--color-amber)"
        />
        <rect x="52" y="42" width="4" height="16" fill="var(--color-graphite)" opacity="0.85" />
        <rect x="59" y="43.2" width="3" height="13.6" fill="var(--color-graphite)" opacity="0.85" />
      </g>
    </svg>
  );
}
