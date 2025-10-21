"use client";

import { useState, useEffect } from "react";
import { Trash, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import Button from "@/components/Button";

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

  const fetchLocations = async () => {
    const res = await fetch("/api/locations");
    const data = await res.json();
    setLocations(data);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAddLocation = async () => {
    if (!name) return Swal.fire("Error", "Nama lokasi dibutuhkan", "error");
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, isActive: true }),
    });
    if (res.ok) {
      setName("");
      setAddress("");
      fetchLocations();
    }
  };

  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Hapus lokasi?",
      text: "Data lokasi akan dihapus permanen",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
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
      title: "Edit Lokasi",
      html: `
      <div style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 0.5rem;">
        <!-- Nama Lokasi -->
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <label style="font-weight: 600; font-size: 0.95rem; color: #111827;"></label>
          <input
            id="swal-name"
            placeholder="Nama Lokasi"
            value="${loc.name}"
            style="
              width: 100%;
              border-radius: 0.5rem;
              border: 1px solid #d1d5db;
              padding: 0.75rem 1rem;
              font-size: 0.95rem;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            "
          />
        </div>

        <!-- Alamat Lokasi -->
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <label style="font-weight: 600; font-size: 0.95rem; color: #111827;"></label>
          <textarea
            id="swal-address"
            placeholder="Alamat"
            style="
              width: 100%;
              min-height: 80px;
              border-radius: 0.5rem;
              border: 1px solid #d1d5db;
              padding: 0.75rem 1rem;
              font-size: 0.95rem;
              box-shadow: 0 2px 8px rgba(0,0,0,0.08);
              resize: vertical;
            "
          >${loc.address || ""}</textarea>
        </div>
      </div>
    `,
      showCancelButton: true,
      confirmButtonText: `<span class="flex items-center gap-2"><Check size="16"/> Simpan</span>`,
      cancelButtonText: `<span class="flex items-center gap-2"><X size="16"/> Batal</span>`,
      buttonsStyling: false,
      customClass: {
        popup: "rounded-2xl p-6 shadow-xl w-full max-w-lg",
        confirmButton:
          "bg-black hover:bg-black/80 text-white font-semibold px-6 py-2 rounded-lg flex justify-center items-center transition",
        cancelButton:
          "bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-6 py-2 rounded-lg flex justify-center items-center transition ml-2",
      },
      focusConfirm: false,
      preConfirm: () => {
        const name = (document.getElementById("swal-name") as HTMLInputElement)
          .value;
        const address = (
          document.getElementById("swal-address") as HTMLTextAreaElement
        ).value;
        if (!name.trim()) {
          Swal.showValidationMessage("Nama lokasi tidak boleh kosong");
          return false;
        }
        return { name, address };
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

  return (
    <div className="max-w-4xl mx-auto mt-24 p-4">
      <h1 className="text-2xl font-bold mb-6">Lokasi Gudang</h1>

      <div className="bg-white shadow-lg rounded-lg p-6 mb-6 space-y-4">
        <input
          type="text"
          placeholder="Nama lokasi"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        />
        <input
          type="text"
          placeholder="Alamat"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        />
        <Button
          onClick={handleAddLocation}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/80"
        >
          Tambah
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="relative bg-white rounded-xl shadow-md p-4 flex flex-col justify-between transition hover:shadow-lg"
          >
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <button
                onClick={() => handleEdit(loc)}
                className="text-gray-500 hover:text-black transition"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => handleDelete(loc.id)}
                className="text-gray-500 hover:text-black transition"
              >
                <Trash size={18} />
              </button>
            </div>

            <div>
              <h2 className="font-semibold text-lg">{loc.name}</h2>
              <p className="text-sm text-gray-500">{loc.address}</p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span
                className={`text-sm ${
                  loc.isActive ? "text-black" : "text-gray-400"
                }`}
              >
                {loc.isActive ? "Aktif" : "Nonaktif"}
              </span>

              <div
                onClick={() => handleToggleActive(loc)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  loc.isActive ? "bg-black" : "bg-gray-300"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    loc.isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
