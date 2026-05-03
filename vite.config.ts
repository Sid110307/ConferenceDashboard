import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteCompression from "vite-plugin-compression";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	base: "./",
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		},
	},
	plugins: [react(), tailwindcss(), viteCompression()],
});
