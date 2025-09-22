"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Swal from "sweetalert2";
import readXlsxFile from "read-excel-file";
import Button from "../../components/Button";

export default function AdminProductsPage() {
  // ✅ State
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    categoryId: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 🔹 State untuk modal Import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);

  // ✅ Upload ke Cloudinary
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

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.url) {
        setForm((prev) => ({ ...prev, imageUrl: data.url }));
        Swal.fire("Sukses", "Gambar berhasil diupload", "success");
      } else {
        throw new Error(data.error || "Upload gagal");
      }
    } catch (err) {
      Swal.fire("Error", err.message, "error");
    } finally {
      setUploading(false);
    }
  }

  // ✅ Load Produk dari API
  async function loadProducts() {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setProducts(arr);
      setFilteredProducts(arr);
    } catch (err) {
      console.error("❌ Error fetch products:", err);
      setProducts([]);
      setFilteredProducts([]);
    }
  }

  // ✅ Load Kategori dari API
  async function loadCategories() {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("❌ Error fetch categories:", err);
      setCategories([]);
    }
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // ✅ Filter produk saat search berubah
  useEffect(() => {
    if (!search) {
      setFilteredProducts(products);
    } else {
      const lower = search.toLowerCase();
      setFilteredProducts(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(lower) ||
            p.description?.toLowerCase().includes(lower) ||
            p.category?.name?.toLowerCase().includes(lower)
        )
      );
    }
  }, [search, products]);

  // ✅ Submit Produk (Tambah/Update)
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (isEditing) {
        await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        Swal.fire("Sukses", "Produk diperbarui", "success");
      } else {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        Swal.fire("Sukses", "Produk ditambahkan", "success");
      }
      setForm({
        id: null,
        name: "",
        description: "",
        imageUrl: "",
        price: "",
        categoryId: "",
      });
      setIsEditing(false);
      loadProducts();
    } catch (error) {
      Swal.fire("Error", "Gagal simpan produk", "error");
    }
  }

  // ✅ Edit Produk
  function handleEdit(product) {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      price: product.price,
      categoryId: product.categoryId || "",
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ✅ Delete Produk
  async function handleDelete(id) {
    const confirm = await Swal.fire({
      title: "Yakin hapus produk?",
      text: "Data ini tidak bisa dikembalikan!",
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
      } catch (error) {
        Swal.fire("Error", "Gagal hapus produk", "error");
      }
    }
  }

  // ✅ Import Produk dari Excel
  async function handleImportSubmit() {
    if (!importFile) {
      Swal.fire("Oops", "Silakan pilih file terlebih dahulu", "warning");
      return;
    }

    try {
      const rows = await readXlsxFile(importFile);
      // Asumsi header: Nama | Harga | Deskripsi | URL Gambar | KategoriId
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

      Swal.fire("Sukses", "Import produk berhasil!", "success");
      setShowImportModal(false);
      setImportFile(null);
      loadProducts();
    } catch (error) {
      Swal.fire("Error", "Gagal import produk", "error");
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manajemen Produk</h1>

      {/* ✅ FORM TAMBAH / EDIT */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10"
      >
        <input
          type="text"
          placeholder="Nama Produk"
          className="border p-2 rounded"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Harga"
          className="border p-2 rounded"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />

        {/* Upload Gambar */}
        <div className="col-span-2 flex flex-col gap-2">
          <input
            type="text"
            placeholder="Atau paste URL gambar"
            className="border p-2 rounded"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
          />

          {/* input file hidden */}
          <input
            type="file"
            id="uploadImage"
            accept="image/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />

          {/* custom button */}
          <label htmlFor="uploadImage">
            <Button as="span" className="min-w-[160px]">
              {uploading ? "Uploading..." : "Upload Gambar"}
            </Button>
          </label>

          {/* preview gambar */}
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

        <textarea
          placeholder="Deskripsi Produk"
          className="border p-2 rounded col-span-2"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <select
          className="border p-2 rounded col-span-2"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          required
        >
          <option value="">Pilih Kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="mt-4">
          <Button type="submit" className="min-w-[160px]">
            {isEditing ? "Update Produk" : "Tambah Produk"}
          </Button>
        </div>
      </form>

      {/* ✅ BUTTON BUKA MODAL IMPORT */}
      <div className="mb-6">
        <Button
          onClick={() => setShowImportModal(true)}
          className="min-w-[160px]"
        >
          Import Produk
        </Button>
      </div>

      {/* ✅ SEARCH BAR */}
      <div className="mb-6">
        <input
          type="text"
          placeholder=" Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded w-full md:max-w-sm"
        />
      </div>

      {/* ✅ DAFTAR PRODUK */}
      <h2 className="text-2xl font-semibold mb-4">Daftar Produk</h2>
      {filteredProducts.length === 0 ? (
        <p className="text-gray-500">Produk tidak ditemukan</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="border rounded-lg shadow hover:shadow-lg transition bg-white flex flex-col"
            >
              <div className="relative w-full h-40 bg-gray-100 rounded-t-lg">
                <Image
                  src={p.imageUrl || "/no-image.png"}
                  alt={p.name}
                  fill
                  unoptimized
                  className="object-cover rounded-t-lg"
                />
              </div>
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-lg">{p.name}</h3>
                <p className="text-green-600 font-bold">
                  Rp {Number(p.price).toLocaleString("id-ID")}
                </p>
                <p className="text-sm text-gray-600 mt-1 flex-1">
                  {p.description}
                </p>
                <span className="inline-block mt-2 text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded">
                  {p.category?.name || "Tanpa Kategori"}
                </span>

                <button
                  onClick={() => handleEdit(p)}
                  className="mt-4 bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="mt-2 bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ✅ MODAL IMPORT */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h2 className="text-xl font-semibold mb-4">Import Produk</h2>
            <p className="text-sm text-gray-600 mb-4">
              Import menggunakan file <b>.xlsx</b> yang diexport dari Excel.{" "}
              <br />
              Dengan melakukan import, produk yang sudah ada akan ditambah
              dengan produk baru dari file.
            </p>

            {/* Template Download */}
            <a
              href="/templates/import-template.xlsx"
              download
              className="text-blue-600 underline hover:text-blue-800"
            >
              📄 Template data baru
            </a>

            {/* Input File */}
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setImportFile(e.target.files[0])}
              className="border p-2 rounded w-full mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded border"
              >
                Batal
              </button>
              <button
                onClick={handleImportSubmit}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
