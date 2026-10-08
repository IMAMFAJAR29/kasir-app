"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { Plus } from "lucide-react";

import Button from "@/components/Button";
import InvoiceFormHeader from "./InvoiceFormHeader";
import InvoiceItemsList from "./InvoiceItemsList";
import InvoiceTotals from "./InvoiceTotals";
import ProductModal from "../shared/ProductModal";
import InvoiceNotes from "./InvoiceNotes";
import { Invoice, InvoiceItem } from "../../types/invoice";

//Tambahkan tipe props agar tidak error implicit any
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
  // =============================
  // State Master Data
  // =============================
  const [customers, setCustomers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);

  // =============================
  // State Form Invoice
  // =============================
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

  // =============================
  // State Modal Produk
  // =============================
  const [showProductModal, setShowProductModal] = useState(false);

  // =============================
  // Fetch master data (customers, locations, taxes)
  // =============================
  useEffect(() => {
    if (!open) return;

    fetch("/api/customers")
      .then((r) => r.json())
      .then(setCustomers);

    fetch("/api/locations")
      .then((r) => r.json())
      .then(setLocations);

    fetch("/api/taxes")
      .then((r) => r.json())
      .then(setTaxes);
  }, [open]);

  // =============================
  // Fetch produk hanya jika customer dan location dipilih
  // =============================
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

  // =============================
  // Mode Edit Faktur (isi ulang form)
  // =============================
  useEffect(() => {
    if (!invoice || !open) return;

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
  }, [invoice, open]);

  // =============================
  // Generate nomor faktur otomatis (jika tambah baru)
  // =============================
  useEffect(() => {
    if (!open || invoice || invoiceNumber) return;

    const now = new Date();
    setInvoiceNumber(
      `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}${String(now.getDate()).padStart(2, "0")}-${Date.now()}`
    );
  }, [open, invoice, invoiceNumber]);

  // =============================
  // Hitung due date otomatis berdasarkan termin
  // =============================
  useEffect(() => {
    if (termin && termin > 0) {
      const d = new Date(date);
      d.setDate(d.getDate() + termin);
      setDueDate(d.toISOString().slice(0, 10));
    } else {
      setDueDate("");
    }
  }, [termin, date]);

  // =============================
  // Hitung subtotal faktur
  // =============================
  const subtotal = items.reduce(
    (s, i) => s + (Number(i.qty) || 0) * (Number(i.price) || 0),
    0
  );

  // =============================
  // Handler produk
  // =============================
  const handleAddProduct = (p: any) => {
    if (items.find((i) => i.id === p.id)) return;
    setItems([...items, { ...p, qty: 1, price: p.price ?? 0 }]);
    setShowProductModal(false);
  };

  const handleUpdateQty = (index: number, qty: number) => {
    const newItems = [...items];
    newItems[index].qty = Number(qty) || 0;
    setItems(newItems);
  };

  const handleUpdatePrice = (index: number, price: number) => {
    const newItems = [...items];
    newItems[index].price = Number(price) || 0;
    setItems(newItems);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // =============================
  // Handler Simpan Faktur
  // =============================
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

  // =============================
  // Render Modal
  // =============================
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-3 backdrop-blur-sm sm:p-5">
      <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-6">
        <div className="mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {invoice ? "Edit Faktur" : "Tambah Faktur Baru"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Lengkapi informasi penjualan dan daftar produk.
          </p>
        </div>

        {/* Header Form */}
        <InvoiceFormHeader
          invoiceNumber={invoiceNumber}
          refNo={refNo}
          salesman={salesman}
          date={date}
          termin={termin}
          dueDate={dueDate}
          customerId={customerId}
          locationId={locationId}
          customers={customers}
          locations={locations}
          onChange={(field, value) => {
            switch (field) {
              case "invoiceNumber":
                setInvoiceNumber(value);
                break;
              case "refNo":
                setRefNo(value);
                break;
              case "salesman":
                setSalesman(value);
                break;
              case "date":
                setDate(value);
                break;
              case "termin":
                setTermin(value);
                break;
              case "dueDate":
                setDueDate(value);
                break;
              case "customerId":
                setCustomerId(value);
                break;
              case "locationId":
                setLocationId(value);
                break;
            }
          }}
        />

        {/* Daftar Produk */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">Daftar Produk</h3>
          <Button size="sm" onClick={() => setShowProductModal(true)}>
            <Plus size={16} /> Tambah Produk
          </Button>
        </div>

        <InvoiceItemsList
          items={items}
          onUpdateQty={handleUpdateQty}
          onUpdatePrice={handleUpdatePrice}
          onRemoveItem={handleRemoveItem}
        />

        {/* Ringkasan Faktur */}
        <InvoiceTotals
          subtotal={subtotal}
          tax={tax}
          discount={discount}
          shipping={shipping}
          taxes={taxes}
          onChangeTax={setTax}
          onChangeDiscount={setDiscount}
          onChangeShipping={setShipping}
        />

        {/* Catatan */}
        <InvoiceNotes notes={notes} onChange={setNotes} />

        {/* Tombol Aksi */}
        <div className="mt-6 flex flex-col-reverse items-stretch justify-end gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center">
          <Button onClick={handleSave}>
            {invoice ? "Update Faktur" : "Simpan Faktur"}
          </Button>
          <Button onClick={onClose} variant="secondary">
            Batal
          </Button>
        </div>

        {/* Modal Produk */}
        <ProductModal
          open={showProductModal}
          products={products}
          filteredProducts={filteredProducts}
          customerId={customerId}
          locationId={locationId}
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
