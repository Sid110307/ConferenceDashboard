import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { notifyConference } from "@/lib/notify";
import { getObjectBuffer } from "@/lib/storage";
import { db, withTenant } from "@/lib/tenancy";
import { parseCSV } from "@/processors/imports/parsers/csv";
import { parseXLSX } from "@/processors/imports/parsers/xlsx";
import { validatorFor } from "@/processors/imports/validators";
import { attendees, files, importJobs, importRows } from "@conference/db";
import { and, eq, isNull } from "drizzle-orm";

export async function processImportPreview(payload: {
	jobId: string;
	conferenceId: string;
	userId: string;
}) {
	const { jobId, conferenceId } = payload;

	const job = await db
		.select()
		.from(importJobs)
		.where(eq(importJobs.id, jobId))
		.limit(1)
		.then((r: any) => r[0]);
	if (!job) throw new Error(`import job ${jobId} not found`);
	if (!job.fileId) throw new Error("import job has no fileId");

	const [file] = await db.select().from(files).where(eq(files.id, job.fileId)).limit(1);
	if (!file) throw new Error(`file ${job.fileId} not found`);

	const buf = await getObjectBuffer(file.storageKey);
	const ext = (file.filename.split(".").pop() ?? "").toLowerCase();
	const table = ext === "csv" ? parseCSV(buf) : await parseXLSX(buf);

	if (table.rows.length > env.IMPORT_MAX_ROWS) {
		await db
			.update(importJobs)
			.set({
				status: "failed",
				errorMessage: `exceeds IMPORT_MAX_ROWS (${env.IMPORT_MAX_ROWS})`,
				updatedAt: new Date(),
			})
			.where(eq(importJobs.id, jobId));
		throw new Error("file too large");
	}

	if (!job.columnMapping) {
		await withTenant(conferenceId, async tx => {
			await tx.delete(importRows).where(eq(importRows.jobId, jobId));
			await tx
				.update(importJobs)
				.set({
					sourceColumns: table.headers,
					totalRowCount: table.rows.length,
					validRowCount: 0,
					invalidRowCount: 0,
					duplicateRowCount: 0,
					processedRowCount: 0,
					status: "mapping",
					updatedAt: new Date(),
				})
				.where(eq(importJobs.id, jobId));

			await notifyConference(tx, conferenceId, {
				type: "import.columns_detected",
				entity: "import_job",
				id: jobId,
				meta: { columns: table.headers.length, rows: table.rows.length },
			});
		});
		logger.info(
			{ jobId, columns: table.headers.length },
			"import columns detected (awaiting mapping)",
		);
		return { valid: 0, invalid: 0, duplicate: 0, detected: true };
	}

	const validate = validatorFor(job.targetEntity);
	const mapping = job.columnMapping as Record<string, string>;
	const opts = (job.options ?? {}) as Record<string, any>;
	const dedupeBy: string | undefined = opts.dedupe_by;

	let valid = 0;
	let invalid = 0;
	let duplicate = 0;

	await withTenant(conferenceId, async tx => {
		await tx.delete(importRows).where(eq(importRows.jobId, jobId));
		await tx
			.update(importJobs)
			.set({
				sourceColumns: table.headers,
				totalRowCount: table.rows.length,
				validRowCount: 0,
				invalidRowCount: 0,
				duplicateRowCount: 0,
				processedRowCount: 0,
				updatedAt: new Date(),
			})
			.where(eq(importJobs.id, jobId));

		const dupes = new Set<string>();
		if (dedupeBy && job.targetEntity === "attendees") {
			const col =
				dedupeBy === "email"
					? attendees.email
					: dedupeBy === "phone"
						? attendees.phone
						: null;
			if (col) {
				const rows = await tx
					.select({ v: col })
					.from(attendees)
					.where(
						and(eq(attendees.conferenceId, conferenceId), isNull(attendees.deletedAt)),
					);
				for (const r of rows) {
					if (r.v) dupes.add(String(r.v).toLowerCase());
				}
			}
		}

		const batchSize = env.IMPORT_BATCH_SIZE;
		const rowsBuffer: any[] = [];

		const flush = async () => {
			if (!rowsBuffer.length) return;
			await tx.insert(importRows).values(rowsBuffer);
			rowsBuffer.length = 0;
		};

		for (let i = 0; i < table.rows.length; i++) {
			const raw = table.rows[i]!;
			const rowNumber = i + 2;
			const r = validate(raw, mapping);
			if (!r.ok) {
				invalid++;
				rowsBuffer.push({
					jobId,
					rowNumber,
					rawData: raw,
					validatedData: null,
					status: "invalid" as const,
					errors: r.errors,
				});
			} else {
				let isDupe = false;
				if (dedupeBy && r.value[dedupeBy]) {
					const key = String(r.value[dedupeBy]).toLowerCase();
					if (dupes.has(key)) isDupe = true;
				}
				if (isDupe) {
					duplicate++;
					rowsBuffer.push({
						jobId,
						rowNumber,
						rawData: raw,
						validatedData: r.value,
						status: "duplicate" as const,
						errors: { _dupe: `duplicate ${dedupeBy}` },
					});
				} else {
					valid++;
					rowsBuffer.push({
						jobId,
						rowNumber,
						rawData: raw,
						validatedData: r.value,
						status: "valid" as const,
						errors: null,
					});
				}
			}
			if (rowsBuffer.length >= batchSize) await flush();
		}
		await flush();

		await tx
			.update(importJobs)
			.set({
				status: "previewed",
				validRowCount: valid,
				invalidRowCount: invalid,
				duplicateRowCount: duplicate,
				updatedAt: new Date(),
			})
			.where(eq(importJobs.id, jobId));

		await notifyConference(tx, conferenceId, {
			type: "import.previewed",
			entity: "import_job",
			id: jobId,
			meta: { valid, invalid, duplicate },
		});
	});

	logger.info({ jobId, valid, invalid, duplicate }, "import preview done");
	return { valid, invalid, duplicate };
}
