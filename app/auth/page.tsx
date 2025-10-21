"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { FaGoogle } from "react-icons/fa";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function AuthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // State utama
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  // 🚀 Redirect langsung jika user sudah login
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/"); // gunakan replace agar tidak bisa kembali ke halaman login
    }
  }, [status, router]);

  // ⏳ Tampilkan animasi loading saat session masih dicek
  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <Loader2 className="w-10 h-10 text-black animate-spin" />
      </div>
    );
  }

  // 🧾 Handle input form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // 🔐 Proses login/register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      setIsLoading(true);

      const result = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
      });

      if (result?.ok) {
        // ✅ Tunggu session benar-benar aktif sebelum redirect
        const checkSession = async () => {
          let retries = 0;
          while (retries < 10) {
            const res = await fetch("/api/auth/session");
            const data = await res.json();
            if (data?.user) {
              router.replace("/");
              return;
            }
            await new Promise((r) => setTimeout(r, 300)); // delay 300ms
            retries++;
          }
          router.replace("/");
        };
        await checkSession();
      } else {
        Swal.fire("Gagal", "Email atau password salah", "error");
      }

      setIsLoading(false);
    } else {
      // 🧩 Proses register
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        Swal.fire("Berhasil", "Akun berhasil dibuat", "success");
        setIsLogin(true);
      } else {
        const data = await res.json();
        Swal.fire("Gagal", data.error || "Gagal mendaftar", "error");
      }
    }
  };

  // 🔄 Ubah form antara login ↔ register
  const toggleForm = () => {
    setIsLogin(!isLogin);
    setForm({ name: "", email: "", password: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative bg-white border border-gray-200 rounded-3xl shadow-2xl w-[90%] max-w-4xl flex flex-col md:flex-row overflow-hidden"
      >
        {/* 🌑 Panel kiri (informasi login/register) */}
        <motion.div
          key={isLogin ? "login" : "register"}
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="hidden md:flex w-1/2 flex-col items-center justify-center p-10 text-white bg-gradient-to-br from-black via-gray-900 to-gray-800 rounded-3xl"
        >
          <h1 className="text-3xl font-bold mb-4">
            {isLogin ? "Hello, Friend!" : "Welcome Back!"}
          </h1>
          <p className="mb-6 text-sm text-gray-300 text-center">
            {isLogin
              ? "Belum punya akun? Buat akun baru dan mulai sekarang."
              : "Sudah punya akun? Login untuk melanjutkan."}
          </p>
          <button
            onClick={toggleForm}
            className="border border-white text-white px-6 py-2 rounded-lg hover:bg-white hover:text-black transition-colors"
          >
            {isLogin ? "Daftar" : "Login"}
          </button>
        </motion.div>

        {/* ☀️ Panel kanan (form utama) */}
        <div className="w-full md:w-1/2 bg-gray-50 p-8 md:p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
            {isLogin ? "Login ke Akunmu" : "Buat Akun Baru"}
          </h2>

          {/* 🔘 Tombol Login dengan Google */}
          {isLogin && (
            <div className="mb-6 flex justify-center">
              <button
                onClick={() => signIn("google", { callbackUrl: "/" })}
                className="p-3 border border-gray-900 rounded-full hover:bg-black hover:text-white transition-colors"
                title="Login dengan Google"
              >
                <FaGoogle className="text-xl" />
              </button>
            </div>
          )}

          {/* 🧩 Form login/register */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input nama hanya saat register */}
            {!isLogin && (
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nama Lengkap"
                required
                className="w-full border-b-2 border-black focus:outline-none py-2 text-gray-900 placeholder-gray-500 bg-transparent"
              />
            )}

            {/* Input email */}
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              required
              className="w-full border-b-2 border-black focus:outline-none py-2 text-gray-900 placeholder-gray-500 bg-transparent"
            />

            {/* Input password + toggle show/hide */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                required
                className="w-full border-b-2 border-black focus:outline-none py-2 text-gray-900 placeholder-gray-500 pr-10 bg-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-2 text-gray-600 hover:text-black"
              >
                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>

            {/* Tombol submit */}
            <button
              type="submit"
              className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-900 transition-colors"
            >
              {isLogin ? "Login" : "Daftar"}
            </button>
          </form>

          {/* 🔁 Tombol toggle di tampilan mobile */}
          <div className="md:hidden mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              {isLogin ? "Belum punya akun?" : "Sudah punya akun?"}
            </p>
            <button
              onClick={toggleForm}
              className="text-black font-semibold underline underline-offset-2 hover:text-gray-700 transition-colors"
            >
              {isLogin ? "Daftar Sekarang" : "Login di sini"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
