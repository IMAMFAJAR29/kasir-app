"use client";

interface InvoiceNotesProps {
  notes: string;
  onChange: (value: string) => void;
}

export default function InvoiceNotes({ notes, onChange }: InvoiceNotesProps) {
  return (
    <label className="mt-4 block">
      <span className="form-label">Catatan</span>
      <textarea
        placeholder="Tambahkan catatan..."
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        className="form-control min-h-20 resize-y"
      />
    </label>
  );
}
