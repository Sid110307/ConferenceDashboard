import { logger } from "@/lib/logger";
import { db } from "@/lib/tenancy";
import { invitations, verificationTokens } from "@conference/db";
import { and, eq, lt, sql } from "drizzle-orm";

export async function processCleanOldTokens() {
	const now = new Date();

	const v = await db.delete(verificationTokens).where(lt(verificationTokens.expiresAt, now));
	const verificationDeleted = (v as any).rowCount ?? 0;

	const i = await db
		.update(invitations)
		.set({ status: "expired", updatedAt: new Date() })
		.where(and(lt(invitations.expiresAt, now), eq(invitations.status, "pending")));
	const invitationsExpired = (i as any).rowCount ?? 0;

	logger.info({ verificationDeleted, invitationsExpired }, "maintenance: tokens cleaned");
	return { verificationDeleted, invitationsExpired };
}

export async function processRefreshDashboard() {
	// Placeholder. If/when materialised views are introduced for the
	// conference dashboard, REFRESH MATERIALIZED VIEW CONCURRENTLY goes here.
	await db.execute(sql`SELECT 1`);
	return { ok: true };
}
