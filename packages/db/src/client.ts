import { resolve } from "node:path";

import * as schema from "@/schema";
import { config as loadEnv } from "dotenv";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

const { Pool } = pg;
loadEnv({ path: resolve(import.meta.dirname, "../../../.env") });

const envUrl = process.env.DATABASE_URL;
const envDirectUrl = process.env.DATABASE_URL_DIRECT || envUrl;
const ssl = process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;

function ensure(url: string | undefined, name: string): string {
	if (!url) throw new Error(`${name} is not set`);
	return url;
}

const poolMax = Number(process.env.DATABASE_POOL_MAX ?? 20);
export const pgPool = new Pool({
	connectionString: ensure(envUrl, "DATABASE_URL"),
	max: poolMax,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 5000,
	ssl,
});

export const pgPoolDirect = new Pool({
	connectionString: ensure(envDirectUrl, "DATABASE_URL_DIRECT"),
	max: 2,
	ssl,
});

export const db: NodePgDatabase<typeof schema> = drizzle(pgPool, {
	schema,
	logger: process.env.LOG_LEVEL === "debug",
});

export const dbAdmin: NodePgDatabase<typeof schema> = drizzle(pgPoolDirect, {
	schema,
});

export type DB = typeof db;
export { schema };
