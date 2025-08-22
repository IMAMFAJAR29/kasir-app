"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("Loading...");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      console.log("Respon dari API login:", data);

      if (res.ok) {
        setMessage("✅ Login berhasil!");

        // simpan user + token ke localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);

        // simpan juga ke cookies (biar bisa dibaca middleware)
        document.cookie = `token=${data.token}; path=/;`;
        document.cookie = `user=${encodeURIComponent(
          JSON.stringify(data.user)
        )}; path=/;`;

        console.log("User disimpan:", data.user);

        // redirect ke dashboard
        setTimeout(() => {
          router.replace("/"); // pakai replace biar gak bisa back ke login
        }, 200);
      } else {
        setMessage(`❌ ${data.error || "Login gagal"}`);
      }
    } catch (err) {
      console.error("Error saat login:", err);
      setMessage("❌ Terjadi error di server");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 border rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          className="w-full border px-3 py-2 rounded"
          required
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          Login
        </button>
      </form>

      {message && <p className="mt-4 text-center">{message}</p>}

      <p className="text-sm mt-4 text-center">
        Belum punya akun?{" "}
        <a href="/register" className="text-blue-600 hover:underline">
          Register
        </a>
      </p>
    </div>
  );
}
