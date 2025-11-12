"use client";

interface InvoiceNotesProps {
  notes: string;
  onChange: (value: string) => void;
}

export default function InvoiceNotes({ notes, onChange }: InvoiceNotesProps) {
  return (
    <textarea
      placeholder="Catatan..."
      value={notes}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full mt-4"
    />
  );
}
