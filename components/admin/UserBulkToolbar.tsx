"use client";

import { Eye, KeyRound, Loader2, Pencil, Trash2, X } from "lucide-react";
import Button from "@/components/Button";

interface UserBulkToolbarProps {
  count: number;
  deleting?: boolean;
  onClear: () => void;
  onDetail: () => void;
  onEdit: () => void;
  onPin: () => void;
  onDelete: () => void;
}

/**
 * Toolbar kontekstual daftar pengguna.
 * Mengikuti pola ProductBulkToolbar: muncul hanya saat ada baris terpilih.
 */
export default function UserBulkToolbar({
  count,
  deleting = false,
  onClear,
  onDetail,
  onEdit,
  onPin,
  onDelete,
}: UserBulkToolbarProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-blue-600 px-2 text-xs font-bold text-white">
          {count}
        </span>
        <span className="text-sm font-semibold text-slate-800">
          pengguna dipilih
        </span>
        <button
          type="button"
          onClick={onClear}
          className="ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-white hover:text-slate-900"
        >
          <X className="h-3.5 w-3.5" />
          Batalkan pilihan
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={onDetail}>
          <Eye className="h-3.5 w-3.5" />
          Detail
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onPin}>
          <KeyRound className="h-3.5 w-3.5" />
          Atur Ulang PIN
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={onDelete}
          disabled={deleting}
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          Hapus
        </Button>
      </div>
    </div>
  );
}
