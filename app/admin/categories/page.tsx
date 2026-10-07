"use client";

import { useState, useEffect } from "react";
import { JSX } from "react";
import Swal from "sweetalert2";
import { Trash2, Plus, Save, Folder } from "lucide-react";
import Button from "@/components/Button";

// ======= Interface =======
interface Category {
  id: number;
  name: string;
  children?: Category[];
}

interface FormData {
  type: "root" | "sub";
  name: string;
  parentId: number | "" | null;
  parentName: string;
}

export default function AdminCategoriesPage() {
  // ======= State =======
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selected, setSelected] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const [form, setForm] = useState<FormData>({
    type: "root",
    name: "",
    parentId: "",
    parentName: "",
  });

  // ======= Load semua kategori =======
  async function loadCategories(): Promise<void> {
    const res = await fetch("/api/categories");
    const data: Category[] = await res.json();
    setCategories(data);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  // ======= Tambah kategori =======
  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.name || (form.type === "sub" && !form.parentId)) {
      Swal.fire({ icon: "warning", title: "Lengkapi form!" });
      return;
    }

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        parentId: form.type === "sub" ? Number(form.parentId) : null,
      }),
    });

    if (res.ok) {
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        timer: 1200,
        showConfirmButton: false,
      });
      setForm({ type: "root", name: "", parentId: "", parentName: "" });
      setShowAddModal(false);
      loadCategories();
    } else {
      Swal.fire({ icon: "error", title: "Gagal menyimpan kategori" });
    }
  }

  // ======= Hapus kategori =======
  async function handleDelete(id: number): Promise<void> {
    const confirm = await Swal.fire({
      title: "Yakin hapus kategori?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus",
      cancelButtonText: "Batal",
    });
    if (confirm.isConfirmed) {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSelected((prev) => prev.filter((s) => s !== id));
        loadCategories();
      } else {
        Swal.fire({ icon: "error", title: "Gagal menghapus kategori" });
      }
    }
  }

  // ======= Flatten kategori untuk modal list sub category =======
  function flattenCategories(
    cats: Category[],
    prefix = ""
  ): { id: number; name: string }[] {
    return cats.flatMap((c) => [
      { id: c.id, name: prefix ? `${prefix} > ${c.name}` : c.name },
      ...(Array.isArray(c.children) && c.children.length > 0
        ? flattenCategories(
            c.children,
            prefix ? `${prefix} > ${c.name}` : c.name
          )
        : []),
    ]);
  }

  // ======= Render daftar kategori =======
  function renderList(cats: Category[], prefix = ""): JSX.Element[] {
    return cats.map((c) => {
      const hasChildren = Array.isArray(c.children) && c.children.length > 0;

      return (
        <div
          key={c.id}
          className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs hover:shadow-md transition space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-700 flex items-center justify-center font-bold shrink-0">
                <Folder size={18} />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                  {prefix ? `${prefix} > ${c.name}` : c.name}
                </h3>
                {hasChildren && (
                  <p className="text-xs text-slate-400">
                    {c.children!.length} subkategori
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setForm({
                    type: "sub",
                    name: "",
                    parentId: c.id,
                    parentName: c.name,
                  });
                  setShowAddModal(true);
                }}
                className="px-2.5 py-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
              >
                + Sub
              </button>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                className="p-1.5 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition"
                title="Hapus Kategori"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Subkategori list */}
          {hasChildren && (
            <div className="pl-6 border-l-2 border-slate-100 ml-5 space-y-2 pt-1">
              {renderList(
                c.children!,
                prefix ? `${prefix} > ${c.name}` : c.name
              )}
            </div>
          )}
        </div>
      );
    });
  }

  // ======= JSX =======
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kategori Produk
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola kelompok barang, subkategori, dan taksonomi produk
          </p>
        </div>

        <Button
          onClick={() => {
            setForm({ type: "root", name: "", parentId: "", parentName: "" });
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
        >
          <Plus size={16} />
          <span>Tambah Kategori</span>
        </Button>
      </div>

      {/* Search Filter */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-xs">
        <input
          type="text"
          placeholder="Cari kategori..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition"
        />
      </div>

      {/* Daftar Kategori */}
      <div className="space-y-3.5">
        {categories.length > 0 ? (
          renderList(
            categories.filter((c) =>
              c.name.toLowerCase().includes(search.toLowerCase())
            )
          )
        ) : (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center">
            <p className="font-semibold text-slate-700">Belum ada kategori</p>
            <p className="text-xs text-slate-400 mt-1">
              Tambahkan kategori untuk memudahkan pengelompokan produk di kasir
            </p>
          </div>
        )}
      </div>

      {/* Modal Tambah Kategori */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              {form.type === "sub" ? "Tambah Sub Kategori" : "Tambah Kategori Baru"}
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              {form.type === "sub"
                ? `Menambahkan subkategori di bawah ${form.parentName || "induk"}`
                : "Buat kategori utama baru untuk produk Anda"}
            </p>

            {/* Pilih jenis kategori */}
            <div className="mb-5 grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() =>
                  setForm({
                    ...form,
                    type: "root",
                    parentId: "",
                    parentName: "",
                  })
                }
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  form.type === "root"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Kategori Utama
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "sub" })}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  form.type === "sub"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Sub Kategori
              </button>
            </div>

            {/* Pilih induk langsung jika sub kategori */}
            {form.type === "sub" && !form.parentName && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Pilih Kategori Induk:
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                  {flattenCategories(categories).map((c) => (
                    <div
                      key={c.id}
                      onClick={() =>
                        setForm({
                          ...form,
                          parentId: c.id,
                          parentName: c.name,
                        })
                      }
                      className={`cursor-pointer p-2.5 text-xs transition ${
                        form.parentId === c.id
                          ? "bg-indigo-50 text-indigo-700 font-bold"
                          : "hover:bg-white text-slate-700"
                      }`}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Input nama kategori */}
            {(form.type === "root" || form.parentId) && (
              <div className="space-y-4">
                {form.parentName && (
                  <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800">
                    Kategori Induk: <span className="font-bold">{form.parentName}</span>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Nama Kategori
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Makanan Ringan"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:bg-white transition"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddModal(false)}
                    className="text-xs py-2 rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    className="text-xs py-2 rounded-xl bg-slate-900 text-white flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>Simpan Kategori</span>
                  </Button>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 transition"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
