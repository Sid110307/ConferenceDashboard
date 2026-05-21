import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { defaultJobOptions, JOB_NAMES, reportsQueue } from "@/lib/queue";
import { presignDownloadUrl } from "@/lib/storage";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { files, reportJobs } from "@conference/db";
import { reportJobCreateSchema } from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

function clientIp(c: any) {
	return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

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
					status: "queued",
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
				ip: clientIp(c),
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
			if (r.status !== "completed" || !r.outputFileId) {
				throw new BadRequestError(`report not ready (status=${r.status})`);
			}
			const [f] = await tx.select().from(files).where(eq(files.id, r.outputFileId)).limit(1);
			if (!f) throw new NotFoundError("output file");
			return { f };
		});
		const url = await presignDownloadUrl(job.f.storageKey, 60 * 10);
		return c.json({ url, filename: job.f.filename });
	},
);
