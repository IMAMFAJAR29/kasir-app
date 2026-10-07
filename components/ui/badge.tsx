import * as React from "react";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  color?: BadgeVariant;
  withDot?: boolean;
  dot?: boolean;
}

export function Badge({
  className = "",
  variant,
  color = "default",
  withDot,
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const activeVariant = (variant || color || "default") as BadgeVariant;
  const hasDot = withDot !== undefined ? withDot : dot;

  const colors: Record<BadgeVariant, { bg: string; dot: string }> = {
    default: {
      bg: "bg-slate-100 text-slate-700 border-slate-200/80",
      dot: "bg-slate-500",
    },
    success: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
      dot: "bg-emerald-500",
    },
    warning: {
      bg: "bg-amber-50 text-amber-700 border-amber-200/80",
      dot: "bg-amber-500",
    },
    danger: {
      bg: "bg-rose-50 text-rose-700 border-rose-200/80",
      dot: "bg-rose-500",
    },
    info: {
      bg: "bg-sky-50 text-sky-700 border-sky-200/80",
      dot: "bg-sky-500",
    },
    purple: {
      bg: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
      dot: "bg-indigo-500",
    },
  };

  const style = colors[activeVariant] || colors.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border ${style.bg} ${className}`}
      {...props}
    >
      {hasDot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      {children}
    </span>
  );
}
