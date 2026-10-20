export default function manifest() {
  return {
    name: "Anima POS",
    short_name: "Anima POS",
    description: "Sistem kasir dan inventaris toko Anima POS.",
    start_url: "/pos?source=pwa",
    scope: "/",
    id: "/pos?source=pwa",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    orientation: "portrait",
    categories: ["shopping", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/Logo.png.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/Logo.png.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/Logo.png.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
