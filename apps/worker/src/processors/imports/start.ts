import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { notifyConference } from "@/lib/notify";
import { db, withTenant } from "@/lib/tenancy";
import { attendees, importJobs, importRows, staff } from "@conference/db";
import { and, eq, sql } from "drizzle-orm";

type TargetEntity = "attendees" | "staff" | "travel_segments";

export async function processImportStart(payload: {
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

	const targetEntity = job.targetEntity as TargetEntity;
	const updateExisting = !!(job.options as any)?.update_existing;

	let imported = 0;
	let failed = 0;

	await withTenant(conferenceId, async tx => {
		const rows = await tx
			.select()
			.from(importRows)
			.where(and(eq(importRows.jobId, jobId), eq(importRows.status, "valid")));

		const batchSize = env.IMPORT_BATCH_SIZE;

		for (let i = 0; i < rows.length; i += batchSize) {
			const batch = rows.slice(i, i + batchSize);
			const inserts = batch.map(r => ({
				...(r.validatedData as Record<string, any>),
				conferenceId,
				createdBy: userId,
				updatedBy: userId,
			}));

			let inserted: { id: string }[] = [];

			try {
				if (targetEntity === "attendees") {
					const baseRows = await tx
						.select({ n: sql<number>`count(*)::int` })
						.from(attendees)
						.where(eq(attendees.conferenceId, conferenceId));
					const start = (baseRows[0]?.n ?? 0) + 1;
					inserts.forEach((row, idx) => {
						if (!row.attendeeCode) {
							row.attendeeCode = `IMP-${String(start + idx).padStart(5, "0")}`;
						}
					});
					inserted = await tx
						.insert(attendees)
						.values(inserts as any)
						.onConflictDoNothing({ target: attendees.attendeeCode })
						.returning({ id: attendees.id });
				} else if (targetEntity === "staff") {
					inserted = await tx
						.insert(staff)
						.values(inserts as any)
						.returning({ id: staff.id });
				} else {
					for (const row of inserts) {
						try {
							const [insertedRow] = await tx
								.insert(attendees)
								.values(row as any)
								.onConflictDoNothing({ target: attendees.attendeeCode })
								.returning({ id: attendees.id });
							if (insertedRow?.id) {
								inserted.push({ id: insertedRow.id });
							}
						} catch (err) {
							logger.error({ err, jobId, rowId: row.id }, "failed to insert row");
							await tx
								.update(importRows)
								.set({
									status: "failed",
									errors: { _insert: (err as Error).message },
								})
								.where(eq(importRows.id, row.id));
							failed++;
						}
					}
				}
			} catch (err) {
				logger.error({ err, jobId, batchStart: i }, "batch insert failed");
				for (const r of batch) {
					await tx
						.update(importRows)
						.set({
							status: "failed",
							errors: { _insert: (err as Error).message },
						})
						.where(eq(importRows.id, r.id));
				}
				failed += batch.length;
				continue;
			}

			for (let j = 0; j < batch.length; j++) {
				const targetId = inserted[j]?.id;
				const row = batch[j]!;
				if (targetId) {
					await tx
						.update(importRows)
						.set({ status: "imported", targetId })
						.where(eq(importRows.id, row.id));
					imported++;
				} else {
					await tx
						.update(importRows)
						.set({
							status: "failed",
							errors: { _insert: "no row inserted, possible conflict" },
						})
						.where(eq(importRows.id, row.id));
					failed++;
				}
			}

			await tx
				.update(importJobs)
				.set({
					processedRowCount: imported + failed,
					importedRowCount: imported,
					updatedAt: new Date(),
				})
				.where(eq(importJobs.id, jobId));

			await notifyConference(tx, conferenceId, {
				type: "import.progress",
				entity: "import_job",
				id: jobId,
				meta: {
					imported,
					failed,
					total: rows.length,
				},
			});
		}

		const finalStatus = failed === 0 ? "completed" : imported > 0 ? "with_errors" : "failed";
		await tx
			.update(importJobs)
			.set({
				status: finalStatus,
				completedAt: new Date(),
				processedRowCount: imported + failed,
				importedRowCount: imported,
				failedRowCount: failed,
				updatedAt: new Date(),
			})
			.where(eq(importJobs.id, jobId));

		await notifyConference(tx, conferenceId, {
			type: "import.completed",
			entity: "import_job",
			id: jobId,
			meta: { imported, failed, finalStatus },
		});
	});

	logger.info({ jobId, imported, failed, target: targetEntity }, "import complete");
	return { imported, failed };
}
