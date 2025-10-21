"use client";

import { useCallback } from "react";
import { CheckCircle, X } from "lucide-react";
import Button from "@/components/Button";
import { CartItem } from "@/types/pos";

interface ReceiptModalProps {
  visible: boolean;
  cart: CartItem[];
  total: number;
  payment?: number | string;
  method?: "cash" | "qris" | "transfer";
  change?: number;
  receiptData?: any;
  onClose: () => void;
  onPrint?: () => void;
}

export default function ReceiptModal({
  visible,
  cart,
  total,
  payment = 0,
  method = "cash",
  change = 0,
  receiptData,
  onClose,
  onPrint,
}: ReceiptModalProps) {
  const handlePrint = useCallback(() => {
    if (!cart.length || total <= 0) return;

    const receiptWindow = window.open("", "_blank", "width=400,height=600");
    if (!receiptWindow) return;

    const date = new Date().toLocaleString("id-ID");

    receiptWindow.document.write(`
      <html>
        <head>
          <title>Struk Belanja</title>
          <style>
            body { font-family: monospace; padding: 10px; width: 58mm; }
            h2 { text-align: center; margin: 0; }
            .total { font-weight: bold; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 4px 0; }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h2>WARUNG IMAM</h2>
          <p>${date}</p>
          ${
            receiptData
              ? `<p>Faktur: ${receiptData.invoiceNumber || receiptData.id}</p>`
              : ""
          }
          <hr />
          <table>
            ${cart
              .map(
                (item) => `
                <tr>
                  <td>${item.name} x${item.qty}</td>
                  <td class="right">Rp ${(item.price * item.qty).toLocaleString(
                    "id-ID"
                  )}</td>
                </tr>`
              )
              .join("")}
          </table>
          <hr />
          <p class="total">Total: Rp ${total.toLocaleString("id-ID")}</p>
          <p>Metode: ${method}</p>
          ${
            method === "cash"
              ? `<p>Tunai: Rp ${Number(payment).toLocaleString("id-ID")}</p>
                 <p>Kembalian: Rp ${change.toLocaleString("id-ID")}</p>`
              : `<p>Status: Lunas</p>`
          }
          <div class="footer">
            <p>Terima kasih</p>
            <p>Barang yang sudah dibeli tidak dapat dikembalikan</p>
          </div>
        </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.print();

    if (onPrint) onPrint();
  }, [cart, total, payment, method, change, onPrint]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md space-y-4 relative">
        {/* Tombol Tutup */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-600 hover:text-black transition"
        >
          <X size={20} />
        </button>

        {/* Judul */}
        <div className="flex items-center justify-center gap-2 text-black">
          <CheckCircle size={24} />
          <h2 className="text-xl font-bold">Pembayaran Berhasil</h2>
        </div>

        {/* Nomor faktur & status */}
        {receiptData && (
          <div className="text-sm text-gray-700">
            <p>Nomor Faktur: {receiptData.invoiceNumber || receiptData.id}</p>
            <p>Status: {receiptData.status || "paid"}</p>
          </div>
        )}

        {/* List item keranjang */}
        <div className="border-t pt-4 space-y-2 text-sm">
          {cart.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.name} x{item.qty}
              </span>
              <span>Rp {(item.price * item.qty).toLocaleString("id-ID")}</span>
            </div>
          ))}

          <hr />
          <p className="font-bold text-lg text-gray-800">
            Total: Rp {total.toLocaleString("id-ID")}
          </p>

          {method === "cash" && (
            <>
              <p>Tunai: Rp {Number(payment).toLocaleString("id-ID")}</p>
              <p>Kembalian: Rp {change.toLocaleString("id-ID")}</p>
            </>
          )}
        </div>

        {/* Tombol Cetak Struk */}
        <div className="flex justify-end gap-3 pt-3">
          <Button
            onClick={handlePrint}
            className="bg-black text-white hover:bg-gray-800"
          >
            Cetak Struk
          </Button>
        </div>
      </div>
    </div>
  );
}
