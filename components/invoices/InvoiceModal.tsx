"use client";

import { useState, useEffect } from "react";
import { X, Search, Plus, Minus, Trash } from "lucide-react";
import Swal from "sweetalert2";
import Image from "next/image";
import Button from "@/components/Button";

interface InvoiceItem {
  id: number;
  name: string;
  sku: string;
  price: number;
  qty: number;
  imageUrl?: string;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId?: number;
  locationId?: number;
  refNo?: string;
  salesman?: string;
  date?: string;
  termin?: number;
  dueDate?: string;
  notes?: string;
  tax?: { id: number; name: string; rate: number } | null;
  discount?: number;
  shipping?: number;
  items?: InvoiceItem[];
}

interface InvoiceModalProps {
  open: boolean;
  invoice?: Invoice | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InvoiceModal({
  open,
  invoice,
  onClose,
  onSuccess,
}: InvoiceModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [refNo, setRefNo] = useState("");
  const [salesman, setSalesman] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [termin, setTermin] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [tax, setTax] = useState<number | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [shipping, setShipping] = useState<number>(0);
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [showProductModal, setShowProductModal] = useState(false);

  // 🔹 Fetch data master
  useEffect(() => {
    if (open) {
      fetch("/api/customers")
        .then((r) => r.json())
        .then(setCustomers);
      fetch("/api/locations")
        .then((r) => r.json())
        .then(setLocations);
      fetch("/api/taxes")
        .then((r) => r.json())
        .then(setTaxes);
    }
  }, [open]);

  // 🔹 Fetch produk
  useEffect(() => {
    if (customerId && locationId) {
      fetch("/api/products")
        .then((r) => r.json())
        .then((data) => {
          setProducts(data);
          setFilteredProducts(data);
        });
    }
  }, [customerId, locationId]);

  // 🔹 Mode edit: ambil semua field dari invoice API
  useEffect(() => {
    if (invoice && open) {
      setInvoiceNumber(invoice.invoiceNumber || "");
      setCustomerId(invoice.customerId || null);
      setLocationId(invoice.locationId || null);
      setRefNo(invoice.refNo || "");
      setSalesman(invoice.salesman || "");
      setDate(invoice.date || new Date().toISOString().slice(0, 10));
      setTermin(invoice.termin || null);
      setDueDate(invoice.dueDate || "");
      setNotes(invoice.notes || "");
      setTax(invoice.tax?.rate ?? null);
      setDiscount(invoice.discount ?? 0);
      setShipping(invoice.shipping ?? 0);

      const mappedItems =
        invoice.items?.map((i: any) => ({
          id: i.product?.id ?? i.id,
          name: i.product?.name ?? i.name,
          sku: i.product?.sku ?? i.sku,
          price: i.price,
          qty: i.qty,
          imageUrl: i.product?.imageUrl ?? null,
        })) ?? [];
      setItems(mappedItems);
    }
  }, [invoice, open]);

  // 🔹 Auto-generate nomor faktur jika tambah baru
  useEffect(() => {
    if (open && !invoice && !invoiceNumber) {
      const now = new Date();
      setInvoiceNumber(
        `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
          2,
          "0"
        )}${String(now.getDate()).padStart(2, "0")}-${Date.now()}`
      );
    }
  }, [open, invoice, invoiceNumber]);

  // 🔹 Hitung jatuh tempo
  useEffect(() => {
    if (termin && termin > 0) {
      const d = new Date(date);
      d.setDate(d.getDate() + termin);
      setDueDate(d.toISOString().slice(0, 10));
    } else setDueDate("");
  }, [termin, date]);

  // 🔹 Hitung subtotal & total realtime
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const taxAmount = ((tax || 0) / 100) * subtotal;
  const total = subtotal + (shipping || 0) + taxAmount - (discount || 0);

  // 🔹 Handlers
  const handleAddProduct = (p: any) => {
    if (items.find((i) => i.id === p.id)) return;
    setItems([...items, { ...p, qty: 1 }]);
    setShowProductModal(false);
  };

  const handleSave = async () => {
    if (!customerId || !locationId)
      return Swal.fire("Gagal", "Pilih pelanggan dan gudang dulu", "error");

    const selectedTaxId = taxes.find((t) => t.rate === tax)?.id ?? null;

    const body = {
      customerId,
      locationId,
      dueDate,
      refNo,
      notes,
      discount,
      shipping,
      taxId: selectedTaxId,
      items: items.map((i) => ({
        productId: i.id,
        qty: i.qty,
        price: i.price,
      })),
    };

    const method = invoice ? "PUT" : "POST";
    const url = invoice ? `/api/invoices/${invoice.id}` : `/api/invoices`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) return Swal.fire("Gagal", "Gagal menyimpan faktur", "error");

    Swal.fire(
      "Berhasil",
      `Faktur berhasil ${invoice ? "diperbarui" : "dibuat"}`,
      "success"
    );
    onSuccess();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] overflow-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <h2 className="text-2xl font-bold mb-6">
          {invoice ? "Edit Faktur" : "Tambah Faktur Baru"}
        </h2>

        {/* Form */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="No Faktur"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
          />
          <input
            type="text"
            placeholder="No Ref"
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
          />
          <input
            type="text"
            placeholder="Salesman"
            value={salesman}
            onChange={(e) => setSalesman(e.target.value)}
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full text-gray-700"
          />
          <input
            type="number"
            placeholder="Termin (hari)"
            value={termin ?? ""}
            onChange={(e) => setTermin(Number(e.target.value))}
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
          />
          <input
            type="date"
            placeholder="Jatuh Tempo"
            value={dueDate}
            readOnly
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full text-gray-700"
          />
          <select
            value={customerId ?? ""}
            onChange={(e) => setCustomerId(Number(e.target.value))}
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
          >
            <option value="">Pilih Pelanggan</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={locationId ?? ""}
            onChange={(e) => setLocationId(Number(e.target.value))}
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
          >
            <option value="">Pilih Gudang</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        {/* Produk */}
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Produk</h3>
          <Button onClick={() => setShowProductModal(true)}>
            <Plus size={16} /> Tambah Produk
          </Button>
        </div>

        <div className="rounded-lg shadow-sm divide-y">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                {item.imageUrl && (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={60}
                    height={60}
                    className="rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.sku}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const newItems = [...items];
                    if (newItems[i].qty > 1) newItems[i].qty--;
                    setItems(newItems);
                  }}
                >
                  <Minus size={16} className="text-gray-600" />
                </button>

                <span className="px-2">{item.qty}</span>

                <button
                  onClick={() => {
                    const newItems = [...items];
                    newItems[i].qty++;
                    setItems(newItems);
                  }}
                >
                  <Plus size={16} className="text-gray-600" />
                </button>

                <span className="w-24 text-right">
                  Rp {(item.qty * item.price).toLocaleString()}
                </span>

                <button
                  onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                >
                  <Trash size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Pajak, Diskon, Ongkir */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          <select
            value={tax ?? ""}
            onChange={(e) => setTax(Number(e.target.value))}
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
          >
            <option value="">Pilih Pajak</option>
            {taxes.map((t) => (
              <option key={t.id} value={t.rate}>
                {t.name} ({t.rate}%)
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Diskon"
            value={discount === 0 ? "" : discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
          />

          <input
            type="number"
            placeholder="Ongkir"
            value={shipping === 0 ? "" : shipping}
            onChange={(e) => setShipping(Number(e.target.value))}
            className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full"
          />
        </div>

        <textarea
          placeholder="Catatan..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-xl px-4 py-2 shadow-sm focus:shadow-md outline-none transition w-full mt-4"
        />

        {/* Total & Button */}
        <div className="flex justify-between items-center mt-6 gap-2">
          <h3 className="text-xl font-semibold">
            Total: Rp {total.toLocaleString()}
          </h3>
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              {invoice ? "Update Faktur" : "Simpan Faktur"}
            </Button>
            <Button onClick={onClose} variant="secondary">
              Batal
            </Button>
          </div>
        </div>

        {/* Modal Produk */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70]">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 relative max-h-[80vh] overflow-y-auto">
              <button
                onClick={() => setShowProductModal(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-black"
              >
                <X size={20} />
              </button>
              <h3 className="text-lg font-semibold mb-4">Pilih Produk</h3>

              <div className="flex items-center gap-2 mb-4">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Cari nama produk atau SKU..."
                  className="flex-1 rounded-xl px-3 py-2 shadow-sm focus:shadow-md outline-none"
                  onChange={(e) => {
                    const q = e.target.value.toLowerCase();
                    setFilteredProducts(
                      products.filter(
                        (p) =>
                          p.name.toLowerCase().includes(q) ||
                          p.sku.toLowerCase().includes(q)
                      )
                    );
                  }}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleAddProduct(p)}
                    className="rounded-xl shadow-sm hover:shadow-md p-3 cursor-pointer transition"
                  >
                    {p.imageUrl && (
                      <Image
                        src={p.imageUrl}
                        alt={p.name}
                        width={200}
                        height={200}
                        className="h-24 w-full object-cover rounded-md mb-2"
                      />
                    )}
                    <h4 className="font-semibold text-sm">{p.name}</h4>
                    <p className="text-xs text-gray-500">SKU: {p.sku}</p>
                    <p className="text-xs text-gray-500">Stok: {p.stock}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
