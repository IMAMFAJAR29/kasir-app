"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false); // 🔹 state loading
  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true); // 🔹 mulai loading

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

        // simpan juga ke cookies
        document.cookie = `token=${data.token}; path=/;`;
        document.cookie = `user=${encodeURIComponent(
          JSON.stringify(data.user)
        )}; path=/;`;

        console.log("User disimpan:", data.user);

        setTimeout(() => {
          router.replace("/");
        }, 500);
      } else {
        setMessage(`❌ ${data.error || "Login gagal"}`);
      }
    } catch (err) {
      console.error("Error saat login:", err);
      setMessage("❌ Terjadi error di server");
    } finally {
      setLoading(false); // 🔹 stop loading
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

        {/* 🔹 Tombol login + spinner */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 py-2 rounded text-white transition 
            ${
              loading
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
                ></path>
              </svg>
              Loading...
            </>
          ) : (
            "Login"
          )}
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
