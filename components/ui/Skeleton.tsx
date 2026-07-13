export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`bg-line animate-pulse ${className}`} />;
}
