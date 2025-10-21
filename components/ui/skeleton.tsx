export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-200/50 via-gray-300/30 to-gray-200/50 blur-[1px] rounded-md ${className}`}
    />
  );
}
