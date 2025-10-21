"use client";

import { useState, useEffect } from "react";
import { Trash, Pencil } from "lucide-react";
import Swal from "sweetalert2";
import Button from "@/components/Button";

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

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
  const handleAddCustomer = async () => {
    if (!name) return Swal.fire("Error", "Nama pelanggan dibutuhkan", "error");

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
      Swal.fire("Berhasil", "Pelanggan berhasil ditambahkan", "success");
    }
  };

  // Hapus pelanggan
  const handleDelete = async (id: number) => {
    const confirm = await Swal.fire({
      title: "Hapus pelanggan?",
      text: "Data pelanggan akan dihapus permanen",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
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
      title: "Edit Pelanggan",
      html: `
        <input id="swal-name" class="swal2-input" placeholder="Nama" value="${
          customer.name
        }">
        <input id="swal-email" class="swal2-input" placeholder="Email" value="${
          customer.email || ""
        }">
        <input id="swal-phone" class="swal2-input" placeholder="Phone" value="${
          customer.phone || ""
        }">
        <input id="swal-address" class="swal2-input" placeholder="Alamat" value="${
          customer.address || ""
        }">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan",
      cancelButtonText: "Batal",
      preConfirm: () => {
        const name = (document.getElementById("swal-name") as HTMLInputElement)
          .value;
        const email = (
          document.getElementById("swal-email") as HTMLInputElement
        ).value;
        const phone = (
          document.getElementById("swal-phone") as HTMLInputElement
        ).value;
        const address = (
          document.getElementById("swal-address") as HTMLInputElement
        ).value;
        return { name, email, phone, address };
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

  return (
    <div className="max-w-4xl mx-auto mt-24 p-4">
      <h1 className="text-2xl font-bold mb-6">Kontak Pelanggan</h1>

      {/* Form tambah pelanggan */}
      <div className="bg-white shadow-lg rounded-lg p-6 mb-6 space-y-4">
        <input
          type="text"
          placeholder="Nama"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-black/30"
        />
        <input
          type="text"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
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
          onClick={handleAddCustomer}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/80"
        >
          Tambah Pelanggan
        </Button>
      </div>

      {/* List pelanggan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="relative bg-white rounded-lg shadow-md p-4 flex flex-col justify-between transition hover:shadow-lg"
          >
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <button
                onClick={() => handleEdit(customer)}
                className="text-gray-500 hover:text-black transition"
              >
                <Pencil size={18} />
              </button>
              <button
                onClick={() => handleDelete(customer.id)}
                className="text-gray-500 hover:text-black transition"
              >
                <Trash size={18} />
              </button>
            </div>

            <div>
              <h2 className="font-semibold text-lg">{customer.name}</h2>
              {customer.email && (
                <p className="text-sm text-gray-500">{customer.email}</p>
              )}
              {customer.phone && (
                <p className="text-sm text-gray-500">{customer.phone}</p>
              )}
              {customer.address && (
                <p className="text-sm text-gray-500">{customer.address}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
