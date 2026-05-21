/* eslint-disable */

const { resolve } = require("node:path");
const { config: loadEnv } = require("dotenv");
const { defineConfig } = require("drizzle-kit");

loadEnv({ path: resolve(__dirname, "../../.env") });

const directUrl = process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
if (!directUrl) {
	throw new Error("DATABASE_URL or DATABASE_URL_DIRECT environment variable is required");
}

module.exports = defineConfig({
	schema: "./src/schema/index.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: { url: directUrl },
	verbose: true,
	strict: true,
	migrations: {
		schema: "public",
		table: "__drizzle_migrations",
	},
});
