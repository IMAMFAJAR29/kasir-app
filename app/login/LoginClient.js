"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { FcGoogle, Loader2 } from "react-icons/fc"; // ✅ Ikon Google

export default function LoginClient() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
        callbackUrl: "/",
      });

      if (res?.error) {
        // friendly message
        const errStr = String(res.error || "").toLowerCase();
        const isCredentialIssue =
          /(credentials?|signin|user not found|invalid|401)/i.test(errStr);

        if (isCredentialIssue) {
          setMessage("Email atau password salah");
        } else {
          setMessage("Login gagal, coba lagi.");
        }

        setLoading(false); // stop loading kalau memang gagal
        return;
      }

      // sukses → langsung redirect
      router.replace(res.url || "/");
    } catch (err) {
      console.error("Error saat login:", err);
      setMessage("Terjadi error di server");
      setLoading(false);
    }
  };

  // === JSX Login Form ===
  <form onSubmit={handleSubmit} className="space-y-4">
    {/* Error Message */}
    {message && (
      <div className="p-3 rounded-lg text-sm border bg-red-100 text-red-700 border-red-300">
        ❌ {message}
      </div>
    )}

    {/* Input Email */}
    <input
      type="email"
      value={form.email}
      onChange={(e) => setForm({ ...form, email: e.target.value })}
      placeholder="Email"
      className="w-full p-2 border rounded-lg"
      required
    />

    {/* Input Password */}
    <input
      type="password"
      value={form.password}
      onChange={(e) => setForm({ ...form, password: e.target.value })}
      placeholder="Password"
      className="w-full p-2 border rounded-lg"
      required
    />

    {/* Tombol Login */}
    <button
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70"
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Login...</span>
        </>
      ) : (
        "Login"
      )}
    </button>
  </form>;
  return (
    <section className="bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
      <div className="w-full bg-white rounded-lg shadow sm:max-w-md xl:p-0 dark:bg-gray-800">
        <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
          <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
            LOGIN
          </h1>
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">
            Isi form dibawah untuk masuk ke akun anda
          </h2>

          {message && (
            <p
              className={`text-sm ${
                message.includes("✅") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}

          <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={handleChange}
                required
                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg 
                  focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 
                  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                  dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg 
                  focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 
                  dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 
                  dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 text-white 
                font-medium rounded-lg text-sm px-5 py-2.5 text-center transition
                ${
                  loading
                    ? "bg-gray-500 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                }`}
            >
              {loading ? "Loading..." : "Sign in"}
            </button>

            <p className="text-sm font-light text-gray-500 dark:text-gray-400">
              Tidak punya akun?{" "}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:underline dark:text-blue-500"
              >
                Daftar Akun Baru
              </Link>
            </p>
          </form>

          <div className="my-4 flex items-center justify-center">
            <span className="text-gray-400 text-sm">atau</span>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black border border-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 transition"
          >
            <FcGoogle className="text-lg" /> {}
            Login dengan Google
          </button>
        </div>
      </div>
    </section>
  );
}
