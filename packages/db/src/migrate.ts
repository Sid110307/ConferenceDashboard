import { resolve } from "node:path";

import { dbAdmin, pgPoolDirect } from "@/client";
import { applyRowLevelSecurity } from "./schema/rls";
import { config as loadEnv } from "dotenv";
import { migrate } from "drizzle-orm/node-postgres/migrator";

console.log(resolve(import.meta.dirname));

loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

async function main() {
	const start = Date.now();

	console.log("Starting migration...");
	await migrate(dbAdmin, { migrationsFolder: "./drizzle" });

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
