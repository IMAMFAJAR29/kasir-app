"use client";
import { useEffect, useState } from "react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", slug: "" });

  async function loadCategories() {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", slug: "" });
    loadCategories();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Kategori</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          className="border p-2 w-full"
          placeholder="Nama kategori"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          className="border p-2 w-full"
          placeholder="Slug (tanpa spasi, huruf kecil)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
        <button className="bg-green-600 text-white px-4 py-2 rounded">
          Tambah Kategori
        </button>
      </form>

      <h2 className="text-xl font-semibold mt-8">Daftar Kategori</h2>
      <ul className="mt-4 space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="border p-2 rounded">
            {c.name} ({c.slug})
          </li>
        ))}
      </ul>
    </div>
  );
}
