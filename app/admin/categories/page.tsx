"use client";

import { useState, useEffect } from "react";
import { JSX } from "react";
import Swal from "sweetalert2";
import { Trash2, Plus, Save } from "lucide-react";
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
    return cats.flatMap((c) => [
      <div
        key={c.id}
        className="flex justify-between items-center bg-white p-3 rounded-lg shadow mb-2"
      >
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.includes(c.id)}
            onChange={(e) => {
              if (e.target.checked) setSelected((prev) => [...prev, c.id]);
              else setSelected((prev) => prev.filter((s) => s !== c.id));
            }}
            className="w-4 h-4"
          />
          <span className="text-gray-800">
            {prefix ? `${prefix} > ${c.name}` : c.name}
          </span>
        </div>
        {selected.includes(c.id) && (
          <button
            onClick={() => handleDelete(c.id)}
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>,
      ...(Array.isArray(c.children) && c.children.length > 0
        ? renderList(c.children, prefix ? `${prefix} > ${c.name}` : c.name)
        : []),
    ]);
  }

  // ======= JSX =======
  return (
    <div className="pt-20 p-6 max-w-6xl mx-auto font-sans">
      {/* Header: Search + Button Tambah */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-4">
        <input
          type="text"
          placeholder="Cari kategori..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-md border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-black-500"
        />
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-1 bg-black text-white rounded text-sm"
        >
          <Plus size={18} /> Tambah Kategori
        </Button>
      </div>

      {/* Daftar kategori */}
      <div>
        {categories.length > 0 ? (
          renderList(
            categories.filter((c) =>
              c.name.toLowerCase().includes(search.toLowerCase())
            )
          )
        ) : (
          <p className="text-gray-500">Belum ada kategori</p>
        )}
      </div>

      {/* Modal Tambah Kategori */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6 relative">
            <h3 className="text-lg font-semibold mb-4">Tambah Kategori</h3>

            {/* Pilih jenis kategori */}
            <div className="mb-4 flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="root"
                  checked={form.type === "root"}
                  onChange={() =>
                    setForm({
                      ...form,
                      type: "root",
                      parentId: "",
                      parentName: "",
                    })
                  }
                  className="w-4 h-4 text-black-600 border-gray-300"
                />
                Kategori Utama
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="sub"
                  checked={form.type === "sub"}
                  onChange={() => setForm({ ...form, type: "sub" })}
                  className="w-4 h-4 text-black-600 border-gray-300"
                />
                Sub Kategori
              </label>
            </div>

            {/* Pilih induk langsung jika sub kategori */}
            {form.type === "sub" && (
              <div className="mb-4 max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                {flattenCategories(categories)
                  .filter((c) =>
                    c.name.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((c) => (
                    <div
                      key={c.id}
                      onClick={() =>
                        setForm({
                          ...form,
                          parentId: c.id,
                          parentName: c.name,
                        })
                      }
                      className={`cursor-pointer py-2 px-3 hover:bg-gray-50 ${
                        form.parentId === c.id ? "bg-green-100" : ""
                      }`}
                    >
                      {c.name}
                    </div>
                  ))}
              </div>
            )}

            {/* Input nama kategori */}
            {(form.type === "root" || form.parentId) && (
              <div className="mt-4">
                {form.parentName && (
                  <p className="text-sm text-gray-700 mb-1">
                    Kategori Induk:{" "}
                    <span className="font-medium">{form.parentName}</span>
                  </p>
                )}
                <input
                  type="text"
                  placeholder="Nama kategori"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3 focus:ring-2 focus:ring-black-500"
                />
                <Button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-3 py-1 bg-black text-white rounded text-sm"
                >
                  <Save size={18} /> Simpan
                </Button>
              </div>
            )}

            <button
              onClick={() => setShowAddModal(false)}
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
