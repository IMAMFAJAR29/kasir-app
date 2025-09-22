"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
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
      // Login dengan credentials (email/password)
      const res = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
        callbackUrl: "/",
      });

      if (res?.error) {
        setMessage(`❌ ${res.error}`);
      } else {
        setMessage("✅ Login berhasil!");
        setTimeout(() => {
          router.replace(res.url || "/");
        }, 500);
      }
    } catch (err) {
      console.error("Error saat login:", err);
      setMessage("❌ Terjadi error di server");
    } finally {
      setLoading(false);
    }
  };

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
            {/* Email */}
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

            {/* Password */}
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

            {/* Button login */}
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
                "Sign in"
              )}
            </button>

            <p className="text-sm font-light text-gray-500 dark:text-gray-400">
              Tidak punya akun?{" "}
              <a
                href="/register"
                className="font-medium text-blue-600 hover:underline dark:text-blue-500"
              >
                Daftar Akun Baru
              </a>
            </p>
          </form>

          {/* Separator */}
          <div className="my-4 flex items-center justify-center">
            <span className="text-gray-400 text-sm">atau</span>
          </div>

          {/* Google Login */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-100 text-black border border-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 48 48"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.9 0 6.6 1.7 8.1 3.1l5.9-5.9C34.1 3.6 29.5 2 24 2 14.7 2 7 7.7 3.7 16.1l6.9 5.4C12.6 14 17.9 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.5 24.5c0-1.5-.1-2.9-.3-4.3H24v8.1h12.7c-.6 3-2.3 5.6-4.9 7.3l7.7 6c4.5-4.2 7-10.4 7-17.1z"
              />
              <path
                fill="#FBBC05"
                d="M10.6 28.3c-1-3-1-6.6 0-9.6l-6.9-5.4c-2.9 5.7-2.9 12.6 0 18.3l6.9-5.3z"
              />
              <path
                fill="#34A853"
                d="M24 46c6.5 0 12-2.1 16-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.3 2.3-6.1 0-11.4-4.1-13.4-9.7l-6.9 5.4C7 41.3 15 46 24 46z"
              />
            </svg>
            Login dengan Google
          </button>
        </div>
      </div>
    </section>
  );
}
