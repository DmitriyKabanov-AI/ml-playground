export function Skeleton({ className = "h-24 w-full" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
