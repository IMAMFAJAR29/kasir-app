"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";

// Komponen
import ProductForm from "@/components/products/ProductForm";
import ProductCard from "@/components/products/ProductCard";
import ImportModal from "@/components/products/ImportModal";
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
    stock: 0,
    price: 0,
    imageUrl: "",
    description: "",
    categoryId: undefined,
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
  const handleAddManual = () => {
    setForm({
      id: undefined,
      name: "",
      sku: "",
      stock: 0,
      price: 0,
      imageUrl: "",
      description: "",
      categoryId: undefined,
    });
    setIsEditing(false);
    setShowProductFormModal(true);
    setShowDropdown(false);
  };

  // =======================
  // IMPORT PRODUK DARI FILE
  // =======================
  const handleImport = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Gagal import produk");
      const imported = await res.json();

      setProducts((prev) => [...imported, ...prev]);
      Swal.fire("Berhasil", "Produk berhasil diimport", "success");
      setShowImportModal(false);
    } catch {
      Swal.fire("Error", "Gagal import produk", "error");
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

    try {
      let res;
      let result: ProductWithCategory;

      // Update
      if (isEditing && form.id) {
        res = await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Gagal update produk");
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
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error("Gagal tambah produk");
        result = await res.json();

        setProducts((prev) => [result, ...prev]);
        Swal.fire("Sukses", "Produk berhasil ditambahkan", "success");
      }

      setShowProductFormModal(false);
    } catch {
      Swal.fire("Error", "Gagal menyimpan produk", "error");
    }
  };

  // =======================
  // FLATTEN KATEGORI (UNTUK DROPDOWN)
  // =======================
  function flattenCategories(cats: Category[], prefix = ""): Category[] {
    return cats.flatMap((c) => [
      { ...c, name: prefix ? `${prefix} > ${c.name}` : c.name },
      ...(c.children?.length
        ? flattenCategories(
            c.children,
            prefix ? `${prefix} > ${c.name}` : c.name
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
  const totalInventoryValue = products.reduce(
    (sum, p) => sum + Number(p.price) * p.stock,
    0
  );
  const lowStockCount = products.filter((p) => p.stock > 0 && p.stock <= 5).length;
  const outOfStockCount = products.filter((p) => p.stock <= 0).length;

  // =======================
  // MAPPING PRODUK → FORM
  // =======================
  function mapProductToForm(p: ProductWithCategory): FormProduct {
    return {
      id: p.id,
      name: p.name,
      sku: p.sku ?? "",
      stock: p.stock,
      price: p.price,
      imageUrl: p.imageUrl ?? "",
      description: p.description ?? "",
      categoryId: p.category?.id ?? undefined,
    };
  }

  // =======================
  // RENDER
  // =======================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
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
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
            >
              <span>+ Tambah Produk</span>
              <ChevronDown size={16} />
            </Button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl w-48 z-30 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <button
                  onClick={handleAddManual}
                  className="block w-full text-left px-3.5 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition cursor-pointer font-medium"
                >
                  Input Satuan
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
              onEdit={() => {
                setForm(mapProductToForm(product));
                setIsEditing(true);
                setShowProductFormModal(true);
              }}
              onPrintBarcode={() => {
                setSelectedProduct(product);
                setShowBarcodeModal(true);
              }}
              onDelete={async () => {
                const confirm = await Swal.fire({
                  title: "Hapus produk?",
                  text: `Produk "${product.name}" akan dihapus permanen`,
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "Ya, hapus",
                  cancelButtonText: "Batal",
                  confirmButtonColor: "#e11d48",
                });
                if (confirm.isConfirmed) {
                  await fetch(`/api/products/${product.id}`, {
                    method: "DELETE",
                  });
                  setProducts((prev) => prev.filter((p) => p.id !== product.id));
                  Swal.fire("Terhapus!", "Produk berhasil dihapus", "success");
                }
              }}
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
                        {product.name}
                      </td>
                      <td className="p-4 text-xs font-mono text-slate-500">
                        {product.sku || "-"}
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
                            onClick={() => {
                              setForm(mapProductToForm(product));
                              setIsEditing(true);
                              setShowProductFormModal(true);
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg transition"
                          >
                            Edit
                          </button>
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
                            onClick={async () => {
                              const confirm = await Swal.fire({
                                title: "Hapus produk?",
                                icon: "warning",
                                showCancelButton: true,
                                confirmButtonText: "Ya, hapus",
                                cancelButtonText: "Batal",
                                confirmButtonColor: "#e11d48",
                              });
                              if (confirm.isConfirmed) {
                                await fetch(`/api/products/${product.id}`, {
                                  method: "DELETE",
                                });
                                setProducts((prev) =>
                                  prev.filter((p) => p.id !== product.id)
                                );
                                Swal.fire("Terhapus!", "Produk berhasil dihapus", "success");
                              }
                            }}
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
              onClose={() => setShowProductFormModal(false)}
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
