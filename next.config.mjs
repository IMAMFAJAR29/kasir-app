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

  // Type-check dan lint dijalankan saat build agar build hijau benar-benar
  // mencerminkan kualitas kode. Warning lint tidak menggagalkan build.

  // 🚀 Opsional: aktifkan TurboPack (lebih cepat di Next 15)
  // kamu juga bisa jalankan: npm run dev -- --turbo
  // future: { webpack5: true }, // hanya untuk versi lama Next
};

export default nextConfig;
