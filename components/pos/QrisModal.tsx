"use client";

import { FC } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

interface QrisModalProps {
  open: boolean;
  qrUrl: string;
  status: "pending" | "settlement" | "expire";
  onClose: () => void;
}

const QrisModal: FC<QrisModalProps> = ({ open, qrUrl, status, onClose }) => {
  if (!open) return null;

  const renderStatus = () => {
    switch (status) {
      case "pending":
        return (
          <div className="flex items-center gap-2 text-yellow-600 font-semibold">
            <AlertCircle className="w-5 h-5" />
            Menunggu Pembayaran
          </div>
        );
      case "settlement":
        return (
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <CheckCircle className="w-5 h-5" />
            Pembayaran Berhasil
          </div>
        );
      case "expire":
        return (
          <div className="flex items-center gap-2 text-red-600 font-semibold">
            <AlertCircle className="w-5 h-5" />
            QRIS Expired / Gagal
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[300px] relative flex flex-col items-center gap-4">
        {/* Tombol Close */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Judul */}
        <h2 className="text-lg font-semibold">Scan QRIS</h2>

        {/* QR Code */}
        {qrUrl ? (
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
              qrUrl
            )}&size=250x250`}
            alt="QRIS"
            className="w-48 h-48"
          />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center bg-gray-100 text-gray-400">
            QR Tidak Tersedia
          </div>
        )}

        {/* Status */}
        {renderStatus()}

        {/* Info */}
        <p className="text-sm text-gray-500 text-center">
          Scan QR menggunakan e-wallet yang mendukung QRIS (Gopay / OVO /
          LinkAja)
        </p>
      </div>
    </div>
  );
};

export default QrisModal;
