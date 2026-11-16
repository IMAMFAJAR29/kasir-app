"use client";

import { useState } from "react";
import {
  AlertCircle,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from "lucide-react";

export interface ImportResult {
  success: boolean;
  message?: string;
  details?: string[];
}

interface ImportModalProps {
  show: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<ImportResult>;
}

const IMPORT_COLUMNS = [
  "Nama*",
  "SKU",
  "Barcode",
  "Harga Jual*",
  "Harga Beli",
  "Stok",
  "Kategori",
  "Kategori ID",
  "Deskripsi",
  "URL Gambar",
];

export default function ImportModal({
  show,
  onClose,
  onImport,
}: ImportModalProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");

  if (!show) return null;

  const handleClose = () => {
    if (submitting) return;
    setImportFile(null);
    setErrors([]);
    setMessage("");
    onClose();
  };

  const handleImportSubmit = async () => {
    if (!importFile || submitting) return;

    setSubmitting(true);
    setErrors([]);
    setMessage("");

    try {
      const result = await onImport(importFile);
      if (result.success) {
        setImportFile(null);
        onClose();
        return;
      }

      setMessage(result.message || "Import gagal");
      setErrors(result.details ?? []);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Import gagal diproses"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Tombol Tutup */}
        <button
          onClick={handleClose}
          disabled={submitting}
          className="absolute top-3 right-3 text-gray-600 hover:text-black transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        {/* Judul */}
        <h2 className="text-xl font-semibold mb-2 text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-gray-800" />
          Import Produk
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Import menggunakan file <b>.xlsx</b> (maksimal 500 baris, 5 MB).
        </p>

        {/* Panduan Kolom */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-4">
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Kolom template (kolom bertanda * wajib diisi):
          </p>
          <div className="flex flex-wrap gap-1.5">
            {IMPORT_COLUMNS.map((column) => (
              <span
                key={column}
                className="rounded-md bg-white border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600"
              >
                {column}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Isi <b>Kategori</b> dengan nama kategori yang sudah ada, atau isi{" "}
            <b>Kategori ID</b>. Jika keduanya diisi, nilainya harus cocok.
          </p>
        </div>

        {/* Tombol Download Template */}
        <a
          href="/templates/import-template.xlsx"
          download
          className="flex items-center gap-2 text-gray-800 hover:text-black mb-4 text-sm font-medium"
        >
          <FileSpreadsheet size={16} /> Download Template
        </a>

        {/* Upload File */}
        <label className="flex items-center gap-2 cursor-pointer bg-gray-100 border border-gray-300 text-gray-800 rounded-lg px-4 py-2 hover:bg-gray-200 mb-4 w-fit transition-colors">
          <Upload size={16} /> Pilih file
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => {
              setImportFile(e.target.files?.[0] ?? null);
              setErrors([]);
              setMessage("");
            }}
            className="hidden"
            disabled={submitting}
          />
        </label>

        {/* Nama file yang dipilih */}
        {importFile && (
          <p className="text-sm text-gray-500 mb-4">
            File dipilih:{" "}
            <span className="font-medium text-gray-800">{importFile.name}</span>
          </p>
        )}

        {/* Error */}
        {(message || errors.length > 0) && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
            <p className="flex items-start gap-2 text-sm font-semibold text-rose-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {message || "Import gagal"}
            </p>
            {errors.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pl-6 text-xs text-rose-700 list-disc">
                {errors.map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Tombol Import */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleImportSubmit}
            disabled={!importFile || submitting}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-white font-medium transition-colors ${
              importFile && !submitting
                ? "bg-black hover:bg-gray-900"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Mengimport..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
