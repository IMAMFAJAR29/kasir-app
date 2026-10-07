"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Trash2,
  Pencil,
  Warehouse,
  MapPin,
  Plus,
  Building2,
  CheckCircle2,
  XCircle,
  Search
} from "lucide-react";
import Swal from "sweetalert2";
import Button from "@/components/Button";
import { Badge } from "@/components/ui/badge";

interface Location {
  id: number;
  name: string;
  address?: string;
  isActive: boolean;
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLocations = async () => {
    const res = await fetch("/api/locations");
    const data = await res.json();
    setLocations(data);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAddLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return Swal.fire("Error", "Nama lokasi dibutuhkan", "error");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, address, isActive: true }),
      });
      if (res.ok) {
        setName("");
        setAddress("");
        fetchLocations();
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Lokasi gudang berhasil ditambahkan!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Hapus lokasi?",
      text: "Data lokasi akan dihapus permanen dari sistem",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/locations/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const errorMessage = await res.text();
      return Swal.fire("Gagal", errorMessage, "error");
    }

    Swal.fire("Berhasil", "Lokasi berhasil dihapus", "success");
    fetchLocations();
  };

  const handleToggleActive = async (loc: Location) => {
    const actionText = loc.isActive ? "Nonaktifkan" : "Aktifkan";
    const result = await Swal.fire({
      title: `${actionText} gudang?`,
      text: `Apakah kamu yakin ingin ${actionText.toLowerCase()} ${loc.name}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      await fetch(`/api/locations/${loc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...loc, isActive: !loc.isActive }),
      });
      fetchLocations();
    }
  };

  const handleEdit = async (loc: Location) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Lokasi Gudang",
      html: `
      <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; text-align: left;">
        <div>
          <label style="font-weight: 600; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 0.25rem;">Nama Lokasi</label>
          <input
            id="swal-name"
            placeholder="Contoh: Gudang Pusat"
            value="${loc.name}"
            style="
              width: 100%;
              border-radius: 0.75rem;
              border: 1px solid #cbd5e1;
              padding: 0.6rem 0.9rem;
              font-size: 0.9rem;
              outline: none;
            "
          />
        </div>

        <div>
          <label style="font-weight: 600; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 0.25rem;">Alamat Lengkap</label>
          <textarea
            id="swal-address"
            placeholder="Alamat atau keterangan lokasi"
            style="
              width: 100%;
              min-height: 80px;
              border-radius: 0.75rem;
              border: 1px solid #cbd5e1;
              padding: 0.6rem 0.9rem;
              font-size: 0.9rem;
              outline: none;
              resize: vertical;
            "
          >${loc.address || ""}</textarea>
        </div>
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: "Simpan Perubahan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#94a3b8",
      customClass: {
        popup: "rounded-2xl p-6 shadow-xl",
      },
      focusConfirm: false,
      preConfirm: () => {
        const swalName = (document.getElementById("swal-name") as HTMLInputElement).value;
        const swalAddress = (document.getElementById("swal-address") as HTMLTextAreaElement).value;
        if (!swalName.trim()) {
          Swal.showValidationMessage("Nama lokasi tidak boleh kosong");
          return false;
        }
        return { name: swalName, address: swalAddress };
      },
    });

    if (formValues) {
      await fetch(`/api/locations/${loc.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...loc, ...formValues }),
      });
      fetchLocations();
      Swal.fire("Berhasil", "Lokasi berhasil diperbarui", "success");
    }
  };

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) =>
      loc.name.toLowerCase().includes(search.toLowerCase()) ||
      (loc.address && loc.address.toLowerCase().includes(search.toLowerCase()))
    );
  }, [locations, search]);

  const activeCount = locations.filter((l) => l.isActive).length;
  const inactiveCount = locations.length - activeCount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Lokasi & Cabang Gudang
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola titik penyimpanan, rak gudang, atau cabang toko Anda untuk tracking inventaris.
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Lokasi</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{locations.length} Lokasi</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Gudang Aktif</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{activeCount} Aktif</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Nonaktif</p>
            <h3 className="text-2xl font-bold text-slate-400 mt-1">{inactiveCount} Nonaktif</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Layout Grid: Add Form + Location Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Tambah */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleAddLocation}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 sticky top-24"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base">
                Tambah Lokasi Baru
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Nama Lokasi / Gudang *
              </label>
              <div className="relative">
                <Warehouse className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Contoh: Gudang Utama Jakarta"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Alamat / Keterangan
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <textarea
                  placeholder="Alamat lengkap lokasi atau nomor rak penyimpanan..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 py-2.5 rounded-xl font-medium"
            >
              <Plus className="w-4 h-4" /> Tambah Lokasi
            </Button>
          </form>
        </div>

        {/* Right Column: List of Locations */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari lokasi gudang atau alamat..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white rounded-2xl border border-slate-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {filteredLocations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center text-slate-400">
              <Warehouse className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
              <p className="font-semibold text-slate-700 text-base">Tidak ada lokasi ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Tambahkan lokasi baru atau sesuaikan kata kunci pencarian.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between hover:shadow-md ${
                    loc.isActive ? "border-slate-200/80 hover:border-indigo-200" : "border-slate-200/50 opacity-70 bg-slate-50/50"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          loc.isActive ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                        }`}>
                          <Warehouse className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900 text-base leading-tight">
                            {loc.name}
                          </h3>
                          <span className="text-[11px] font-mono text-slate-400">ID #{loc.id}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEdit(loc)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Lokasi"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(loc.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Hapus Lokasi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <p className="line-clamp-2 leading-relaxed">
                        {loc.address || "Tidak ada alamat detail"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <Badge variant={loc.isActive ? "success" : "default"} withDot>
                      {loc.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>

                    {/* Smooth Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(loc)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        loc.isActive ? "bg-indigo-600" : "bg-slate-200"
                      }`}
                      title={loc.isActive ? "Klik untuk nonaktifkan" : "Klik untuk aktifkan"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          loc.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
