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
import Button from "@/components/Button";

// Icon
import { ChevronDown } from "lucide-react";

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
  const [stockSnapshot, setStockSnapshot] = useState<number | null>(null);
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
    setStockSnapshot(null);
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
      if (form.isBundle) {
        payload.components = form.bundleComponents;
      } else if (isEditing && form.id && stockSnapshot !== null && form.stock === stockSnapshot) {
        // Jangan kirim stok lama saat edit jika user tidak mengubah field stok.
        // Ini mencegah stok yang sudah berubah (mis. karena penjualan) tertimpa
        // kembali ke nilai saat halaman dibuka.
      } else {
        payload.stock = form.stock;
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
      setStockSnapshot(null);
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
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "low_stock" | "out_of_stock">("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategoryFilter === "all" ||
      String(p.category?.id) === selectedCategoryFilter;

    let matchesStock = true;
    if (stockFilter === "in_stock") matchesStock = p.stock > 5;
    else if (stockFilter === "low_stock") matchesStock = p.stock > 0 && p.stock <= 5;
    else if (stockFilter === "out_of_stock") matchesStock = p.stock <= 0;

    return matchesSearch && matchesCategory && matchesStock;
  });

  // Metrik ringkasan
  const totalInventoryValue = products
    .filter((p) => !p.isBundle)
    .reduce((sum, p) => sum + Number(p.price) * p.stock, 0);
  const lowStockCount = products.filter(
    (p) => p.stock > 0 && p.stock <= 5
  ).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

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
    setStockSnapshot(product.stock);
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
    setStockSnapshot(product.stock);
    setIsEditing(true);
    setShowProductFormModal(true);
  }

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

    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        await Swal.fire(
          "Gagal",
          data?.error || "Gagal menghapus produk",
          "error"
        );
        return;
      }

      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      await Swal.fire("Terhapus!", "Produk berhasil dihapus", "success");
    } catch {
      await Swal.fire("Gagal", "Gagal menghapus produk", "error");
    }
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

      {/* Metric Mini Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-400 font-medium">Total Item</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{products.length}</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
          <span className="text-xs text-slate-400 font-medium">Nilai Inventaris</span>
          <p className="text-xl font-bold text-slate-900 mt-1 truncate">
            Rp {totalInventoryValue.toLocaleString("id-ID")}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
          <span className="text-xs text-amber-600 font-medium">Stok Menipis</span>
          <p className="text-xl font-bold text-amber-600 mt-1">{lowStockCount}</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
          <span className="text-xs text-rose-600 font-medium">Stok Habis</span>
          <p className="text-xl font-bold text-rose-600 mt-1">{outOfStockCount}</p>
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

            {/* Stock Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-slate-950 transition cursor-pointer"
            >
              <option value="all">Semua Status Stok</option>
              <option value="in_stock">Tersedia (&gt;5)</option>
              <option value="low_stock">Menipis (1-5)</option>
              <option value="out_of_stock">Habis (0)</option>
            </select>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Tabel
              </button>
            </div>
          </div>
        </div>
      </div>

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
              onConvertToBundle={() => openConvertToBundleForm(product)}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold border-b border-slate-200/80">
                <tr>
                  <th className="p-4">Produk</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Barcode</th>
                  <th className="p-4">Kategori</th>
                  <th className="p-4 text-center">Stok</th>
                  <th className="p-4 text-right">Harga</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= 5;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span>{product.name}</span>
                          {product.isBundle && (
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                              Bundle
                            </span>
                          )}
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
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditForm(product)}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                          >
                            Edit
                          </button>
                          {!product.isBundle && (
                            <button
                              type="button"
                              onClick={() => openConvertToBundleForm(product)}
                              className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition"
                            >
                              Ubah ke Bundle
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(product);
                              setShowBarcodeModal(true);
                            }}
                            className="p-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
                            title="Barcode"
                          >
                            Barcode
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteProduct(product)}
                            className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Hapus"
                          >
                            Hapus
                          </button>
                        </div>
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
                setStockSnapshot(null);
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
