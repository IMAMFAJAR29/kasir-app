"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Swal from "sweetalert2";
import readXlsxFile from "read-excel-file";
import { Edit, Trash2, X, Upload, FileSpreadsheet, Save } from "lucide-react";
import Button from "../../components/Button";

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    id: null,
    sku: "",
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    stock: "",
    categoryId: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  // Load products
  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
      setFilteredProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setProducts([]);
      setFilteredProducts([]);
    }
  }

  // Load categories
  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setCategories([]);
    }
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // Filter products
  useEffect(() => {
    if (!search) return setFilteredProducts(products);
    const lower = search.toLowerCase();
    setFilteredProducts(
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.description?.toLowerCase().includes(lower) ||
          p.category?.name?.toLowerCase().includes(lower)
      )
    );
  }, [search, products]);

  // Flatten categories for modal
  function flattenCategories(cats, prefix = "") {
    return cats.flatMap((c) => [
      { id: c.id, name: prefix ? `${prefix} > ${c.name}` : c.name },
      ...(c.children?.length > 0
        ? flattenCategories(
            c.children,
            prefix ? `${prefix} > ${c.name}` : c.name
          )
        : []),
    ]);
  }

  // Upload image
  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/products/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setForm({ ...form, imageUrl: data.url });
        Swal.fire("Sukses", "Gambar berhasil diupload", "success");
      } else throw new Error(data.error || "Upload gagal");
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setUploading(false);
    }
  }

  // Submit product
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.price || !form.categoryId) {
      Swal.fire("Warning", "Lengkapi form!", "warning");
      return;
    }
    try {
      const payload = {
        ...form,
        stock: Number(form.stock) || 0,
        sku: form.sku?.trim() || undefined,
      };
      const method = isEditing ? "PUT" : "POST";
      await fetch("/api/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      Swal.fire(
        "Sukses",
        `Produk ${isEditing ? "diperbarui" : "ditambahkan"}`,
        "success"
      );
      setForm({
        id: null,
        sku: "",
        name: "",
        description: "",
        imageUrl: "",
        price: "",
        stock: "",
        categoryId: "",
      });
      setIsEditing(false);
      loadProducts();
    } catch {
      Swal.fire("Error", "Gagal simpan produk", "error");
    }
  }

  // Edit product
  function handleEdit(p) {
    setForm({
      id: p.id,
      sku: p.sku || "",
      name: p.name,
      description: p.description || "",
      imageUrl: p.imageUrl || "",
      price: p.price,
      stock: p.stock || 0,
      categoryId: p.categoryId || "",
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Delete product
  async function handleDelete(id) {
    const confirm = await Swal.fire({
      title: "Yakin hapus produk?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Ya, hapus!",
      cancelButtonText: "Batal",
    });
    if (confirm.isConfirmed) {
      try {
        await fetch(`/api/products/${id}`, { method: "DELETE" });
        Swal.fire("Sukses", "Produk dihapus", "success");
        loadProducts();
      } catch {
        Swal.fire("Error", "Gagal hapus produk", "error");
      }
    }
  }

  // Import Excel
  async function handleImportSubmit() {
    if (!importFile) return Swal.fire("Oops", "Pilih file dulu", "warning");
    try {
      const rows = await readXlsxFile(importFile);
      const imported = rows.slice(1).map((r) => ({
        name: r[0],
        price: r[1],
        description: r[2] || "",
        imageUrl: r[3] || "",
        categoryId: r[4] || "",
      }));
      for (const p of imported) {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
      }
      Swal.fire("Sukses", "Import berhasil!", "success");
      setShowImportModal(false);
      setImportFile(null);
      loadProducts();
    } catch {
      Swal.fire("Error", "Gagal import produk", "error");
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Manajemen Produk</h1>

      {/* FORM */}
      <form
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        onSubmit={handleSubmit}
      >
        {/* Nama Produk */}
        <input
          type="text"
          placeholder="Nama Produk"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          required
        />

        {/* SKU Produk */}
        <input
          type="text"
          placeholder="SKU Produk"
          value={form.sku}
          onChange={(e) => setForm({ ...form, sku: e.target.value })}
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
        />

        {/* Stok */}
        <input
          type="number"
          placeholder="Stok"
          value={form.stock}
          onChange={(e) => setForm({ ...form, stock: e.target.value })}
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
        />

        {/* Harga */}
        <input
          type="number"
          placeholder="Harga"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          required
        />

        {/* Upload Image */}
        <div className="col-span-2 flex flex-col gap-2">
          <input
            type="text"
            placeholder="Atau paste URL gambar"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
          <input
            type="file"
            id="uploadImage"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
          <label htmlFor="uploadImage">
            <Button as="span" className="min-w-[160px]">
              {uploading ? (
                "Uploading..."
              ) : (
                <span className="flex items-center gap-2">
                  <Upload size={16} /> Upload Gambar
                </span>
              )}
            </Button>
          </label>
          {form.imageUrl && (
            <Image
              src={form.imageUrl}
              alt="Preview"
              width={120}
              height={120}
              className="rounded border"
            />
          )}
        </div>

        {/* Deskripsi */}
        <textarea
          placeholder="Deskripsi Produk"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="col-span-2 w-full bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          rows={4}
        />

        {/* Pilih Kategori */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kategori
          </label>
          <button
            type="button"
            onClick={() => setShowCategoryModal(true)}
            className="w-full text-left bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          >
            {form.categoryId
              ? flattenCategories(categories).find(
                  (c) => c.id === Number(form.categoryId)
                )?.name
              : "Pilih kategori..."}
          </button>
        </div>

        {/* Submit */}
        <div className="mt-4 col-span-2">
          <Button
            type="submit"
            className="flex items-center gap-2 min-w-[160px]"
          >
            <Save size={16} /> {isEditing ? "Update Produk" : "Tambah Produk"}
          </Button>
        </div>
      </form>

      {/* Search */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-1/2 bg-white border border-gray-300 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-shadow duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
        />

        <Button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-2 min-w-[160px]"
        >
          <Upload size={16} /> Import Produk
        </Button>
      </div>

      {/* Produk */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.length === 0 ? (
          <p className="text-gray-500 col-span-full">Produk tidak ditemukan</p>
        ) : (
          filteredProducts.map((p) => (
            <div
              key={p.id}
              className="rounded-lg shadow-md hover:shadow-lg transition bg-white flex flex-col overflow-hidden"
            >
              <div className="relative w-full h-48 bg-gray-50 flex items-center justify-center">
                <Image
                  src={p.imageUrl || "/no-image.png"}
                  alt={p.name}
                  fill
                  unoptimized
                  className="object-contain p-4"
                />
              </div>
              <div className="p-4 flex flex-col items-center text-center">
                <h3 className="font-semibold text-lg mb-2">{p.name}</h3>
                <p className="text-gray-900 font-bold text-base mb-3">
                  Rp {Number(p.price).toLocaleString("id-ID")}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleEdit(p)}
                    className="p-2 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-600"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 rounded-full bg-red-100 hover:bg-red-200 text-red-600"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Import */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-semibold mb-4">Import Produk</h2>
            <p className="text-sm text-gray-600 mb-4">
              Import menggunakan file <b>.xlsx</b>.
            </p>
            <a
              href="/templates/import-template.xlsx"
              download
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4"
            >
              <FileSpreadsheet size={16} /> Download Template
            </a>
            <label className="flex items-center gap-2 cursor-pointer bg-blue-50 border border-blue-300 text-blue-700 rounded-lg px-4 py-2 hover:bg-blue-100 mb-4 w-fit">
              <Upload size={16} /> Pilih file
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setImportFile(e.target.files[0])}
                className="hidden"
              />
            </label>
            {importFile && (
              <p className="text-sm text-gray-500 mb-4">
                File dipilih:{" "}
                <span className="font-medium">{importFile.name}</span>
              </p>
            )}
            <div className="flex justify-end">
              <button
                onClick={handleImportSubmit}
                className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pilih Kategori */}
      {showCategoryModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6 relative">
            <h3 className="text-lg font-semibold mb-4">Pilih Kategori</h3>
            <input
              type="text"
              placeholder="Cari kategori..."
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-600"
            />
            <div className="max-h-64 overflow-y-auto space-y-2 border-t border-b border-gray-200">
              {flattenCategories(categories)
                .filter((c) =>
                  c.name.toLowerCase().includes(categorySearch.toLowerCase())
                )
                .map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setForm({ ...form, categoryId: c.id });
                      setShowCategoryModal(false);
                    }}
                    className="cursor-pointer py-2 px-3 hover:bg-gray-50 rounded"
                  >
                    {c.name}
                  </div>
                ))}
            </div>
            <button
              onClick={() => setShowCategoryModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
