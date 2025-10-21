import * as React from "react";

export function Table({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={`min-w-full border border-gray-200 text-sm text-gray-700 ${className}`}
      {...props}
    />
  );
}

export function TableHead({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-gray-50 ${className}`} {...props} />;
}

export function TableBody({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={`border-b last:border-none ${className}`} {...props} />;
}

export function TableCell({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-3 py-2 text-left align-middle ${className}`}
      {...props}
    />
  );
}

export function TableHeaderCell({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={`px-3 py-2 text-left font-semibold text-gray-900 ${className}`}
      {...props}
    />
  );
}
