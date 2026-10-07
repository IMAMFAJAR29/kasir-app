"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Trash2,
  Pencil,
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  Users,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Building
} from "lucide-react";
import Swal from "sweetalert2";
import Button from "@/components/Button";
import { Badge } from "@/components/ui/badge";

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

// Helper to generate consistent pastel avatar background
const getAvatarColor = (name: string) => {
  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-emerald-100 text-emerald-700",
    "bg-blue-100 text-blue-700",
    "bg-purple-100 text-purple-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch data pelanggan
  const fetchCustomers = async () => {
    const res = await fetch("/api/customers");
    const data = await res.json();
    setCustomers(data);
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Tambah pelanggan baru
  const handleAddCustomer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim()) return Swal.fire("Error", "Nama pelanggan dibutuhkan", "error");

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, address }),
      });

      if (res.ok) {
        setName("");
        setEmail("");
        setPhone("");
        setAddress("");
        fetchCustomers();
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Pelanggan baru berhasil ditambahkan!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hapus pelanggan
  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Hapus pelanggan?",
      text: "Data kontak pelanggan akan dihapus secara permanen",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#e11d48",
    });

    if (!confirm.isConfirmed) return;

    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const errorMessage = await res.text();
      return Swal.fire("Gagal", errorMessage, "error");
    }

    Swal.fire("Berhasil", "Pelanggan berhasil dihapus", "success");
    fetchCustomers();
  };

  // Edit pelanggan
  const handleEdit = async (customer: Customer) => {
    const { value: formValues } = await Swal.fire({
      title: "Edit Data Pelanggan",
      html: `
        <div style="display: flex; flex-direction: column; gap: 0.85rem; margin-top: 1rem; text-align: left;">
          <div>
            <label style="font-weight: 600; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 0.25rem;">Nama Lengkap *</label>
            <input id="swal-name" placeholder="Nama Pelanggan" value="${customer.name}" style="width: 100%; border-radius: 0.75rem; border: 1px solid #cbd5e1; padding: 0.6rem 0.9rem; font-size: 0.9rem; outline: none;">
          </div>
          <div>
            <label style="font-weight: 600; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 0.25rem;">Email</label>
            <input id="swal-email" type="email" placeholder="email@contoh.com" value="${customer.email || ""}" style="width: 100%; border-radius: 0.75rem; border: 1px solid #cbd5e1; padding: 0.6rem 0.9rem; font-size: 0.9rem; outline: none;">
          </div>
          <div>
            <label style="font-weight: 600; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 0.25rem;">Nomor Telepon / WA</label>
            <input id="swal-phone" placeholder="08xxxxxxxxxx" value="${customer.phone || ""}" style="width: 100%; border-radius: 0.75rem; border: 1px solid #cbd5e1; padding: 0.6rem 0.9rem; font-size: 0.9rem; outline: none;">
          </div>
          <div>
            <label style="font-weight: 600; font-size: 0.85rem; color: #475569; display: block; margin-bottom: 0.25rem;">Alamat</label>
            <textarea id="swal-address" placeholder="Alamat lengkap..." style="width: 100%; min-height: 70px; border-radius: 0.75rem; border: 1px solid #cbd5e1; padding: 0.6rem 0.9rem; font-size: 0.9rem; outline: none; resize: vertical;">${customer.address || ""}</textarea>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan Perubahan",
      cancelButtonText: "Batal",
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#94a3b8",
      customClass: {
        popup: "rounded-2xl p-6 shadow-xl",
      },
      preConfirm: () => {
        const swalName = (document.getElementById("swal-name") as HTMLInputElement).value;
        const swalEmail = (document.getElementById("swal-email") as HTMLInputElement).value;
        const swalPhone = (document.getElementById("swal-phone") as HTMLInputElement).value;
        const swalAddress = (document.getElementById("swal-address") as HTMLTextAreaElement).value;
        if (!swalName.trim()) {
          Swal.showValidationMessage("Nama pelanggan tidak boleh kosong");
          return false;
        }
        return { name: swalName, email: swalEmail, phone: swalPhone, address: swalAddress };
      },
    });

    if (formValues) {
      await fetch(`/api/customers/${customer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...customer, ...formValues }),
      });
      fetchCustomers();
      Swal.fire("Berhasil", "Data pelanggan diperbarui", "success");
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(search.toLowerCase()))
    );
  }, [customers, search]);

  const withEmailCount = customers.filter((c) => !!c.email).length;
  const withPhoneCount = customers.filter((c) => !!c.phone).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Kontak Pelanggan & Mitra
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola direktori pelanggan setia, nomor kontak WhatsApp, dan informasi pengiriman.
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Pelanggan</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{customers.length} Orang</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Kontak Telepon / WA</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{withPhoneCount} Kontak</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Memiliki Email</p>
            <h3 className="text-2xl font-bold text-blue-600 mt-1">{withEmailCount} Akun</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Form + Directory */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form Column */}
        <div className="lg:col-span-1">
          <form
            onSubmit={handleAddCustomer}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4 sticky top-24"
          >
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Plus className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base">
                Tambah Pelanggan Baru
              </h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Nama Lengkap *
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="budi@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Nomor Telepon / WhatsApp
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Alamat Pengiriman
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <textarea
                  placeholder="Alamat domisili atau catatan khusus..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 py-2.5 rounded-xl font-medium"
            >
              <Plus className="w-4 h-4" /> Simpan Pelanggan
            </Button>
          </form>
        </div>

        {/* Right Customer Directory */}
        <div className="lg:col-span-2 space-y-4">
          {/* Toolbar: Search + View Mode */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari pelanggan, email, nomor HP, atau alamat..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white rounded-2xl border border-slate-200/80 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200/80 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "grid"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="Tampilan Grid"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`p-2 rounded-xl transition-all ${
                  viewMode === "table"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-700"
                }`}
                title="Tampilan Tabel"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
              <p className="font-semibold text-slate-700 text-base">Tidak ada pelanggan ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">Tambahkan data pelanggan baru atau sesuaikan kata kunci.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredCustomers.map((customer) => {
                const initials = customer.name
                  .split(" ")
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const avatarColor = getAvatarColor(customer.name);

                return (
                  <div
                    key={customer.id}
                    className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 p-5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl font-bold text-sm flex items-center justify-center shrink-0 shadow-sm ${avatarColor}`}>
                            {initials}
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-base leading-snug">
                              {customer.name}
                            </h3>
                            <span className="text-[11px] font-mono text-slate-400">ID #{customer.id}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(customer)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit Pelanggan"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Hapus Pelanggan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                        {customer.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-700">{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-start gap-2 pt-0.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-relaxed text-slate-500">
                              {customer.address}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Pelanggan</th>
                      <th className="px-5 py-3.5">Kontak</th>
                      <th className="px-5 py-3.5">Alamat</th>
                      <th className="px-5 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCustomers.map((c) => {
                      const initials = c.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();
                      const avatarColor = getAvatarColor(c.name);

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5 align-middle">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 ${avatarColor}`}>
                                {initials}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{c.name}</p>
                                <p className="text-[11px] font-mono text-slate-400">ID #{c.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 align-middle">
                            <div className="text-xs space-y-0.5">
                              {c.phone && <p className="font-medium text-slate-800">{c.phone}</p>}
                              {c.email && <p className="text-slate-500">{c.email}</p>}
                              {!c.phone && !c.email && <span className="text-slate-400">-</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 align-middle text-xs text-slate-600 max-w-xs truncate">
                            {c.address || "-"}
                          </td>
                          <td className="px-5 py-3.5 align-middle text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEdit(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(c.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
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
        </div>
      </div>
    </div>
  );
}
