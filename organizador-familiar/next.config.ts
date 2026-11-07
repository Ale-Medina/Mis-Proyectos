import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Esta app es 100% dinámica (sesión por cookie + datos en DB que cambian
  // todo el tiempo), así que usamos el modelo de renderizado clásico en vez
  // de Cache Components para evitar prerender estático accidental.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
