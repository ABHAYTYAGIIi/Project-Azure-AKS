import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  const base = environment.VITE_APP_BASE_PATH || "/autocare/";

  return {
    base: base.endsWith("/") ? base : `${base}/`,
    plugins: [react()],
    server: { port: 5173 }
  };
});
