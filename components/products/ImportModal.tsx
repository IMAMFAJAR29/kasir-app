"use client";

import { useState } from "react";
import { X, FileSpreadsheet, Upload } from "lucide-react";

interface ImportModalProps {
  show: boolean;
  onClose: () => void;
  onImport: (file: File) => void;
}

export default function ImportModal({
  show,
  onClose,
  onImport,
}: ImportModalProps) {
  const [importFile, setImportFile] = useState<File | null>(null);

  if (!show) return null;

  const handleImportSubmit = () => {
    if (!importFile) return;
    onImport(importFile);
    setImportFile(null);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        {/* Tombol Tutup */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-black transition-colors"
        >
          <X size={20} />
        </button>

        {/* Judul */}
        <h2 className="text-xl font-semibold mb-4 text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-gray-800" />
          Import Produk
        </h2>

        {/* Keterangan */}
        <p className="text-sm text-gray-600 mb-4">
          Import menggunakan file <b>.xlsx</b>.
        </p>

        {/* Tombol Download Template */}
        <a
          href="/templates/import-template.xlsx"
          download
          className="flex items-center gap-2 text-gray-800 hover:text-black mb-4"
        >
          <FileSpreadsheet size={16} /> Download Template
        </a>

        {/* Upload File */}
        <label className="flex items-center gap-2 cursor-pointer bg-gray-100 border border-gray-300 text-gray-800 rounded-lg px-4 py-2 hover:bg-gray-200 mb-4 w-fit transition-colors">
          <Upload size={16} /> Pilih file
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>

        {/* Nama file yang dipilih */}
        {importFile && (
          <p className="text-sm text-gray-500 mb-4">
            File dipilih:{" "}
            <span className="font-medium text-gray-800">{importFile.name}</span>
          </p>
        )}

        {/* Tombol Import */}
        <div className="flex justify-end">
          <button
            onClick={handleImportSubmit}
            disabled={!importFile}
            className={`px-5 py-2 rounded-lg text-white font-medium transition-colors ${
              importFile
                ? "bg-black hover:bg-gray-900"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
