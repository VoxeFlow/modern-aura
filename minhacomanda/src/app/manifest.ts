import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MinhaComanda",
    short_name: "MinhaComanda",
    description: "Pedidos por QR Code para bares e restaurantes",
    start_url: "/",
    display: "standalone",
    background_color: "#fffdf7",
    theme_color: "#0f172a",
    lang: "pt-BR",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
