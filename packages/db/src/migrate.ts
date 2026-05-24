import { config as loadEnv } from "dotenv";

import { resolve } from "node:path";

import { dbAdmin, pgPoolDirect } from "@/client";
import { applyDatabaseFunctions } from "@/schema/functions";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { applyRowLevelSecurity } from "./schema/rls";


loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

async function main() {
	const start = Date.now();

	console.log("Starting migration...");
	await migrate(dbAdmin, { migrationsFolder: "./drizzle" });

	console.log("Applying database functions...");
	await applyDatabaseFunctions(dbAdmin);

	console.log("Applying RLS policies...");
	await applyRowLevelSecurity(dbAdmin);

	const ms = Date.now() - start;
	console.log(`Done in ${ms}ms`);
}

main()
	.catch(err => {
		console.error("Migration failed:", err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await pgPoolDirect.end();
	});
