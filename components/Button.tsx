import React from "react";

/**
 * 🧩 Button universal dengan dukungan `as` dan `variant`
 * - Bisa render <button>, <a>, atau komponen lain (via prop `as`)
 * - Menyediakan 4 style varian dasar: primary, secondary, outline, danger
 */
type ButtonProps<T extends React.ElementType = "button"> = {
  children: React.ReactNode;
  as?: T;
  variant?: "primary" | "secondary" | "outline" | "danger"; // 🆕 tambah varian
  className?: string;
} & React.ComponentPropsWithoutRef<T>;

export default function Button<T extends React.ElementType = "button">({
  children,
  as,
  variant = "primary", // default: primary
  className = "",
  ...props
}: ButtonProps<T>) {
  const Tag = as || "button";

  // 🎨 Style dasar
  const baseStyle =
    "px-4 py-2 rounded-lg font-medium transition-colors duration-200 inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2";

  // 🎨 Style per varian
  const variants = {
    primary: "bg-black text-white hover:bg-gray-800 focus:ring-gray-700",
    secondary:
      "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400",
    outline:
      "border border-gray-400 text-gray-700 hover:bg-gray-100 focus:ring-gray-400",
    danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
  };

  return (
    <Tag
      {...props}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </Tag>
  );
}
