import * as React from "react";

export function Table({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={`min-w-full border-separate border-spacing-0 border border-slate-200/80 rounded-xl text-sm text-slate-700 ${className}`}
      {...props}
    />
  );
}

export function TableHead({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={`bg-slate-50 ${className}`} {...props} />;
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
  return <tr className={`border-b border-slate-100 last:border-none hover:bg-slate-50/70 ${className}`} {...props} />;
}

export function TableCell({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`px-3 py-2.5 text-left align-middle ${className}`}
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
      className={`px-3 py-2.5 text-left font-semibold text-slate-800 ${className}`}
      {...props}
    />
  );
}
