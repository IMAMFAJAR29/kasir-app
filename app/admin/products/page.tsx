"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";

// Komponen
import ProductForm from "@/components/products/ProductForm";
import ProductCard from "@/components/products/ProductCard";
import ImportModal, {
  type ImportResult,
} from "@/components/products/ImportModal";
import CategoryModal from "@/components/products/CategoryModal";
import BarcodeModal from "@/components/products/BarcodeModal";
import ProductBulkToolbar from "@/components/products/ProductBulkToolbar";
import Button from "@/components/Button";

// Icon
import {
  ChevronDown,
  LayoutGrid,
  Table2,
  Package,
} from "lucide-react";
import Image from "next/image";

// Tipe data
import { ProductWithCategory, Category, FormProduct } from "@/types/products";

export default function ProductsPage() {
  // =======================
  // STATE UTAMA
  // =======================
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // State form produk
  const [form, setForm] = useState<FormProduct>({
    id: undefined,
    name: "",
    sku: "",
    barcode: "",
    stock: 0,
    price: 0,
    costPrice: 0,
    imageUrl: "",
    description: "",
    categoryId: undefined,
    isBundle: false,
    bundleComponents: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // State modal
  const [showProductFormModal, setShowProductFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithCategory | null>(null);

  // =======================
  // FETCH DATA PRODUK & KATEGORI
  // =======================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
        ]);

        if (!prodRes.ok || !catRes.ok) throw new Error("Gagal memuat data");

        const productsData: ProductWithCategory[] = await prodRes.json();
        const categoriesData: Category[] = await catRes.json();

        setProducts(productsData);
        setCategories(categoriesData);
      } catch {
        Swal.fire("Error", "Gagal memuat produk atau kategori", "error");
      }
    };

    fetchData();
  }, []);

  // =======================
  // TAMBAH PRODUK MANUAL
  // =======================
  const handleAddManual = (isBundle: boolean) => {
    setForm({
      id: undefined,
      name: "",
      sku: "",
      barcode: "",
      stock: 0,
      price: 0,
      costPrice: 0,
      imageUrl: "",
      description: "",
      categoryId: undefined,
      isBundle,
      bundleComponents: [],
    });
    setIsEditing(false);
    setShowProductFormModal(true);
    setShowDropdown(false);
  };

  // =======================
  // IMPORT PRODUK DARI FILE
  // =======================
  const handleImport = async (file: File): Promise<ImportResult> => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        return {
          success: false,
          message: data?.error || "Gagal import produk",
          details: Array.isArray(data?.details)
            ? data.details.map(
                (detail: { row?: number; message?: string }) =>
                  detail?.row
                    ? `Baris ${detail.row}: ${detail.message ?? "tidak valid"}`
                    : detail?.message ?? "Baris tidak valid"
              )
            : [],
          totalErrors:
            typeof data?.totalErrors === "number"
              ? data.totalErrors
              : undefined,
        };
      }

      const importedProducts: ProductWithCategory[] = Array.isArray(
        data?.imported
      )
        ? data.imported
        : [];

      setProducts((prev) => [...importedProducts, ...prev]);
      void Swal.fire(
        "Berhasil",
        `${data?.count ?? importedProducts.length} produk berhasil diimport`,
        "success"
      );
      return { success: true };
    } catch {
      return {
        success: false,
        message: "Gagal import produk",
      };
    }
  };

  // =======================
  // UPLOAD GAMBAR PRODUK
  // =======================
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/products/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload gagal");

      const data = await res.json();
      setForm((prev) => ({ ...prev, imageUrl: data.url }));
    } catch {
      Swal.fire("Error", "Upload gambar gagal", "error");
    } finally {
      setUploading(false);
    }
  };

  // =======================
  // SIMPAN PRODUK (TAMBAH / EDIT)
  // =======================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.isBundle && form.bundleComponents.length === 0) {
      Swal.fire(
        "Komposisi kosong",
        "Produk bundle minimal punya satu komponen.",
        "warning"
      );
      return;
    }

    if (form.isBundle && form.bundleComponents.length > 100) {
      Swal.fire(
        "Komposisi terlalu banyak",
        "Komposisi bundle maksimal 100 komponen.",
        "warning"
      );
      return;
    }

    try {
      let res;
      let result: ProductWithCategory;
      const payload: Record<string, unknown> = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode,
        price: form.price,
        costPrice: form.costPrice,
        imageUrl: form.imageUrl,
        description: form.description,
        categoryId: form.categoryId ?? null,
        isBundle: form.isBundle,
      };
      // Stok tidak lagi dikirim dari Katalog. Pengelolaan stok berada di
      // modul Persediaan (penyesuaian, penerimaan, transfer).
      if (form.isBundle) {
        payload.components = form.bundleComponents;
      }

      // Update
      if (isEditing && form.id) {
        res = await fetch(`/api/products/${form.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Gagal update produk");
        }
        result = await res.json();

        setProducts((prev) =>
          prev.map((p) => (p.id === result.id ? result : p))
        );
        Swal.fire("Sukses", "Produk berhasil diupdate", "success");
      } else {
        // Tambah baru
        res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Gagal tambah produk");
        }
        result = await res.json();

        setProducts((prev) => [result, ...prev]);
        Swal.fire("Sukses", "Produk berhasil ditambahkan", "success");
      }

      setShowProductFormModal(false);
    } catch (error) {
      Swal.fire(
        "Error",
        error instanceof Error ? error.message : "Gagal menyimpan produk",
        "error"
      );
    }
  };

  // =======================
  // FLATTEN KATEGORI (UNTUK DROPDOWN)
  // =======================
  function flattenCategories(
    cats: Category[],
    prefix = "",
    depth = 0
  ): Category[] {
    return cats.flatMap((c) => [
      { ...c, name: prefix ? `${prefix} > ${c.name}` : c.name, depth },
      ...(c.children?.length
        ? flattenCategories(
            c.children,
            prefix ? `${prefix} > ${c.name}` : c.name,
            depth + 1
          )
        : []),
    ]);
  }

  // =======================
  // FILTER PRODUK
  // =======================
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategoryFilter === "all" ||
      String(p.category?.id) === selectedCategoryFilter;

    return matchesSearch && matchesCategory;
  });

  // =======================
  // SELEKSI PRODUK (TABLE VIEW)
  // =======================
  const selectedProducts = products.filter((p) => selectedIds.includes(p.id));
  const selectedCount = selectedProducts.length;

  const allFilteredSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.includes(p.id));
  const someFilteredSelected =
    !allFilteredSelected &&
    filteredProducts.some((p) => selectedIds.includes(p.id));

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const filteredIds = filteredProducts.map((p) => p.id);
    setSelectedIds((prev) => {
      if (allFilteredSelected) {
        return prev.filter((id) => !filteredIds.includes(id));
      }
      return Array.from(new Set([...prev, ...filteredIds]));
    });
  };

  /** Aksi tunggal: tolak jika lebih dari satu produk dipilih. */
  const requireSingleSelection = async (): Promise<ProductWithCategory | null> => {
    if (selectedCount > 1) {
      await Swal.fire(
        "Pilih satu produk",
        "Aksi ini hanya dapat dijalankan untuk satu produk. Kurangi pilihan terlebih dahulu.",
        "info"
      );
      return null;
    }
    return selectedProducts[0] ?? null;
  };

  const handleBulkEdit = async () => {
    const product = await requireSingleSelection();
    if (product) openEditForm(product);
  };

  const handleBulkBarcode = async () => {
    const product = await requireSingleSelection();
    if (!product) return;
    setSelectedProduct(product);
    setShowBarcodeModal(true);
  };

  const handleBulkBundle = async () => {
    const product = await requireSingleSelection();
    if (product) openConvertToBundleForm(product);
  };

  // Metrik stok & nilai inventaris sengaja tidak ditampilkan di sini.
  // Informasi tersebut berada di modulnya masing-masing:
  // - Stok: Gudang → Stok Gudang
  // - Nilai persediaan: Akuntansi → Laporan Keuangan → Neraca

  // =======================
  // MAPPING PRODUK → FORM
  // =======================
  function mapProductToForm(p: ProductWithCategory): FormProduct {
    return {
      id: p.id,
      name: p.name,
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
      stock: p.stock,
      price: p.price,
      costPrice: Number(p.costPrice ?? 0),
      imageUrl: p.imageUrl ?? "",
      description: p.description ?? "",
      categoryId: p.category?.id ?? undefined,
      isBundle: Boolean(p.isBundle),
      bundleComponents: p.bundleComponents ?? [],
    };
  }

  function openEditForm(product: ProductWithCategory) {
    setForm(mapProductToForm(product));
    setIsEditing(true);
    setShowProductFormModal(true);
  }

  /**
   * Ubah jenis produk satuan menjadi bundle. Server memvalidasi riwayat
   * transaksi (bukan stok); stok bundle langsung mengikuti komposisi.
   */
  function openConvertToBundleForm(product: ProductWithCategory) {
    if (product.isBundle) {
      openEditForm(product);
      return;
    }
    setForm({
      ...mapProductToForm(product),
      isBundle: true,
      bundleComponents: [],
    });
    setIsEditing(true);
    setShowProductFormModal(true);
  }

  /**
   * Hapus satu produk tanpa konfirmasi. Dipakai ulang oleh aksi per kartu
   * (grid) dan bulk delete agar business logic tetap satu jalur.
   */
  const deleteProduct = async (
    product: ProductWithCategory
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        return { ok: false, error: data?.error || "Gagal menghapus produk" };
      }

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      setSelectedIds((prev) => prev.filter((id) => id !== product.id));
      return { ok: true };
    } catch {
      return { ok: false, error: "Gagal menghapus produk" };
    }
  };

  const handleDeleteProduct = async (product: ProductWithCategory) => {
    const confirm = await Swal.fire({
      title: "Hapus produk?",
      text: `Produk "${product.name}" akan dihapus permanen`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!confirm.isConfirmed) return;

    const result = await deleteProduct(product);
    if (result.ok) {
      await Swal.fire("Terhapus!", "Produk berhasil dihapus", "success");
    } else {
      await Swal.fire(
        "Gagal",
        result.error || "Gagal menghapus produk",
        "error"
      );
    }
  };

  const handleBulkDelete = async (items: ProductWithCategory[]) => {
    if (items.length === 0) return;

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const preview = items
      .slice(0, 5)
      .map((product) => `• ${escapeHtml(product.name)}`)
      .join("<br/>");
    const more =
      items.length > 5
        ? `<br/>… dan ${items.length - 5} produk lain`
        : "";

    const confirm = await Swal.fire({
      title: `Hapus ${items.length} produk?`,
      html: `<div style="text-align:left;font-size:13px;color:#475569;max-height:220px;overflow:auto">${preview}${more}</div>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });
    if (!confirm.isConfirmed) return;

    setBulkDeleting(true);
    const failures: string[] = [];
    let deleted = 0;
    for (const product of items) {
      const result = await deleteProduct(product);
      if (result.ok) {
        deleted += 1;
      } else {
        failures.push(`${product.name}: ${result.error}`);
      }
    }
    setBulkDeleting(false);

    if (failures.length === 0) {
      await Swal.fire(
        "Terhapus!",
        `${deleted} produk berhasil dihapus`,
        "success"
      );
      return;
    }

    await Swal.fire({
      icon: "warning",
      title: `${deleted} terhapus, ${failures.length} gagal`,
      html: `<div style="text-align:left;font-size:12px;max-height:240px;overflow:auto">${failures
        .slice(0, 10)
        .map((failure) => `• ${escapeHtml(failure)}`)
        .join("<br/>")}</div>`,
    });
  };

  // =======================
  // RENDER
  // =======================
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-8 xl:px-10 space-y-6">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Katalog Produk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola data barang, harga jual, barcode, dan stok inventaris
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              <span>+ Tambah Produk</span>
              <ChevronDown size={16} />
            </Button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl w-56 z-30 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={() => handleAddManual(false)}
                  className="block w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition cursor-pointer font-medium"
                >
                  Produk Satuan
                </button>
                <button
                  onClick={() => handleAddManual(true)}
                  className="block w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition cursor-pointer font-medium"
                >
                  Produk Bundle
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(true);
                    setShowDropdown(false);
                  }}
                  className="block w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition cursor-pointer font-medium"
                >
                  Import File Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar Filter & Search */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Cari nama produk / SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-950 transition cursor-pointer"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* View Mode Switcher */}
            <div
              className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200"
              role="group"
              aria-label="Mode tampilan produk"
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Tampilan Grid"
                aria-label="Tampilan Grid"
                aria-pressed={viewMode === "grid"}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                title="Tampilan Tabel"
                aria-label="Tampilan Tabel"
                aria-pressed={viewMode === "table"}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Table2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar — hanya muncul saat ada produk dipilih */}
      {selectedCount > 0 && (
        <ProductBulkToolbar
          count={selectedCount}
          deleting={bulkDeleting}
          onClear={() => setSelectedIds([])}
          onEdit={() => void handleBulkEdit()}
          onBarcode={() => void handleBulkBarcode()}
          onBundle={() => void handleBulkBundle()}
          onDelete={() => void handleBulkDelete(selectedProducts)}
        />
      )}

      {/* Grid atau Table Produk */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={() => openEditForm(product)}
              onPrintBarcode={() => {
                setSelectedProduct(product);
                setShowBarcodeModal(true);
              }}
              onDelete={() => void handleDeleteProduct(product)}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="w-12 p-4">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua produk yang tampil"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      ref={(element) => {
                        if (element) element.indeterminate = someFilteredSelected;
                      }}
                      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="p-4">Produk</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Barcode</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4 text-center">Stok</th>
                  <th className="p-4 text-right">Harga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= 5;
                  const isSelected = selectedIds.includes(product.id);

                  return (
                    <tr
                      key={product.id}
                      className={`transition hover:bg-slate-50/70 ${
                        isSelected ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <td className="p-4 align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(product.id)}
                          aria-label={`Pilih ${product.name}`}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            {product.imageUrl ? (
                              <Image
                                src={product.imageUrl}
                                alt=""
                                width={40}
                                height={40}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-4 w-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold text-slate-900">
                                {product.name}
                              </span>
                              {product.isBundle && (
                                <span className="inline-flex shrink-0 items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                                  Bundle
                                </span>
                              )}
                            </div>
                            {product.isBundle &&
                              product.bundleComponents?.length ? (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {product.bundleComponents.length} komponen
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-500">
                        {product.sku || "-"}
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-500">
                        {product.barcode || "-"}
                      </td>
                      <td className="p-4 text-slate-600">
                        {product.category?.name || "-"}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            isOutOfStock
                              ? "bg-rose-50 text-rose-700"
                              : isLowStock
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-900">
                        Rp {Number(product.price).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <p className="font-semibold text-slate-700">Tidak ada produk yang cocok</p>
          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci atau filter Anda</p>
        </div>
      )}

      {/* Modal Form Produk */}
      {showProductFormModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <ProductForm
              form={form}
              setForm={setForm}
              isEditing={isEditing}
              uploading={uploading}
              handleFileChange={handleFileChange}
              handleSubmit={handleSubmit}
              categories={categories}
              flattenCategories={flattenCategories}
              setShowCategoryModal={setShowCategoryModal}
              products={products}
              onConvertToBundle={() =>
                setForm((prev) => ({
                  ...prev,
                  isBundle: true,
                  bundleComponents: [],
                }))
              }
              onClose={() => {
                setShowProductFormModal(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal Import Produk */}
      <ImportModal
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      {/* Modal Kategori */}
      <CategoryModal
        show={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categories}
        onSelect={(id) => setForm({ ...form, categoryId: id })}
        categorySearch={categorySearch}
        setCategorySearch={setCategorySearch}
        flattenCategories={flattenCategories}
      />

      {/* Modal Barcode */}
      <BarcodeModal
        show={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        product={selectedProduct}
        onPrint={(id) => {
          window.open(`/api/reports/barcode/${id}`, "_blank");
          setShowBarcodeModal(false);
        }}
      />
    </div>
  );
}
