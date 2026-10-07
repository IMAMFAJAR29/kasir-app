"use client";

import { useCallback } from "react";
import { CheckCircle2, Printer, X, ShoppingBag } from "lucide-react";
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
          <title>Struk Belanja - POS IMAM</title>
          <style>
            body { font-family: monospace; padding: 12px; width: 58mm; font-size: 11px; margin: 0 auto; color: #111; }
            h2 { text-align: center; margin: 0; font-size: 14px; }
            p { margin: 3px 0; }
            .center { text-align: center; }
            .total { font-weight: bold; margin-top: 8px; font-size: 12px; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; border-top: 1px dashed #777; padding-top: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 6px; }
            td { padding: 3px 0; }
            .right { text-align: right; }
            hr { border: none; border-top: 1px dashed #777; margin: 6px 0; }
          </style>
        </head>
        <body>
          <h2>POS IMAM</h2>
          <p class="center">${date}</p>
          ${
            receiptData
              ? `<p class="center">Faktur: ${receiptData.invoiceNumber || receiptData.id}</p>`
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
          <p>Metode: ${method.toUpperCase()}</p>
          ${
            method === "cash"
              ? `<p>Tunai: Rp ${Number(payment).toLocaleString("id-ID")}</p>
                 <p>Kembalian: Rp ${change.toLocaleString("id-ID")}</p>`
              : `<p>Status: Lunas</p>`
          }
          <div class="footer">
            <p>Terima kasih atas kunjungan Anda</p>
            <p>Barang yang dibeli tidak dapat dikembalikan</p>
          </div>
        </body>
      </html>
    `);

    receiptWindow.document.close();
    receiptWindow.print();

    if (onPrint) onPrint();
  }, [cart, total, payment, method, change, onPrint, receiptData]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm z-50 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Header Transaksi Sukses */}
        <div className="bg-emerald-600 text-white p-5 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X size={18} />
          </button>
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-2 text-white">
            <CheckCircle2 size={28} />
          </div>
          <h2 className="text-base font-bold">Transaksi Berhasil</h2>
          <p className="text-xs text-emerald-100 mt-0.5">
            {receiptData?.invoiceNumber
              ? `No. ${receiptData.invoiceNumber}`
              : "Pembayaran telah dicatat"}
          </p>
        </div>

        {/* Paper Receipt Body */}
        <div className="p-5 space-y-4 text-xs font-sans text-slate-700 max-h-[60vh] overflow-y-auto">
          {/* List Item */}
          <div className="space-y-2 border-b border-dashed border-slate-200 pb-3">
            <div className="flex justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span>Item</span>
              <span>Subtotal</span>
            </div>
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-slate-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {item.qty} x Rp {item.price.toLocaleString("id-ID")}
                  </p>
                </div>
                <span className="font-semibold text-slate-900 whitespace-nowrap">
                  Rp {(item.price * item.qty).toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>

          {/* Breakdown Perhitungan */}
          <div className="space-y-1.5 border-b border-dashed border-slate-200 pb-3">
            <div className="flex justify-between text-slate-500">
              <span>Metode Pembayaran</span>
              <span className="font-semibold uppercase text-slate-900">
                {method}
              </span>
            </div>
            {method === "cash" && (
              <>
                <div className="flex justify-between text-slate-500">
                  <span>Uang Diterima</span>
                  <span className="font-semibold text-slate-900">
                    Rp {Number(payment).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Kembalian</span>
                  <span className="font-bold text-emerald-600">
                    Rp {change.toLocaleString("id-ID")}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-center pt-1">
            <span className="text-sm font-bold text-slate-900">Total Akhir</span>
            <span className="text-lg font-extrabold text-slate-900">
              Rp {total.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 text-xs py-2.5 rounded-xl"
          >
            Transaksi Baru
          </Button>
          <Button
            onClick={handlePrint}
            className="flex-1 text-xs py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center gap-1.5"
          >
            <Printer size={15} />
            <span>Cetak Struk</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
