import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  base: "/staff/",
  server: {
    port: 5175,
  },
  build: {
    outDir: fileURLToPath(new URL("../../backend/public/staff", import.meta.url)),
    emptyOutDir: true,
  },
});
