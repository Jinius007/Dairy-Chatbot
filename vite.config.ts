import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const catalystProxyTarget = env.CATALYST_SERVE_URL || "http://localhost:3000";
  const catalystProxyPath = env.CATALYST_SERVE_PATH || "/server/pashumitra_api";

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
      proxy: {
        "/catalyst-api": {
          target: catalystProxyTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/catalyst-api/, catalystProxyPath),
        },
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
