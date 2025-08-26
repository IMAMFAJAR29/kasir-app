"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Gagal registrasi");
      return;
    }

    // munculkan popup sukses
    setSuccess(true);

    // otomatis redirect ke login setelah 2 detik
    setTimeout(() => {
      router.push("/login");
    }, 2000);
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-xl shadow p-6 relative">
        <h1 className="text-2xl font-bold mb-4">Register Akun</h1>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-3 text-sm text-red-700 bg-red-100 rounded-lg">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {success && (
          <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-4 py-2 rounded-lg shadow flex items-center gap-2 animate-fade-in-down">
            <CheckCircle2 className="w-5 h-5" />
            <span>Registrasi berhasil!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <input
            type="text"
            name="name"
            placeholder="Nama"
            className="border p-2 rounded"
            value={form.name}
            onChange={handleChange}
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="border p-2 rounded"
            value={form.email}
            onChange={handleChange}
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            className="border p-2 rounded"
            value={form.password}
            onChange={handleChange}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Register
          </button>
        </form>
      </div>
    </main>
  );
}
