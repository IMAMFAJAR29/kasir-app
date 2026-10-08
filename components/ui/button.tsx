import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "secondary" | "outline" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
}

export function Button({
  className = "",
  variant = "default",
  size = "md",
  ...props
}: ButtonProps) {
  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5",
    md: "px-4 py-2 text-sm font-medium rounded-xl gap-2",
    lg: "px-5 py-2.5 text-base font-semibold rounded-xl gap-2.5",
  };

  const base =
    "inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98]";

  const variants: Record<string, string> = {
    default:
      "bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow focus:ring-slate-950",
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow focus:ring-blue-500",
    secondary:
      "bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200/80 focus:ring-slate-400",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm focus:ring-slate-400",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 shadow-sm focus:ring-rose-500",
    success:
      "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm focus:ring-emerald-500",
    ghost:
      "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-300",
  };

  return (
    <button
      className={`${base} ${sizeStyles[size]} ${variants[variant] || variants.default} ${className}`}
      {...props}
    />
  );
}
