"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  CloudOff,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  X,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import PosAccountBar from "@/components/pos/PosAccountBar";
import OpenCashSessionForm from "@/components/pos/OpenCashSessionForm";
import ActiveCashSessionBar from "@/components/pos/ActiveCashSessionBar";
import PosSalesWorkspace, {
  type ReceiptRecord,
} from "@/components/pos/PosSalesWorkspace";
import BrandLoader from "@/components/BrandLoader";
import { Product } from "@/types/products";
import { CartItem } from "@/types/pos";

interface CashSession {
  id: string;
  openingCash: number;
  expectedCash: number;
  openedAt: string;
}

interface QueuedSale {
  clientTransactionId: string;
  cashSessionId: string;
  items: Array<{ id: number; qty: number; price: number }>;
  method: "cash" | "qris" | "transfer";
  payment: number;
  total: number;
}

interface StoredPosState {
  products: Product[];
  cart: CartItem[];
  method: "cash" | "qris" | "transfer";
  cashSession: CashSession | null;
  pendingSales: QueuedSale[];
}

interface CachedIdentity {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

const emptyStoredState: StoredPosState = {
  products: [],
  cart: [],
  method: "cash",
  cashSession: null,
  pendingSales: [],
};

export default function PosPage() {
  const { data: session, status } = useSession();
  const [cachedIdentity, setCachedIdentity] = useState<CachedIdentity | null>(
    null
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [method, setMethod] = useState<"cash" | "qris" | "transfer">("cash");
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptRecord | null>(null);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [pendingSales, setPendingSales] = useState<QueuedSale[]>([]);
  const [openingCash, setOpeningCash] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isOpeningSession, setIsOpeningSession] = useState(false);
  const [isClosingSession, setIsClosingSession] = useState(false);
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPinFields, setShowPinFields] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [pinError, setPinError] = useState("");
  const syncingRef = useRef(false);
  const initializedKeyRef = useRef<string | null>(null);
  const previousOnlineRef = useRef(true);
  const identity =
    session?.user?.id
      ? session.user
      : !isOnline
        ? cachedIdentity
        : null;
  const storageKey = identity?.id
    ? `anima-pos:v1:${identity.id}`
    : null;

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    [cart]
  );
  const cashierName =
    identity?.name || identity?.email?.split("@")[0] || "Kasir";

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
    } catch (error) {
      console.error("Gagal keluar dari akun kasir:", error);
    } finally {
      window.location.assign(`${window.location.origin}/auth`);
    }
  };

  const handleChangePin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isChangingPin) return;
    setPinError("");
    if (!/^\d{4,12}$/.test(currentPin)) {
      setPinError("PIN saat ini harus terdiri dari 4–12 digit angka.");
      return;
    }
    if (!/^\d{6,12}$/.test(newPin)) {
      setPinError("PIN baru harus terdiri dari 6–12 digit angka.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("Konfirmasi PIN baru tidak cocok.");
      return;
    }
    setIsChangingPin(true);
    try {
      const response = await fetch("/api/cashier/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin, confirmPin }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal mengubah PIN.");
      setIsPinModalOpen(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      await Swal.fire(
        "PIN berhasil diubah",
        "Gunakan PIN baru pada login kasir berikutnya.",
        "success"
      );
    } catch (error) {
      setPinError(error instanceof Error ? error.message : "Terjadi kesalahan.");
    } finally {
      setIsChangingPin(false);
    }
  };

  const openPinModal = () => {
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
    setPinError("");
    setShowPinFields(false);
    setIsPinModalOpen(true);
  };

  const persistState = useCallback(
    (updates: Partial<StoredPosState>) => {
      if (!storageKey) return;
      try {
        const previous = localStorage.getItem(storageKey);
        const current = previous
          ? { ...emptyStoredState, ...JSON.parse(previous) }
          : emptyStoredState;
        localStorage.setItem(
          storageKey,
          JSON.stringify({ ...current, ...updates })
        );
      } catch (error) {
        console.error("Gagal menyimpan data POS di perangkat:", error);
        setStorageError(true);
      }
    },
    [storageKey]
  );

  const syncPendingSales = useCallback(
    async (queue: QueuedSale[]) => {
      if (!navigator.onLine || queue.length === 0 || syncingRef.current) return;
      syncingRef.current = true;
      setIsSynchronizing(true);
      let syncedAll = true;
      try {
        for (const queuedSale of queue) {
          const response = await fetch("/api/sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(queuedSale),
          });
          if (!response.ok) {
            const result = await response.json();
            setStatusMessage(
              result.error || "Transaksi offline belum dapat disinkronkan."
            );
            syncedAll = false;
            break;
          }
          setPendingSales((current) =>
            current.filter(
              (sale) =>
                sale.clientTransactionId !== queuedSale.clientTransactionId
            )
          );
          const currentText = storageKey
            ? localStorage.getItem(storageKey)
            : null;
          if (currentText && storageKey) {
            const saved = JSON.parse(currentText) as StoredPosState;
            localStorage.setItem(
              storageKey,
              JSON.stringify({
                ...saved,
                pendingSales: saved.pendingSales.filter(
                  (sale) =>
                    sale.clientTransactionId !==
                    queuedSale.clientTransactionId
                ),
              })
            );
          }
        }
        if (syncedAll && queue.length > 0 && navigator.onLine) {
          const sessionResponse = await fetch("/api/cash-sessions/current");
          if (sessionResponse.ok) {
            const sessionResult = await sessionResponse.json();
            setCashSession(sessionResult.session);
            persistState({ cashSession: sessionResult.session });
          }
          setStatusMessage("Transaksi offline berhasil disinkronkan.");
        }
      } catch (error) {
        console.error("Gagal menyinkronkan transaksi POS:", error);
        setStatusMessage("Sinkronisasi gagal. Transaksi tetap tersimpan di perangkat.");
      } finally {
        syncingRef.current = false;
        setIsSynchronizing(false);
      }
    },
    [persistState, storageKey]
  );

  useEffect(() => {
    const updateConnection = () => setIsOnline(navigator.onLine);
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "development") {
      void navigator.serviceWorker
        .getRegistrations()
        .then(async (registrations) => {
          await Promise.all(
            registrations
              .filter((registration) =>
                registration.active?.scriptURL.endsWith("/sw.js")
              )
              .map((registration) => registration.unregister())
          );
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames
              .filter((cacheName) => cacheName.startsWith("anima-pos-"))
              .map((cacheName) => caches.delete(cacheName))
          );
        })
        .catch((error) => {
          console.error("Gagal membersihkan cache POS lokal:", error);
        });

      const reloadKey = "anima-pos-dev-worker-cleared";
      if (
        navigator.serviceWorker.controller &&
        sessionStorage.getItem(reloadKey) !== "1"
      ) {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
      } else if (!navigator.serviceWorker.controller) {
        sessionStorage.removeItem(reloadKey);
      }
    } else if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Gagal mendaftarkan cache offline POS:", error);
      });
    }
    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
    };
  }, []);

  useEffect(() => {
    if (session?.user?.id) {
      const currentIdentity: CachedIdentity = {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        role: session.user.role,
      };
      setCachedIdentity(currentIdentity);
      try {
        localStorage.setItem(
          "anima-pos:last-user",
          JSON.stringify(currentIdentity)
        );
      } catch (error) {
        console.error("Gagal menyimpan identitas offline kasir:", error);
        setStorageError(true);
      }
      return;
    }
    if (!navigator.onLine) {
      try {
        const value = localStorage.getItem("anima-pos:last-user");
        if (value) setCachedIdentity(JSON.parse(value) as CachedIdentity);
      } catch (error) {
        console.error("Gagal memuat identitas offline kasir:", error);
        setStorageError(true);
      }
    }
  }, [session]);

  useEffect(() => {
    if (
      !storageKey ||
      (status !== "authenticated" && navigator.onLine) ||
      initializedKeyRef.current === storageKey
    ) {
      return;
    }
    initializedKeyRef.current = storageKey;
    let cancelled = false;
    setIsReady(false);

    const initialize = async () => {
      let saved: StoredPosState = emptyStoredState;
      try {
        const value = localStorage.getItem(storageKey);
        if (value) saved = { ...emptyStoredState, ...JSON.parse(value) };
      } catch (error) {
        console.error("Gagal membaca data POS tersimpan:", error);
        setStorageError(true);
      }

      if (cancelled) return;
      setCart(saved.cart);
      setMethod(navigator.onLine ? saved.method : "cash");
      setCashSession(saved.cashSession);
      setPendingSales(saved.pendingSales);
      setProducts(saved.products);
      setIsOnline(navigator.onLine);
      setIsReady(true);

      if (!navigator.onLine) return;

      try {
        const [productsResponse, sessionResponse] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/cash-sessions/current"),
        ]);
        if (!productsResponse.ok) {
          throw new Error(`Gagal memuat produk (${productsResponse.status})`);
        }
        if (!sessionResponse.ok) {
          throw new Error(`Gagal memuat shift kasir (${sessionResponse.status})`);
        }
        const [loadedProducts, sessionResult] = await Promise.all([
          productsResponse.json(),
          sessionResponse.json(),
        ]);
        if (cancelled) return;
        if (!Array.isArray(loadedProducts)) {
          throw new Error("Data produk dari server tidak valid");
        }
        setProducts(loadedProducts);
        setCashSession(sessionResult.session);
        persistState({
          products: loadedProducts,
          cashSession: sessionResult.session,
        });
      } catch (error) {
        console.error("Gagal memuat data POS:", error);
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Gagal memuat data POS dari server."
        );
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [persistState, status, storageKey]);

  useEffect(() => {
    const wasOffline = !previousOnlineRef.current;
    previousOnlineRef.current = isOnline;
    if (!wasOffline || !isOnline || !isReady) return;

    const refreshOnlineData = async () => {
      try {
        const [productsResponse, sessionResponse] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/cash-sessions/current"),
        ]);
        if (!productsResponse.ok || !sessionResponse.ok) {
          throw new Error("Gagal memperbarui data POS saat online.");
        }
        const [loadedProducts, sessionResult] = await Promise.all([
          productsResponse.json(),
          sessionResponse.json(),
        ]);
        if (!Array.isArray(loadedProducts)) {
          throw new Error("Data produk dari server tidak valid.");
        }
        setProducts(loadedProducts);
        setCashSession(sessionResult.session);
        persistState({
          products: loadedProducts,
          cashSession: sessionResult.session,
        });
      } catch (error) {
        console.error("Gagal memperbarui data POS saat online:", error);
        setStatusMessage(
          error instanceof Error ? error.message : "Gagal memperbarui data POS."
        );
      }
    };
    void refreshOnlineData();
  }, [isOnline, isReady, persistState]);

  useEffect(() => {
    if (!isReady) return;
    persistState({ products, cart, method, cashSession, pendingSales });
  }, [cart, cashSession, isReady, method, pendingSales, persistState, products]);

  useEffect(() => {
    if (isOnline && isReady && pendingSales.length > 0) {
      void syncPendingSales(pendingSales);
    }
  }, [isOnline, isReady, pendingSales, syncPendingSales]);

  useEffect(() => {
    if (isOnline && statusMessage.startsWith("Transaksi offline berhasil")) {
      const timer = window.setTimeout(() => setStatusMessage(""), 5000);
      return () => window.clearTimeout(timer);
    }
  }, [isOnline, statusMessage]);

  const handleAddToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      return existing
        ? current.map((item) =>
            item.id === product.id ? { ...item, qty: item.qty + 1 } : item
          )
        : [...current, { ...product, qty: 1 }];
    });
  };

  const handleUpdateQty = (id: number, qty: number) => {
    if (qty <= 0) {
      setCart((current) => current.filter((item) => item.id !== id));
      return;
    }
    setCart((current) =>
      current.map((item) => (item.id === id ? { ...item, qty } : item))
    );
  };

  const handleOpenSession = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(openingCash);
    if (!Number.isFinite(amount) || amount < 0) {
      await Swal.fire("Modal awal tidak valid", "Masukkan nominal nol atau lebih.", "warning");
      return;
    }
    if (!isOnline) {
      await Swal.fire(
        "Perlu koneksi internet",
        "Buka shift saat online terlebih dahulu. Setelah shift dibuka, POS dapat digunakan offline.",
        "info"
      );
      return;
    }

    setIsOpeningSession(true);
    try {
      const response = await fetch("/api/cash-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingCash: amount }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Gagal membuka shift.");
      setCashSession(result.session);
      setOpeningCash("");
    } catch (error) {
      await Swal.fire(
        "Shift belum dibuka",
        error instanceof Error ? error.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setIsOpeningSession(false);
    }
  };

  const handleCloseSession = async () => {
    if (!cashSession) return;
    if (cart.length > 0) {
      await Swal.fire(
        "Keranjang belum kosong",
        "Selesaikan atau kosongkan keranjang sebelum menutup shift.",
        "warning"
      );
      return;
    }
    if (pendingSales.length > 0) {
      await Swal.fire(
        "Transaksi belum tersinkron",
        "Sambungkan internet dan tunggu semua transaksi tersinkron sebelum menutup shift.",
        "warning"
      );
      return;
    }

    const result = await Swal.fire({
      title: "Tutup shift kasir",
      text: `Kas yang diharapkan: Rp ${cashSession.expectedCash.toLocaleString("id-ID")}. Masukkan uang fisik di laci kas.`,
      input: "number",
      inputAttributes: { min: "0", step: "1", inputmode: "numeric" },
      inputPlaceholder: "Jumlah uang fisik",
      showCancelButton: true,
      confirmButtonText: "Tutup shift",
      cancelButtonText: "Batal",
      confirmButtonColor: "#1769e0",
      preConfirm: (value) => {
        const amount = Number(value);
        if (!value || !Number.isFinite(amount) || amount < 0) {
          Swal.showValidationMessage("Masukkan jumlah uang fisik yang valid.");
          return false;
        }
        return amount;
      },
    });
    if (!result.isConfirmed || typeof result.value !== "number") return;

    setIsClosingSession(true);
    try {
      const response = await fetch(`/api/cash-sessions/${cashSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closingCash: result.value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menutup shift.");

      setCashSession(null);
      const difference = Number(data.session.difference);
      await Swal.fire({
        icon: difference === 0 ? "success" : "warning",
        title:
          difference === 0
            ? "Shift sesuai"
            : difference < 0
              ? "Kas kurang"
              : "Kas lebih",
        text: `Kas diharapkan Rp ${Number(data.session.expectedCash).toLocaleString("id-ID")}; uang fisik Rp ${Number(data.session.closingCash).toLocaleString("id-ID")}; selisih ${difference < 0 ? "−" : "+"}Rp ${Math.abs(difference).toLocaleString("id-ID")}.`,
        confirmButtonColor: "#1769e0",
      });
    } catch (error) {
      await Swal.fire(
        "Shift belum ditutup",
        error instanceof Error ? error.message : "Terjadi kesalahan.",
        "error"
      );
    } finally {
      setIsClosingSession(false);
    }
  };

  const handlePay = async (paymentAmount = total) => {
    if (!cart.length) {
      await Swal.fire("Keranjang Kosong", "Pilih produk terlebih dahulu.", "warning");
      return;
    }
    if (!cashSession) {
      await Swal.fire("Shift belum dibuka", "Buka shift kasir sebelum menerima pembayaran.", "warning");
      return;
    }
    if (!isOnline && method !== "cash") {
      await Swal.fire("Metode pembayaran offline", "Saat offline, transaksi tunai saja yang dapat diproses.", "warning");
      return;
    }
    if (!isOnline && storageError) {
      await Swal.fire(
        "Penyimpanan offline tidak tersedia",
        "Perbaiki ruang penyimpanan browser sebelum melanjutkan transaksi offline.",
        "error"
      );
      return;
    }

    const transaction: QueuedSale = {
      clientTransactionId: crypto.randomUUID(),
      cashSessionId: cashSession.id,
      items: cart.map((item) => ({
        id: item.id,
        qty: item.qty,
        price: item.price,
      })),
      method: isOnline ? method : "cash",
      payment: paymentAmount,
      total,
    };
    const nextQueue = [...pendingSales, transaction];
    setPendingSales(nextQueue);
    persistState({ pendingSales: nextQueue });

    if (!isOnline) {
      setReceiptData({
        id: "OFFLINE",
        payment: paymentAmount,
        change: Math.max(0, paymentAmount - total),
        pendingSync: true,
      });
      setShowReceipt(true);
      setStatusMessage("Transaksi tersimpan di perangkat dan menunggu sinkronisasi.");
      return;
    }

    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(transaction),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan transaksi.");
      const remainingQueue = nextQueue.filter(
        (sale) =>
          sale.clientTransactionId !== transaction.clientTransactionId
      );
      setPendingSales((current) =>
        current.filter(
          (sale) =>
            sale.clientTransactionId !== transaction.clientTransactionId
        )
      );
      persistState({ pendingSales: remainingQueue });
      setReceiptData(data);
      setCashSession((current) =>
        current
          ? {
              ...current,
              expectedCash:
                current.expectedCash +
                (transaction.method === "cash"
                  ? paymentAmount - Math.max(0, paymentAmount - total)
                  : 0),
            }
          : current
      );
      setShowReceipt(true);
    } catch (error) {
      if (!navigator.onLine && transaction.method === "cash") {
        setIsOnline(false);
        setReceiptData({
          id: "OFFLINE",
          payment: paymentAmount,
          change: Math.max(0, paymentAmount - total),
          pendingSync: true,
        });
        setShowReceipt(true);
        setStatusMessage("Koneksi terputus. Transaksi tunai tersimpan untuk disinkronkan.");
        return;
      }
      console.error("Gagal menyimpan transaksi POS:", error);
      await Swal.fire(
        "Transaksi gagal",
        error instanceof Error ? error.message : "Terjadi kesalahan transaksi.",
        "error"
      );
    }
  };

  const handleCloseReceipt = () => {
    setCart([]);
    setShowReceipt(false);
    setReceiptData(null);
  };

  if ((status === "loading" && isOnline) || !isReady) {
    return <BrandLoader label="Memuat POS kasir..." />;
  }

  if (!identity) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <CloudOff className="mx-auto h-8 w-8 text-amber-600" />
        <h1 className="mt-3 text-lg font-bold text-brand-navy">
          POS offline tidak dapat dibuka
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Perangkat ini belum memiliki sesi kasir tersimpan. Sambungkan internet
          dan login terlebih dahulu untuk menyiapkan POS offline.
        </p>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          <LogOut className="h-4 w-4" />
          Keluar / Ganti akun
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 sm:px-6 sm:py-6">
      <PosAccountBar
        name={cashierName}
        role={identity.role || "CASHIER"}
        online={isOnline}
        onLogout={() => void handleSignOut()}
        onChangePin={openPinModal}
      />

      {isPinModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isChangingPin) {
              setIsPinModalOpen(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-pin-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl"
          >
            <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-teal-50 via-blue-50 to-white px-6 py-6 sm:px-8">
              <div className="absolute -right-8 -top-12 h-36 w-36 rounded-full bg-blue-200/30 blur-3xl" />
              <button
                type="button"
                onClick={() => setIsPinModalOpen(false)}
                disabled={isChangingPin}
                aria-label="Tutup form ubah PIN"
                className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 transition hover:bg-white/80 hover:text-slate-800 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-blue-100 bg-white text-blue-700 shadow-sm">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h2
                    id="change-pin-title"
                    className="text-xl font-bold tracking-tight text-brand-navy sm:text-2xl"
                  >
                    Ubah PIN kasir
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    PIN baru hanya diketahui oleh Anda.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleChangePin} className="space-y-4 p-6 sm:p-8">
              {[
                {
                  id: "current-pin",
                  label: "PIN saat ini",
                  placeholder: "Masukkan PIN saat ini",
                  value: currentPin,
                  setValue: setCurrentPin,
                  minLength: 4,
                },
                {
                  id: "new-pin",
                  label: "PIN baru",
                  placeholder: "6–12 digit angka",
                  value: newPin,
                  setValue: setNewPin,
                  minLength: 6,
                },
                {
                  id: "confirm-pin",
                  label: "Konfirmasi PIN baru",
                  placeholder: "Ulangi PIN baru",
                  value: confirmPin,
                  setValue: setConfirmPin,
                  minLength: 6,
                },
              ].map((field) => (
                <div key={field.id}>
                  <label
                    htmlFor={field.id}
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    {field.label}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id={field.id}
                      type={showPinFields ? "text" : "password"}
                      value={field.value}
                      onChange={(event) =>
                        field.setValue(event.target.value.slice(0, 12))
                      }
                      placeholder={field.placeholder}
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={12}
                      minLength={field.minLength}
                      required
                      autoFocus={field.id === "current-pin"}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-12 text-base tracking-[0.2em] text-slate-900 transition-all placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPinFields((visible) => !visible)}
                      aria-label={
                        showPinFields ? "Sembunyikan PIN" : "Tampilkan PIN"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                    >
                      {showPinFields ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {pinError && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
                >
                  {pinError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsPinModalOpen(false)}
                  disabled={isChangingPin}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:min-w-28"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isChangingPin}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70 sm:min-w-36"
                >
                  {isChangingPin && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isChangingPin ? "Menyimpan..." : "Simpan PIN"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {statusMessage && (
        <p
          role="status"
          className={`mb-4 rounded-xl border px-3 py-2 text-sm ${
            statusMessage.includes("gagal") || statusMessage.includes("Gagal")
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          {isSynchronizing ? "Menyinkronkan transaksi..." : statusMessage}
        </p>
      )}
      {storageError && (
        <p role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Penyimpanan offline browser gagal. Jangan lanjutkan transaksi offline sampai ruang penyimpanan tersedia.
        </p>
      )}

      {!cashSession ? (
        <OpenCashSessionForm
          openingCash={openingCash}
          online={isOnline}
          opening={isOpeningSession}
          onOpeningCashChange={setOpeningCash}
          onOpen={handleOpenSession}
        />
      ) : (
        <>
          <ActiveCashSessionBar
            openingCash={cashSession.openingCash}
            expectedCash={cashSession.expectedCash}
            pendingSales={pendingSales.length}
            online={isOnline}
            closing={isClosingSession}
            onClose={() => void handleCloseSession()}
          />

          <PosSalesWorkspace
            products={products}
            cart={cart}
            total={total}
            method={method}
            online={isOnline}
            showReceipt={showReceipt}
            receiptData={receiptData}
            onAddToCart={handleAddToCart}
            onUpdateQty={handleUpdateQty}
            onRemove={(id) =>
              setCart((current) => current.filter((item) => item.id !== id))
            }
            onSelectPayment={setMethod}
            onPay={handlePay}
            onCloseReceipt={handleCloseReceipt}
            onPrintReceipt={() => window.print()}
          />
        </>
      )}
    </div>
  );
}
