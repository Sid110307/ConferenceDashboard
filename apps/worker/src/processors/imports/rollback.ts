import { env } from "@/lib/env";
import { notifyConference } from "@/lib/notify";
import { db, withTenant } from "@/lib/tenancy";
import { attendees, importJobs, importRows, staff, travelSegments } from "@conference/db";
import { createLogger } from "@conference/infra";
import { and, eq, inArray, isNotNull } from "drizzle-orm";

const logger = createLogger({
	level: env.LOG_LEVEL,
	service: "@conference/worker",
	env: env.NODE_ENV,
});

export async function processImportRollback(payload: {
	jobId: string;
	conferenceId: string;
	userId: string;
}) {
	const { jobId, conferenceId, userId } = payload;

	const job = await db
		.select()
		.from(importJobs)
		.where(eq(importJobs.id, jobId))
		.limit(1)
		.then(r => r[0]);
	if (!job) throw new Error(`import job ${jobId} not found`);

	const targetEntity = job.targetEntity;
	let deleted = 0;

	await withTenant(conferenceId, async tx => {
		const rows = await tx
			.select({ targetId: importRows.targetId })
			.from(importRows)
			.where(
				and(
					eq(importRows.jobId, jobId),
					eq(importRows.status, "imported"),
					isNotNull(importRows.targetId),
				),
			);
		const ids = rows.map(r => r.targetId!).filter(Boolean);
		if (ids.length) {
			const target =
				targetEntity === "attendees"
					? attendees
					: targetEntity === "staff"
						? staff
						: targetEntity === "travel_segments"
							? travelSegments
							: null;
			if (target) {
				const result = await tx
					.update(target as any)
					.set({ deletedAt: new Date(), deletedBy: userId })
					.where(inArray((target as any).id, ids));
				deleted = (result as any).rowCount ?? ids.length;
			}

			await tx
				.update(importRows)
				.set({ status: "skipped" })
				.where(and(eq(importRows.jobId, jobId), eq(importRows.status, "imported")));
		}

		await tx
			.update(importJobs)
			.set({
				status: "rolled_back",
				updatedAt: new Date(),
			})
			.where(eq(importJobs.id, jobId));

		await notifyConference(tx, conferenceId, {
			type: "import.rolled_back",
			entity: "import_job",
			id: jobId,
			meta: { deleted },
		});
	});

	logger.info({ jobId, deleted, target: targetEntity }, "rollback complete");
	return { deleted };
}
