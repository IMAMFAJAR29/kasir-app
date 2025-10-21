"use client";

import { useState, useEffect } from "react";
import { Banknote, QrCode, CreditCard, X } from "lucide-react";
import Button from "@/components/Button";
import QrisModal from "./QrisModal";

type Method = "cash" | "qris" | "transfer";

interface PaymentSectionProps {
  total: number;
  selected: Method;
  onSelect: (method: Method) => void;
  onPay: (paymentAmount?: number) => void; // kirim uang yang diterima
}

export default function PaymentSection({
  total,
  selected,
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
      onPay(payment);
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

  return (
    <div className="mt-4 border-t pt-4">
      {/* Label Section */}
      <div className="mb-3 font-semibold">Metode Pembayaran</div>

      {/* Pilihan metode pembayaran */}
      <div className="flex gap-2 mb-4">
        {methods.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`flex-1 flex items-center justify-center gap-2 border rounded-lg p-2 text-sm transition-all duration-200 ease-in-out
              ${
                selected === m.id
                  ? "bg-black text-white shadow-md"
                  : "hover:bg-gray-100"
              }`}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      {/* Total pembayaran */}
      <div className="flex justify-between mb-3">
        <span className="font-medium">Total</span>
        <span className="font-bold text-lg text-black">
          Rp {total.toLocaleString("id-ID")}
        </span>
      </div>

      {/* Input uang diterima & kembalian hanya jika tunai */}
      {selected === "cash" && (
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Uang Diterima
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={payment || ""}
              onChange={(e) => setPayment(Number(e.target.value))}
              placeholder="Masukkan jumlah uang..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black transition
                         [&::-webkit-inner-spin-button]:appearance-none
                         [&::-webkit-outer-spin-button]:appearance-none
                         [appearance:textfield]"
            />
          </div>

          <div className="flex justify-between text-sm">
            <span>Kembalian</span>
            <span className="font-semibold text-red-600">
              Rp {change.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      )}

      {/* Tombol bayar */}
      <Button
        onClick={handlePay}
        disabled={loading || (selected === "cash" && payment < total)}
        className={`w-full ${
          loading
            ? "bg-gray-400 cursor-wait"
            : selected === "cash" && payment < total
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-black text-white hover:bg-gray-800"
        }`}
      >
        {loading ? "Memproses..." : "Bayar & Cetak Struk"}
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
