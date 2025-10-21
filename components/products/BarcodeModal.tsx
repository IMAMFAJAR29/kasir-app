"use client";

import { X } from "lucide-react";
import Button from "../Button";
import { Product } from "@/types/products";

interface BarcodeModalProps {
  show: boolean;
  onClose: () => void;
  product: Product | null;
  onPrint: (productId: number) => void;
}

export default function BarcodeModal({
  show,
  onClose,
  product,
  onPrint,
}: BarcodeModalProps) {
  if (!show || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-[400px] relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-4">Cetak Barcode Produk</h2>

        <p className="mb-4">
          Apakah Anda ingin mencetak barcode untuk <b>{product.name}</b>?
        </p>

        <div className="flex gap-2">
          <Button
            className="bg-gray-400 hover:bg-gray-500 flex-1"
            onClick={onClose}
          >
            Batal
          </Button>
          <Button className="flex-1" onClick={() => onPrint(product.id)}>
            Cetak
          </Button>
        </div>
      </div>
    </div>
  );
}
