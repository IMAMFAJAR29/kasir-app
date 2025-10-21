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
  // FILTER PRODUK BERDASARKAN SEARCH
  // =======================
  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
    <div className="p-4 pt-20">
      {/* Header */}
      <div className="w-full p-4 bg-white shadow rounded-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-800">Daftar Produk</h1>

          {/* Search bar */}
          <div className="flex-grow max-w-md w-full">
            <input
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Tombol tambah produk */}
          <div className="relative flex-none">
            <Button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2"
            >
              Tambah Produk
              <ChevronDown size={18} />
            </Button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-lg w-40 z-20">
                <button
                  onClick={handleAddManual}
                  className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 rounded-t-xl transition"
                >
                  Tambah Satuan
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(true);
                    setShowDropdown(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100 rounded-b-xl transition"
                >
                  Import Produk
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid produk */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Ya, hapus",
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

      {/* Modal Form Produk */}
      {showProductFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-xl">
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
