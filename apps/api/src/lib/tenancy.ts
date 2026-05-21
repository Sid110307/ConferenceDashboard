import { db, schema } from "@conference/db";
import { sql } from "drizzle-orm";
import type { NodePgDatabase, NodePgTransaction } from "drizzle-orm/node-postgres";

export type AppDb = NodePgDatabase<typeof schema>;
export type TenantTx = NodePgTransaction<typeof schema, any>;

export async function withTenant<T>(
	conferenceId: string,
	fn: (tx: TenantTx) => Promise<T>,
): Promise<T> {
	return await db.transaction(async tx => {
		await tx.execute(sql`SELECT set_active_conference(${conferenceId}::uuid)`);
		return await fn(tx);
	});
}

export async function withPlatform<T>(fn: (tx: TenantTx) => Promise<T>): Promise<T> {
	return await db.transaction(async tx => {
		return await fn(tx);
	});
}

export { db };
