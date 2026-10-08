"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Swal from "sweetalert2";
import { FcGoogle } from "react-icons/fc";
import BrandLoader from "@/components/BrandLoader";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  Zap,
  ShieldCheck,
  BarChart3,
  ArrowRight,
} from "lucide-react";

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
      router.replace("/");
    }
  }, [status, router]);

  // ⏳ Tampilkan animasi loading saat session masih dicek
  if (status === "loading") {
    return <BrandLoader label="Memuat sesi..." />;
  }

  // 🧾 Handle input form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // 🔐 Proses login/register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isLogin) {
      setIsLoading(true);

      try {
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
              await new Promise((r) => setTimeout(r, 300));
              retries++;
            }
            router.replace("/");
          };
          await checkSession();
        } else {
          Swal.fire({
            icon: "error",
            title: "Gagal Masuk",
            text: "Email atau password yang Anda masukkan salah.",
            confirmButtonColor: "#1769e0",
          });
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      // 🧩 Proses register
      setIsLoading(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (res.ok) {
          Swal.fire({
            icon: "success",
            title: "Pendaftaran Berhasil",
            text: "Akun berhasil dibuat! Silakan masuk dengan akun baru Anda.",
            confirmButtonColor: "#1769e0",
          });
          setIsLogin(true);
        } else {
          const data = await res.json();
          Swal.fire({
            icon: "error",
            title: "Pendaftaran Gagal",
            text: data.error || "Gagal mendaftar akun baru",
            confirmButtonColor: "#1769e0",
          });
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  // 🔄 Ubah form antara login ↔ register
  const toggleForm = () => {
    setIsLogin(!isLogin);
    setForm({ name: "", email: "", password: "" });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative ambient light */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative bg-white rounded-3xl shadow-xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden border border-slate-200/80 z-10"
      >
        {/* Brand panel */}
        <div className="hidden md:flex w-5/12 flex-col justify-between p-10 text-brand-navy bg-gradient-to-br from-teal-50 via-blue-50 to-white relative overflow-hidden">
          <div className="absolute -top-12 -left-12 w-48 h-48 bg-teal-300/25 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -right-12 w-52 h-52 bg-blue-300/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <Image
                src="/Logo.png.png"
                alt="Logo Anima POS"
                width={52}
                height={52}
                className="h-12 w-12 rounded-xl border border-white/80 bg-white object-contain shadow-sm"
                priority
              />
              <div>
                <span className="font-bold text-lg tracking-tight">
                  Anima POS
                </span>
                <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200">
                  PRO
                </span>
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight mb-3">
              Solusi Point of Sale & Inventaris Toko Modern
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed mb-8">
              Kelola kasir transaksi cepat, monitoring stok multi-gudang, dan
              cetak struk thermal dalam satu aplikasi terintegrasi.
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-navy">
                    Transaksi Kasir Kilat
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Pencarian produk instan & hotkey cepat
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-navy">
                    Laporan & Multi Gudang
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Tracking stok real-time per lokasi cabang
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-navy">
                    Aman & Terpercaya
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Data terlindungi enkripsi session modern
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-slate-200">
            <p className="text-xs text-slate-600 mb-3">
              {isLogin ? "Belum punya akun sistem?" : "Sudah memiliki akun?"}
            </p>
            <button
              onClick={toggleForm}
              className="w-full py-2.5 px-4 rounded-xl border border-blue-200 text-brand-navy hover:bg-blue-50 hover:border-blue-300 transition-all font-medium text-xs flex items-center justify-center gap-2 group"
            >
              {isLogin ? "Daftar Akun Baru" : "Masuk ke Akun"}
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* ☀️ Right form panel */}
        <div className="w-full md:w-7/12 p-6 sm:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md mx-auto w-full">
            <div className="md:hidden flex items-center gap-3 mb-7">
              <Image
                src="/Logo.png.png"
                alt="Logo Anima POS"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <span className="text-lg font-bold tracking-tight text-brand-navy">
                Anima POS
              </span>
            </div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {isLogin ? "Selamat Datang Kembali" : "Daftar Akun Baru 🚀"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {isLogin
                  ? "Masuk untuk mengelola transaksi kasir dan stok tokomu."
                  : "Buat akun operator atau admin untuk mulai bertransaksi."}
              </p>
            </div>

            {/* 🔘 Google OAuth Button */}
            {isLogin && (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => signIn("google", { callbackUrl: "/" })}
                  className="w-full py-2.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-700 font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-sm"
                >
                  <FcGoogle className="text-base" />
                  <span>Lanjutkan dengan Google</span>
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-3 text-slate-400 font-medium">
                      atau dengan email
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 🧩 Form login/register */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama (Register only) */}
              {!isLogin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Contoh: Admin Toko"
                      required
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="nama@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
              >
                {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLogin ? "Masuk ke Sistem" : "Buat Akun Sekarang"}
              </button>
            </form>

            {/* Mobile toggle */}
            <div className="md:hidden mt-6 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-500 mb-2">
                {isLogin ? "Belum memiliki akun toko?" : "Sudah memiliki akun?"}
              </p>
              <button
                type="button"
                onClick={toggleForm}
                className="text-blue-700 font-semibold text-xs hover:underline"
              >
                {isLogin ? "Daftar Akun Baru" : "Masuk dengan akun yang ada"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
