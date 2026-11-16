/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["read-excel-file"],
  images: {
    remotePatterns: [
      // Gambar dari Postimg
      {
        protocol: "https",
        hostname: "i.postimg.cc",
        pathname: "/**",
      },
      // Gambar dari Cloudinary
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  experimental: {
    serverActions: {
      // Batas body upload (form/file)
      bodySizeLimit: "5mb",
    },
  },

  // ⚙️ Tambahan untuk mempercepat development
  typescript: {
    // ❗ Lewati type checking di dev agar startup lebih cepat
    ignoreBuildErrors: true,
  },

  eslint: {
    // ❗ Lewati linting di dev agar hot reload & start lebih cepat
    ignoreDuringBuilds: true,
  },

  // 🚀 Opsional: aktifkan TurboPack (lebih cepat di Next 15)
  // kamu juga bisa jalankan: npm run dev -- --turbo
  // future: { webpack5: true }, // hanya untuk versi lama Next
};

export default nextConfig;
