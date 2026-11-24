"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Swal from "sweetalert2";
import {
  ArrowRight,
  Loader2,
  LogOut,
  MonitorPlay,
  Store,
} from "lucide-react";
import BrandLoader from "@/components/BrandLoader";
import Button from "@/components/Button";
import { Badge } from "@/components/ui/badge";
import OutletPicker, {
  type OutletOption,
} from "@/components/pos/back-office/OutletPicker";
import RegisterList, {
  type RegisterSummary,
} from "@/components/pos/back-office/RegisterList";
import RegisterActivity from "@/components/pos/back-office/RegisterActivity";

const STORAGE_KEY = "anima-pos:last-register";

export default function CashierBackOfficePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [outlets, setOutlets] = useState<OutletOption[]>([]);
  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(null);
  const [registers, setRegisters] = useState<RegisterSummary[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState<number | null>(
    null
  );
  const [loadingOutlets, setLoadingOutlets] = useState(true);
  const [loadingRegisters, setLoadingRegisters] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  const selectedRegister = useMemo(
    () => registers.find((register) => register.id === selectedRegisterId) ?? null,
    [registers, selectedRegisterId]
  );

  const loadOutlets = useCallback(async () => {
    setError("");
    setLoadingOutlets(true);
    try {
      const response = await fetch("/api/locations");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal memuat outlet.");
      }
      const activeOutlets: OutletOption[] = Array.isArray(body) ? body : [];
      setOutlets(activeOutlets);
      setSelectedOutletId((current) => {
        if (current !== null) return current;
        let remembered: number | null = null;
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const parsed = Number(JSON.parse(saved)?.locationId);
            if (Number.isSafeInteger(parsed) && parsed > 0) remembered = parsed;
          }
        } catch {
          remembered = null;
        }
        const preferred =
          remembered !== null &&
          activeOutlets.some((outlet) => outlet.id === remembered)
            ? remembered
            : null;
        return preferred ?? activeOutlets.find((outlet) => outlet.isActive)?.id ?? null;
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Gagal memuat outlet."
      );
    } finally {
      setLoadingOutlets(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void loadOutlets();
    }
  }, [loadOutlets, status]);

  const loadRegisters = useCallback(async (outletId: number) => {
    setLoadingRegisters(true);
    setError("");
    try {
      const response = await fetch(`/api/pos-registers?locationId=${outletId}`);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal memuat mesin kasir.");
      }
      setRegisters(Array.isArray(body) ? body : []);
    } catch (loadError) {
      setRegisters([]);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Gagal memuat mesin kasir."
      );
    } finally {
      setLoadingRegisters(false);
    }
  }, []);

  useEffect(() => {
    if (selectedOutletId === null) {
      setRegisters([]);
      setSelectedRegisterId(null);
      return;
    }
    setSelectedRegisterId(null);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ locationId: selectedOutletId })
      );
    } catch {
      // Penyimpanan perangkat opsional; abaikan bila tidak tersedia.
    }
    void loadRegisters(selectedOutletId);
  }, [loadRegisters, selectedOutletId]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
    } finally {
      window.location.assign(`${window.location.origin}/auth`);
    }
  };

  const handleOpenRegister = async () => {
    if (!selectedRegister) return;

    const activeSession = selectedRegister.activeSession;
    if (activeSession) {
      if (activeSession.cashier.id !== session?.user?.id) {
        await Swal.fire(
          "Mesin sedang dipakai",
          `Mesin ini sedang digunakan oleh ${activeSession.cashier.name}.`,
          "warning"
        );
        return;
      }
      router.push(`/pos?registerId=${selectedRegister.id}`);
      return;
    }

    const result = await Swal.fire({
      title: `Buka kasir ${selectedRegister.name}`,
      html: `<p style="margin:0 0 .5rem;font-size:.875rem;color:#475569">Masukkan modal awal laci kas untuk shift ini.</p>`,
      input: "number",
      inputAttributes: { min: "0", step: "1", inputmode: "numeric" },
      inputPlaceholder: "Modal awal (Rp)",
      showCancelButton: true,
      confirmButtonText: "Buka Kasir",
      cancelButtonText: "Batal",
      confirmButtonColor: "#1769e0",
      inputValidator: (value) => {
        const amount = Number(value);
        if (value === "" || !Number.isFinite(amount) || amount < 0) {
          return "Masukkan nominal modal awal yang valid.";
        }
        return undefined;
      },
    });
    if (!result.isConfirmed) return;

    setOpening(true);
    try {
      const response = await fetch("/api/cash-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingCash: Number(result.value),
          registerId: selectedRegister.id,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Gagal membuka kasir.");
      }
      router.push(`/pos?registerId=${selectedRegister.id}`);
    } catch (openError) {
      await Swal.fire(
        "Kasir belum dibuka",
        openError instanceof Error ? openError.message : "Terjadi kesalahan.",
        "error"
      );
      if (selectedOutletId !== null) {
        void loadRegisters(selectedOutletId);
      }
    } finally {
      setOpening(false);
    }
  };

  if (status === "loading" || loadingOutlets) {
    return <BrandLoader label="Memuat Cashier Back Office..." />;
  }

  const selectedOutlet = outlets.find(
    (outlet) => outlet.id === selectedOutletId
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:space-y-5 sm:px-6 sm:py-6">
      <header className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-brand-navy sm:text-xl">
                Cashier Back Office
              </h1>
              <p className="text-xs text-slate-500">
                {session?.user?.name || "Kasir"} ·{" "}
                {session?.user?.role === "ADMIN" ? "Administrator" : "Kasir POS"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 sm:self-auto"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
        >
          {error}
        </p>
      )}

      <OutletPicker
        outlets={outlets}
        selectedId={selectedOutletId}
        onSelect={setSelectedOutletId}
      />

      {selectedOutletId !== null && (
        <RegisterList
          registers={registers}
          selectedId={selectedRegisterId}
          loading={loadingRegisters}
          currentUserId={session?.user?.id}
          onSelect={(register) => setSelectedRegisterId(register.id)}
        />
      )}

      {selectedRegister && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm sm:p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <MonitorPlay className="h-4 w-4 text-blue-600" />
              3. Buka kasir
            </h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Outlet</dt>
                <dd className="font-semibold text-slate-900">
                  {selectedOutlet?.name ?? selectedRegister.location.name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Mesin kasir</dt>
                <dd className="font-semibold text-slate-900">
                  {selectedRegister.name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Gudang stok</dt>
                <dd className="font-semibold text-slate-900">
                  {selectedRegister.warehouse.name}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Status</dt>
                <dd>
                  {selectedRegister.activeSession ? (
                    <Badge
                      variant={
                        selectedRegister.activeSession.cashier.id ===
                        session?.user?.id
                          ? "success"
                          : "warning"
                      }
                      withDot
                    >
                      {selectedRegister.activeSession.cashier.id ===
                      session?.user?.id
                        ? "Shift Anda aktif"
                        : `Dipakai ${selectedRegister.activeSession.cashier.name}`}
                    </Badge>
                  ) : (
                    <Badge variant="success" withDot>
                      Siap digunakan
                    </Badge>
                  )}
                </dd>
              </div>
            </dl>

            <Button
              type="button"
              onClick={() => void handleOpenRegister()}
              disabled={
                opening ||
                !selectedRegister.isActive ||
                (selectedRegister.activeSession !== null &&
                  selectedRegister.activeSession.cashier.id !==
                    session?.user?.id)
              }
              className="mt-4 w-full"
            >
              {opening ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Membuka kasir...
                </>
              ) : (
                <>
                  {selectedRegister.activeSession
                    ? "Lanjutkan ke Kasir"
                    : "Buka Kasir"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            {selectedRegister.activeSession && (
              <p className="mt-2 text-center text-xs text-slate-500">
                Shift sudah aktif. Lanjutkan tanpa mengisi modal awal lagi.
              </p>
            )}
          </section>

          <RegisterActivity registerId={selectedRegister.id} />
        </div>
      )}
    </div>
  );
}
