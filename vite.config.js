import { defineConfig } from "vite";
export default defineConfig({
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      output: {
        manualChunks: { react: ["react", "react-dom"], three: ["three"] },
      },
    },
  },
  server: { host: "0.0.0.0", allowedHosts: ["terminal.local"], port: 4173 },
});
