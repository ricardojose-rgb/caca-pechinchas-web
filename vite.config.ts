import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// Site: https://ricardojose-rgb.github.io/caca-pechinchas-web/
// "npm run build:demo" gera um único HTML com dados de exemplo (pré-visualização).
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "demo" ? [react(), viteSingleFile()] : [react()],
  define: { __DEMO__: JSON.stringify(mode === "demo") },
  build: mode === "demo" ? { outDir: "dist-demo" } : {},
}));
