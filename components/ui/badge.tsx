import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: "default" | "success" | "warning" | "danger";
}

export function Badge({
  className = "",
  color = "default",
  ...props
}: BadgeProps) {
  const colors: Record<string, string> = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    danger: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[color]} ${className}`}
      {...props}
    />
  );
}
