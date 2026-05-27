import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const workspaceRoot = path.resolve(__dirname, "../..");
	const env = loadEnv(mode, workspaceRoot, "");
	const apiBase = env.VITE_API_BASE_URL;
	return {
		plugins: [
			tanstackRouter({
				routesDirectory: "src/routes",
				generatedRouteTree: "src/routeTree.gen.ts",
			}),
			react(),
			tailwindcss(),
		],
		resolve: {
			alias: { "@": path.resolve(__dirname, "src") },
		},
		server: {
			port: 5173,
			host: true,
			proxy: {
				"/api": { target: apiBase, changeOrigin: true, secure: false },
			},
		},
		build: { sourcemap: true, target: "es2022" },
	};
});
