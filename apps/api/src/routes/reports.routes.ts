import { createHash } from "node:crypto";
import { Readable } from "node:stream";

import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { getClientIp } from "@/lib/http";
import { defaultJobOptions, JOB_NAMES, reportsQueue } from "@/lib/queue";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { files, reportJobs } from "@conference/db";
import { getSignedDownloadUrl, s3 } from "@conference/infra";
import { reportJobCreateSchema } from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const reportsRouter = new Hono<AppContext>();

reportsRouter.get("/", requireRole("viewer"), async c => {
	const conf = c.get("conference")!;
	const rows = await withTenant(conf.id, async tx =>
		tx
			.select()
			.from(reportJobs)
			.where(eq(reportJobs.conferenceId, conf.id))
			.orderBy(desc(reportJobs.createdAt))
			.limit(100),
	);
	return c.json({ data: rows });
});

reportsRouter.get(
	"/:id",
	requireRole("viewer"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const { id } = c.req.valid("param");
		const row = await withTenant(conf.id, async tx => {
			const [r] = await tx
				.select()
				.from(reportJobs)
				.where(and(eq(reportJobs.id, id), eq(reportJobs.conferenceId, conf.id)))
				.limit(1);
			return r;
		});
		if (!row) throw new NotFoundError("report job");
		return c.json({ data: row });
	},
);

reportsRouter.post(
	"/",
	requireRole("viewer"),
	zValidator("json", reportJobCreateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");

		const job = await withTenant(conf.id, async tx => {
			const [r] = await tx
				.insert(reportJobs)
				.values({
					conferenceId: conf.id,
					reportType: input.reportType,
					name: input.name,
					format: input.format,
					filters: input.filters,
					columns: input.columns,
					status: "pending",
					createdBy: user.id,
					updatedBy: user.id,
				})
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "export",
				entity: "report_job",
				entityId: r!.id,
				meta: { reportType: input.reportType, format: input.format },
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return r;
		});

		await reportsQueue.add(
			JOB_NAMES.REPORT_GENERATE,
			{ jobId: job!.id, conferenceId: conf.id, userId: user.id },
			defaultJobOptions,
		);

		return c.json({ data: job }, 201);
	},
);

reportsRouter.get(
	"/:id/download",
	requireRole("viewer"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const { id } = c.req.valid("param");
		const job = await withTenant(conf.id, async tx => {
			const [r] = await tx
				.select()
				.from(reportJobs)
				.where(and(eq(reportJobs.id, id), eq(reportJobs.conferenceId, conf.id)))
				.limit(1);
			if (!r) throw new NotFoundError("report job");
			if (r.status !== "completed" || !r.fileId) {
				throw new BadRequestError(`report not ready (status=${r.status})`);
			}
			const [f] = await tx.select().from(files).where(eq(files.id, r.fileId)).limit(1);
			if (!f) throw new NotFoundError("output file");
			return { f };
		});
		const url = await getSignedDownloadUrl(job.f.storageKey, 60 * 10);

		if (job.f.checksum) {
			const hash = createHash("sha256");
			const stream = await s3
				.send(
					new GetObjectCommand({
						Bucket: process.env.STORAGE_BUCKET,
						Key: job.f.storageKey,
					}),
				)
				.then(r => r.Body as Readable);
			await new Promise((resolve, reject) => {
				stream.on("data", chunk => hash.update(chunk));
				stream.on("end", resolve);
				stream.on("error", reject);
			});

			const calculatedChecksum = hash.digest("hex");
			if (calculatedChecksum !== job.f.checksum)
				throw new Error("File integrity check failed: checksum does not match");
		}

		return c.json({ url, filename: job.f.filename });
	},
);
