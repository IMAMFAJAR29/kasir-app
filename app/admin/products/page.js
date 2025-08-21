"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Swal from "sweetalert2";

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    id: null,
    name: "",
    description: "",
    imageUrl: "",
    price: "",
    categoryId: "",
  });
  const [categories, setCategories] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  // ✅ Load Produk dari API
  async function loadProducts() {
    const res = await fetch("/api/products");
    const data = await res.json();
    setProducts(data);
  }

  // ✅ Load Kategori dari API
  async function loadCategories() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
  }

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // ✅ Handle submit form (tambah / update produk)
  async function handleSubmit(e) {
    e.preventDefault();

    try {
      if (isEditing) {
        await fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        Swal.fire({
          icon: "success",
          title: "Produk diperbarui",
          text: "Data produk berhasil diperbarui!",
          showConfirmButton: false,
          timer: 2000,
        });
      } else {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        Swal.fire({
          icon: "success",
          title: "Produk ditambahkan",
          text: "Data produk berhasil ditambahkan!",
          showConfirmButton: false,
          timer: 2000,
        });
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
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan produk",
        text: error.message || "Terjadi kesalahan!",
      });
    }
  }

  // ✅ Handle ketika tombol "Edit" diklik
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

  // ✅ Handle ketika tombol "Delete" diklik
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

        Swal.fire({
          icon: "success",
          title: "Produk dihapus",
          text: "Data produk berhasil dihapus!",
          timer: 2000,
          showConfirmButton: false,
        });

        loadProducts();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Gagal hapus produk",
          text: error.message || "Terjadi kesalahan!",
        });
      }
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Manajemen Produk</h1>

      {/* ✅ FORM TAMBAH/EDIT PRODUK */}
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
          placeholder="Harga (contoh: 10000)"
          className="border p-2 rounded"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
        <input
          type="text"
          placeholder="URL Gambar"
          className="border p-2 rounded col-span-2"
          value={form.imageUrl}
          onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
        />
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

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded col-span-2 hover:bg-green-700 transition"
        >
          {isEditing ? "Update Produk" : "Tambah Produk"}
        </button>
      </form>

      {/* ✅ DAFTAR PRODUK */}
      <h2 className="text-2xl font-semibold mb-4">Daftar Produk</h2>
      {products.length === 0 ? (
        <p className="text-gray-500">Belum ada produk</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((p) => (
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

                {/* Tombol Edit */}
                <button
                  onClick={() => handleEdit(p)}
                  className="mt-4 bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                >
                  Edit
                </button>

                {/* Tombol Delete */}
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
    </div>
  );
}
