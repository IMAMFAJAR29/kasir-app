"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Swal from "sweetalert2";
import { Trash2, Plus, Save, Folder, Search, ChevronRight } from "lucide-react";
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

interface FlatCategory extends Category {
  depth: number;
  path: string;
}

function flattenCategories(
  categories: Category[],
  prefix = ""
): { id: number; name: string }[] {
  return categories.flatMap((category) => [
    { id: category.id, name: prefix ? `${prefix} > ${category.name}` : category.name },
    ...(Array.isArray(category.children) && category.children.length > 0
      ? flattenCategories(
          category.children,
          prefix ? `${prefix} > ${category.name}` : category.name
        )
      : []),
  ]);
}

export default function AdminCategoriesPage() {
  // ======= State =======
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState<string>("");
  const [selected, setSelected] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categoryError, setCategoryError] = useState<string>("");
  const [isBulkDeleting, setIsBulkDeleting] = useState<boolean>(false);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormData>({
    type: "root",
    name: "",
    parentId: "",
    parentName: "",
  });

  // ======= Load semua kategori =======
  const loadCategories = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch("/api/categories");
      if (!res.ok) {
        throw new Error(`Gagal mengambil kategori (HTTP ${res.status})`);
      }

      const data: Category[] = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Format data kategori tidak valid");
      }

      setCategories(data);
      setCategoryError("");
      const categoryIds = new Set(
        flattenCategories(data).map((item) => item.id)
      );
      setSelected((current) => current.filter((id) => categoryIds.has(id)));
    } catch (error) {
      console.error("Error loading categories:", error);
      setCategoryError("Gagal memuat kategori. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
        await loadCategories();
      } else {
        Swal.fire({ icon: "error", title: "Gagal menghapus kategori" });
      }
    }
  }

  async function handleBulkDelete(): Promise<void> {
    const selectedIds = [...selected];
    if (selectedIds.length === 0 || isBulkDeleting) return;

    const confirmation = await Swal.fire({
      title: "Hapus kategori?",
      text: `Anda akan menghapus ${selectedIds.length} kategori yang dipilih. Tindakan ini tidak dapat dibatalkan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Hapus Kategori",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
      cancelButtonColor: "#64748b",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    const categoriesById = new Map(
      allCategories.map((category) => [category.id, category])
    );
    const deletionOrder = selectedIds.sort(
      (leftId, rightId) =>
        (categoriesById.get(rightId)?.depth ?? 0) -
        (categoriesById.get(leftId)?.depth ?? 0)
    );
    const deletedIds: number[] = [];
    const failedIds: number[] = [];

    setIsBulkDeleting(true);
    try {
      for (const id of deletionOrder) {
        const response = await fetch(`/api/categories/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          deletedIds.push(id);
        } else {
          failedIds.push(id);
        }
      }

      setSelected((current) =>
        current.filter((id) => !deletedIds.includes(id))
      );
      await loadCategories();

      if (failedIds.length > 0) {
        await Swal.fire({
          icon: "error",
          title: "Sebagian kategori gagal dihapus",
          text: `${deletedIds.length} kategori berhasil dihapus; ${failedIds.length} kategori gagal dihapus.`,
        });
      } else {
        await Swal.fire({
          icon: "success",
          title: "Kategori berhasil dihapus",
          text: `${deletedIds.length} kategori telah dihapus.`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Error deleting selected categories:", error);
      await loadCategories();
      await Swal.fire({
        icon: "error",
        title: "Gagal menghapus kategori",
        text: `${deletedIds.length} kategori berhasil dihapus sebelum terjadi kesalahan.`,
      });
    } finally {
      setIsBulkDeleting(false);
    }
  }

  function flattenVisibleCategories(
    cats: Category[],
    prefix = "",
    depth = 0
  ): FlatCategory[] {
    return cats.flatMap((category) => {
      const path = prefix ? `${prefix} > ${category.name}` : category.name;
      return [
        { ...category, depth, path },
        ...flattenVisibleCategories(category.children ?? [], path, depth + 1),
      ];
    });
  }

  const allCategories = flattenVisibleCategories(categories);
  const filteredRoots = categories.filter((category) =>
    category.name.toLowerCase().includes(search.toLowerCase())
  );
  const visibleCategories = flattenVisibleCategories(filteredRoots);
  const visibleCategoryIds = visibleCategories.map((category) => category.id);
  const selectedVisibleCount = visibleCategoryIds.filter((id) =>
    selected.includes(id)
  ).length;
  const allVisibleSelected =
    visibleCategoryIds.length > 0 &&
    selectedVisibleCount === visibleCategoryIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedVisibleCount > 0 && !allVisibleSelected;
    }
  }, [allVisibleSelected, selectedVisibleCount]);

  function toggleCategory(id: number): void {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function toggleAllVisible(): void {
    setSelected((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleCategoryIds.includes(id));
      }
      return Array.from(new Set([...current, ...visibleCategoryIds]));
    });
  }

  // ======= JSX =======
  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 sm:px-8 sm:py-8 xl:px-10">
      {/* Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Kategori
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
          className="flex items-center gap-2 bg-blue-600 text-white shadow-sm hover:bg-blue-700"
        >
          <Plus size={16} />
          <span>Tambah Baru</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Filter</h2>
            <button
              type="button"
              onClick={() => setSearch("")}
              disabled={!search}
              className="text-xs font-medium text-blue-600 transition hover:text-blue-700 disabled:cursor-default disabled:text-slate-300"
            >
              Reset
            </button>
          </div>
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="search"
              placeholder="Cari kategori"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            />
          </label>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Cari berdasarkan nama kategori.
          </p>
        </aside>

        <section className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600" aria-live="polite">
              Total{" "}
              <span className="ml-1 inline-flex min-w-7 items-center justify-center rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                {allCategories.length}
              </span>
            </p>
            {selected.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-100 bg-rose-50/70 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">
                  {selected.length} kategori dipilih
                </span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="rounded-lg"
                >
                  <Trash2 size={14} />
                  {isBulkDeleting ? "Menghapus..." : "Hapus Kategori"}
                </Button>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {categoryError ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-rose-700">{categoryError}</p>
                <button
                  type="button"
                  onClick={loadCategories}
                  className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Coba lagi
                </button>
              </div>
            ) : isLoading ? (
              <div className="space-y-3 p-5" aria-label="Memuat kategori">
                {[0, 1, 2, 3].map((row) => (
                  <div
                    key={row}
                    className="h-10 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}
              </div>
            ) : visibleCategories.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Folder size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {categories.length === 0
                    ? "Belum ada kategori"
                    : "Kategori tidak ditemukan"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {categories.length === 0
                    ? "Tambahkan kategori untuk mengelompokkan produk."
                    : "Coba gunakan kata kunci pencarian lain."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50/80">
                    <tr>
                      <th scope="col" className="w-12 px-4 py-3">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          aria-label="Pilih semua kategori yang ditampilkan"
                          checked={allVisibleSelected}
                          onChange={toggleAllVisible}
                          disabled={isBulkDeleting}
                          className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                        />
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Nama Kategori
                      </th>
                      <th
                        scope="col"
                        className="w-36 px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Sub-kategori
                      </th>
                      <th
                        scope="col"
                        className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleCategories.map((category) => {
                      const hasChildren =
                        Array.isArray(category.children) &&
                        category.children.length > 0;
                      const parentPath = category.path
                        .split(" > ")
                        .slice(0, -1)
                        .join(" > ");

                      return (
                        <tr
                          key={category.id}
                          className={`group transition-colors hover:bg-blue-50/40 ${
                            selected.includes(category.id) ? "bg-blue-50/50" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              aria-label={`Pilih kategori ${category.name}`}
                              checked={selected.includes(category.id)}
                              onChange={() => toggleCategory(category.id)}
                              disabled={isBulkDeleting}
                              className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div
                              className="flex min-w-0 items-center gap-2"
                              style={{
                                paddingLeft: `${Math.min(category.depth, 4) * 14}px`,
                              }}
                            >
                              <Folder
                                size={16}
                                className="shrink-0 text-blue-600"
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-800">
                                  {category.name}
                                </p>
                                {parentPath && (
                                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                                    <ChevronRight
                                      size={12}
                                      className="shrink-0"
                                    />
                                    {parentPath}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                hasChildren
                                  ? "bg-teal-50 text-teal-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {hasChildren ? "Ya" : "Tidak"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setForm({
                                    type: "sub",
                                    name: "",
                                    parentId: category.id,
                                    parentName: category.name,
                                  });
                                  setShowAddModal(true);
                                }}
                                aria-label={`Tambah subkategori di ${category.name}`}
                                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
                              >
                                + Sub
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(category.id)}
                                disabled={isBulkDeleting}
                                aria-label={`Hapus kategori ${category.name}`}
                                title="Hapus Kategori"
                                className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
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
                className={`py-2 text-xs font-semibold rounded-lg transition focus-visible:bg-blue-100 focus-visible:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                  form.type === "root"
                    ? "bg-blue-600 text-white shadow-xs hover:bg-blue-700"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                Kategori Utama
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: "sub" })}
                className={`py-2 text-xs font-semibold rounded-lg transition focus-visible:bg-blue-100 focus-visible:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 ${
                  form.type === "sub"
                    ? "bg-blue-600 text-white shadow-xs hover:bg-blue-700"
                    : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
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
                    className="text-xs py-2 rounded-xl bg-blue-600 text-white flex items-center gap-1.5 hover:bg-blue-700"
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
