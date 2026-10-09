"use client";

import { useState, useEffect } from "react";
import { Banknote, QrCode, CreditCard, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import Button from "@/components/Button";
import QrisModal from "./QrisModal";

type Method = "cash" | "qris" | "transfer";

interface PaymentSectionProps {
  total: number;
  selected: Method;
  offline?: boolean;
  onSelect: (method: Method) => void;
  onPay: (paymentAmount?: number) => void;
}

export default function PaymentSection({
  total,
  selected,
  offline = false,
  onSelect,
  onPay,
}: PaymentSectionProps) {
  const [payment, setPayment] = useState<number>(0);
  const [change, setChange] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // QRIS modal state
  const [showQrisModal, setShowQrisModal] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>("");
  const [transactionId, setTransactionId] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<
    "pending" | "settlement" | "expire"
  >("pending");

  useEffect(() => {
    if (offline && selected !== "cash") onSelect("cash");
  }, [offline, onSelect, selected]);

  useEffect(() => {
    if (selected === "cash") {
      setChange(payment - total > 0 ? payment - total : 0);
    } else {
      setPayment(0);
      setChange(0);
    }
  }, [payment, total, selected]);

  // Polling status QRIS
  useEffect(() => {
    if (!transactionId || paymentStatus !== "pending") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `/api/payments/status?transaction_id=${transactionId}`
        );
        const data = await res.json();
        if (data.status && data.status !== paymentStatus) {
          setPaymentStatus(data.status);
          if (data.status === "settlement" || data.status === "expire") {
            clearInterval(interval);
          }
        }
      } catch (err) {
        console.error("Polling status QRIS error:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [transactionId, paymentStatus]);

  // Fungsi handle pembayaran
  const handlePay = async () => {
    if (selected === "qris") {
      try {
        setLoading(true);
        const res = await fetch("/api/payments/qris", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            order_id: `ORDER-${Date.now()}`,
            amount: total,
          }),
        });
        const data = await res.json();

        if (data.qr_string) {
          setQrUrl(data.qr_string);
          setTransactionId(data.transaction_id);
          setPaymentStatus("pending");
          setShowQrisModal(true);
        } else {
          alert(`Gagal membuat QRIS: ${data.error || "Unknown error"}`);
        }
      } catch (err) {
        console.error("QRIS Error:", err);
        alert("Terjadi kesalahan saat membuat QRIS.");
      } finally {
        setLoading(false);
      }
    } else {
      onPay(payment > 0 ? payment : total);
    }
  };

  const methods: { id: Method; label: string; icon: React.ReactNode }[] = [
    { id: "cash", label: "Tunai", icon: <Banknote className="w-4 h-4" /> },
    { id: "qris", label: "QRIS", icon: <QrCode className="w-4 h-4" /> },
    {
      id: "transfer",
      label: "Transfer",
      icon: <CreditCard className="w-4 h-4" />,
    },
  ];

  const quickAmounts = [
    { label: "Uang Pas", amount: total },
    { label: "10.000", amount: 10000 },
    { label: "20.000", amount: 20000 },
    { label: "50.000", amount: 50000 },
    { label: "100.000", amount: 100000 },
  ].filter((q) => q.amount >= total || q.label === "Uang Pas");

  const isCashInsufficient = selected === "cash" && payment > 0 && payment < total;
  const isPayDisabled = loading || total <= 0 || (selected === "cash" && payment < total && payment !== 0);

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
      {/* Total Section */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xs">
        <div>
          <span className="text-xs text-slate-400 block font-medium">
            Total Tagihan
          </span>
          <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
            <Sparkles size={12} />
            <span>Pajak sudah termasuk</span>
          </span>
        </div>
        <div className="text-xl sm:text-2xl font-bold tracking-tight text-white">
          Rp {total.toLocaleString("id-ID")}
        </div>
      </div>

      {/* Metode Pembayaran */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          Pilih Metode Bayar
        </label>
        {offline && (
          <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Offline: hanya pembayaran tunai yang tersedia.
          </p>
        )}
        <div className="grid grid-cols-3 gap-2">
          {methods.map((m) => {
            const isSelected = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                disabled={offline && m.id !== "cash"}
                onClick={() => onSelect(m.id)}
                className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer select-none active:scale-[0.98] ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {m.icon}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tunai Input & Nominal Cepat */}
      {selected === "cash" && (
        <div className="space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Uang Diterima
              </label>
              {payment > 0 && (
                <button
                  type="button"
                  onClick={() => setPayment(0)}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-medium"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                inputMode="numeric"
                value={payment || ""}
                onChange={(e) => setPayment(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 pl-10 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 no-spinner transition"
              />
            </div>
          </div>

          {/* Quick Cash Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {quickAmounts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setPayment(q.amount)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition cursor-pointer select-none active:scale-95"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Kembalian / Status Kurang */}
          {payment > 0 && (
            <div
              className={`p-2.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                isCashInsufficient
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-800"
              }`}
            >
              <div className="flex items-center gap-1.5">
                {isCashInsufficient ? (
                  <AlertCircle size={14} />
                ) : (
                  <CheckCircle size={14} />
                )}
                <span>{isCashInsufficient ? "Uang Kurang" : "Kembalian"}</span>
              </div>
              <span className="text-sm font-bold">
                Rp{" "}
                {isCashInsufficient
                  ? (total - payment).toLocaleString("id-ID")
                  : change.toLocaleString("id-ID")}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Tombol Bayar */}
      <Button
        onClick={handlePay}
        disabled={isPayDisabled}
        className={`w-full py-3 text-sm font-bold rounded-xl transition-all shadow-xs ${
          isPayDisabled
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-[0.98]"
        }`}
      >
        {loading
          ? "Memproses Transaksi..."
          : `Selesaikan Pembayaran & Cetak`}
      </Button>

      {/* QRIS Modal */}
      <QrisModal
        open={showQrisModal}
        qrUrl={qrUrl}
        status={paymentStatus}
        onClose={() => setShowQrisModal(false)}
      />
    </div>
  );
}
