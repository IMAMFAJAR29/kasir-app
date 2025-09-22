"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

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
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      console.log("Respon dari API login:", data);

      if (res.ok) {
        setMessage();

        // simpan user + token ke localStorage
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("token", data.token);

        // simpan juga ke cookies
        document.cookie = `token=${data.token}; path=/;`;
        document.cookie = `user=${encodeURIComponent(
          JSON.stringify(data.user)
        )}; path=/;`;

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
      setLoading(false);
    }
  };

  return (
    <section className="bg-gray-50 dark:bg-gray-900 min-h-screen flex items-center justify-center">
      <div className="w-full bg-white rounded-lg shadow dark:border sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
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
        </div>
      </div>
    </section>
  );
}
