import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

const cdnBase = process.env.BUNNY_CDN_URL?.replace(/\/+$/, "")
const base = process.env.NODE_ENV === "production" && cdnBase ? `${cdnBase}/` : "/"

export default defineConfig(async () => {
  return {
    plugins: [
      react(),
      ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
        ? [
          await import("@replit/vite-plugin-cartographer").then(m => m.cartographer()),
          await import("@replit/vite-plugin-dev-banner").then(m => m.devBanner()),
        ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    base,
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  }
})