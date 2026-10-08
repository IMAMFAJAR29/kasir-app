import Image from "next/image";
import { LoaderCircle } from "lucide-react";

export default function BrandLoader({
  label,
  className = "min-h-screen",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 bg-[var(--background)] ${className}`}
    >
      <Image
        src="/Logo.png.png"
        alt="Anima POS"
        width={56}
        height={56}
        className="h-14 w-14 object-contain"
        priority
      />
      <LoaderCircle
        aria-hidden="true"
        className="h-5 w-5 animate-spin text-[var(--brand-teal)]"
      />
      <p className="text-xs font-medium tracking-wide text-slate-600">{label}</p>
    </div>
  );
}
