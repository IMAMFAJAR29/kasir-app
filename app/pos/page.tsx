"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { CloudOff, LogOut } from "lucide-react";
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
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <PosAccountBar
        name={cashierName}
        role={identity.role || "CASHIER"}
        online={isOnline}
        onLogout={() => void handleSignOut()}
      />

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
          onLogout={() => void handleSignOut()}
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
            onLogout={() => void handleSignOut()}
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
