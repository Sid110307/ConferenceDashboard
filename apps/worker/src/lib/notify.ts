import type { TenantTx } from "@/lib/tenancy";
import { sql } from "drizzle-orm";

export type NotifyPayload = {
	type: string;
	entity?: string;
	id?: string;
	meta?: Record<string, unknown>;
};

export async function notifyConference(tx: TenantTx, conferenceId: string, payload: NotifyPayload) {
	const channel = `conf:${conferenceId}`;
	const json = JSON.stringify({ ...payload, ts: new Date().toISOString() });

	await tx.execute(sql`SELECT pg_notify(${channel}, ${json})`);
}
