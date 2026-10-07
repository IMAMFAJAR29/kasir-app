import React from "react";

type ButtonProps<T extends React.ElementType = "button"> = {
  children: React.ReactNode;
  as?: T;
  variant?: "primary" | "secondary" | "outline" | "danger" | "success" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
} & React.ComponentPropsWithoutRef<T>;

export default function Button<T extends React.ElementType = "button">({
  children,
  as,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps<T>) {
  const Tag = as || "button";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs font-medium rounded-lg gap-1.5",
    md: "px-4 py-2 text-sm font-medium rounded-xl gap-2",
    lg: "px-5 py-2.5 text-base font-semibold rounded-xl gap-2.5",
  };

  const baseStyle =
    "inline-flex items-center justify-center font-medium transition-all duration-150 select-none focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-[0.98]";

  const variants = {
    primary:
      "bg-slate-900 text-white hover:bg-slate-800 shadow-sm hover:shadow focus:ring-slate-950",
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
    <Tag
      {...props}
      className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </Tag>
  );
}
