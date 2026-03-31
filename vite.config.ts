import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const cdnBase = process.env.BUNNY_CDN_URL?.replace(/\/+$/, "");
const base =
  process.env.NODE_ENV === "production" && cdnBase ? `${cdnBase}/` : "/";
const projectDir =
  typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {

  return {
    plugins: [
      react(),
      ...(process.env.NODE_ENV !== "production" &&
      process.env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer(),
            ),
            await import("@replit/vite-plugin-dev-banner").then((m) =>
              m.devBanner(),
            ),
          ]
        : []),
    ],
    resolve: {
      alias: {
        "@": path.resolve(projectDir, "client", "src"),
        "@shared": path.resolve(projectDir, "shared"),
        "@assets": path.resolve(projectDir, "attached_assets"),
      },
    },
    base,
    root: path.resolve(projectDir, "client"),
    build: {
      outDir: path.resolve(projectDir, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
  };
});
