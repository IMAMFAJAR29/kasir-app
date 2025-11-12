"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PurchaseForm from "@/components/purchases/purchaseForm";
import PurchasePreview from "@/components/purchases/purchasePreview";
import ProductModal from "@/components/shared/ProductModal";

interface PurchaseModalProps {
  open: boolean;
  purchase?: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PurchaseModal({
  open,
  purchase,
  onClose,
  onSuccess,
}: PurchaseModalProps) {
  // =============================
  // State master data
  // =============================
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);

  // =============================
  // State form pembelian utama
  // =============================
  const [formState, setFormState] = useState<any>({
    purchaseNumber: "",
    supplierId: null,
    locationId: null,
    refNo: "",
    buyer: "",
    date: new Date().toISOString().slice(0, 10),
    termin: 0,
    dueDate: "",
    discount: 0,
    shipping: 0,
    notes: "",
    status: "unpaid",
    items: [],
  });

  const { supplierId, locationId } = formState;

  // Helper: update field form
  const updateField = (field: string, value: any) =>
    setFormState((prev: any) => ({ ...prev, [field]: value }));

  // =============================
  // Fetch data supplier & lokasi
  // =============================
  useEffect(() => {
    if (!open) return;

    fetch("/api/customers")
      .then((r) => r.json())
      .then(setSuppliers)
      .catch(() => setSuppliers([]));

    fetch("/api/locations")
      .then((r) => r.json())
      .then(setLocations)
      .catch(() => setLocations([]));
  }, [open]);

  // =============================
  // Fetch produk jika supplier & lokasi sudah dipilih
  // =============================
  useEffect(() => {
    if (supplierId && locationId) {
      fetch("/api/products")
        .then((r) => r.json())
        .then((data) => {
          setProducts(data);
          setFilteredProducts(data);
        })
        .catch(() => {
          setProducts([]);
          setFilteredProducts([]);
        });
    }
  }, [supplierId, locationId]);

  // =============================
  // Mode edit pembelian
  // =============================
  useEffect(() => {
    if (!purchase || !open) return;

    setFormState({
      purchaseNumber: purchase.purchaseNumber || "",
      supplierId: purchase.supplierId ?? null,
      locationId: purchase.locationId ?? null,
      refNo: purchase.refNo ?? "",
      buyer: purchase.buyer ?? "",
      date: purchase.date
        ? new Date(purchase.date).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      termin: purchase.termin ?? 0,
      dueDate: purchase.dueDate
        ? new Date(purchase.dueDate).toISOString().slice(0, 10)
        : "",
      discount: Number(purchase.discount) ?? 0,
      shipping: Number(purchase.shipping) ?? 0,
      notes: purchase.notes ?? "",
      status: purchase.status ?? "unpaid",
      items:
        purchase.items?.map((i: any) => ({
          id: i.product?.id ?? i.id,
          name: i.product?.name ?? i.name,
          sku: i.product?.sku ?? i.sku,
          qty: Number(i.qty),
          price: Number(i.price),
          subtotal: Number(i.qty) * Number(i.price),
        })) ?? [],
    });
  }, [purchase, open]);

  // =============================
  // Generate nomor pembelian otomatis
  // =============================
  useEffect(() => {
    if (!open || purchase || formState.purchaseNumber) return;
    const now = new Date();
    setFormState((prev: any) => ({
      ...prev,
      purchaseNumber: `PO-${now.getFullYear()}${String(
        now.getMonth() + 1
      ).padStart(2, "0")}${String(now.getDate()).padStart(
        2,
        "0"
      )}-${Date.now()}`,
    }));
  }, [open, purchase, formState.purchaseNumber]);

  // =============================
  // Hitung dueDate otomatis
  // =============================
  useEffect(() => {
    if (!formState.date) return;
    const base = new Date(formState.date);
    const due = new Date(base);
    due.setDate(base.getDate() + Number(formState.termin || 0));
    setFormState((prev: any) => ({
      ...prev,
      dueDate: due.toISOString().slice(0, 10),
    }));
  }, [formState.date, formState.termin]);

  // =============================
  // Handler produk
  // =============================
  const handleAddProduct = (p: any) => {
    if (formState.items.find((i: any) => i.id === p.id)) return;
    const newItem = {
      ...p,
      qty: 1,
      price: p.price ?? 0,
      subtotal: p.price ?? 0,
    };
    setFormState((prev: any) => ({
      ...prev,
      items: [...prev.items, newItem],
    }));
    setShowProductModal(false);
  };

  const handleUpdateQty = (id: number, qty: number) => {
    setFormState((prev: any) => ({
      ...prev,
      items: prev.items.map((i: any) =>
        i.id === id ? { ...i, qty, subtotal: qty * i.price } : i
      ),
    }));
  };

  const handleUpdatePrice = (id: number, price: number) => {
    setFormState((prev: any) => ({
      ...prev,
      items: prev.items.map((i: any) =>
        i.id === id ? { ...i, price, subtotal: i.qty * price } : i
      ),
    }));
  };

  const handleRemoveItem = (id: number) => {
    setFormState((prev: any) => ({
      ...prev,
      items: prev.items.filter((i: any) => i.id !== id),
    }));
  };

  // =============================
  // Simpan data pembelian
  // =============================
  const handleSave = async () => {
    if (!supplierId || !locationId)
      return Swal.fire("Gagal", "Pilih supplier dan gudang dulu", "error");

    const body = {
      ...formState,
      items: formState.items.map((i: any) => ({
        productId: i.id,
        qty: i.qty,
        price: i.price,
      })),
    };

    const method = purchase ? "PUT" : "POST";
    const url = purchase ? `/api/purchases/${purchase.id}` : `/api/purchases`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok)
      return Swal.fire("Gagal", "Gagal menyimpan pembelian", "error");

    Swal.fire(
      "Berhasil",
      `Pembelian berhasil ${purchase ? "diperbarui" : "dibuat"}`,
      "success"
    );

    onSuccess();
    onClose();
  };

  // =============================
  // Modal Produk
  // =============================
  const [showProductModal, setShowProductModal] = useState(false);

  // =============================
  // Render
  // =============================
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl p-6 relative max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">
          {purchase ? "Edit Pembelian" : "Tambah Pembelian Baru"}
        </h2>

        {/* Bagian Form Header */}
        <div className="mb-6">
          <PurchaseForm
            formState={formState}
            updateField={updateField}
            customers={suppliers}
            locations={locations}
          />
        </div>

        {/* Bagian Daftar Produk */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Daftar Produk</h3>
          <Button
            onClick={() => setShowProductModal(true)}
            className="bg-black text-white hover:bg-gray-800"
          >
            <Plus size={16} /> Tambah Produk
          </Button>
        </div>

        <PurchasePreview
          items={formState.items}
          removeItem={handleRemoveItem}
          updateQty={handleUpdateQty}
          updatePrice={handleUpdatePrice}
        />

        {/* Tombol Aksi */}
        <div className="flex justify-end gap-2 mt-6">
          <Button onClick={handleSave}>
            {purchase ? "Update Pembelian" : "Simpan Pembelian"}
          </Button>
          <Button onClick={onClose} variant="outline">
            Batal
          </Button>
        </div>

        {/* Modal Produk */}
        <ProductModal
          open={showProductModal}
          products={products}
          filteredProducts={filteredProducts}
          customerId={formState.supplierId} // ✅ ambil dari formState
          locationId={formState.locationId} // ✅ ambil dari formState
          onAddProduct={handleAddProduct}
          onClose={() => setShowProductModal(false)}
          onSearch={(q) =>
            setFilteredProducts(
              products.filter(
                (p) =>
                  p.name.toLowerCase().includes(q.toLowerCase()) ||
                  p.sku.toLowerCase().includes(q.toLowerCase())
              )
            )
          }
        />
      </div>
    </div>
  );
}
