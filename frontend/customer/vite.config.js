import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
  },
  build: {
    outDir: fileURLToPath(new URL("../../backend/public/customer", import.meta.url)),
    emptyOutDir: true,
  },
});
