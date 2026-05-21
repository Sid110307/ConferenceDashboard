import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { defaultJobOptions, importsQueue, JOB_NAMES } from "@/lib/queue";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { files, importJobs, importRows } from "@conference/db";
import {
	importJobActionSchema,
	importJobCreateSchema,
	importJobMappingSchema,
} from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

function clientIp(c: any) {
	return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export const importsRouter = new Hono<AppContext>();

importsRouter.get("/", requireRole("editor"), async c => {
	const conf = c.get("conference")!;
	const rows = await withTenant(conf.id, async tx =>
		tx
			.select()
			.from(importJobs)
			.where(eq(importJobs.conferenceId, conf.id))
			.orderBy(desc(importJobs.createdAt))
			.limit(100),
	);
	return c.json({ data: rows });
});

importsRouter.get(
	"/:id",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const { id } = c.req.valid("param");
		const row = await withTenant(conf.id, async tx => {
			const [r] = await tx
				.select()
				.from(importJobs)
				.where(and(eq(importJobs.id, id), eq(importJobs.conferenceId, conf.id)))
				.limit(1);
			return r;
		});
		if (!row) throw new NotFoundError("import job");
		return c.json({ data: row });
	},
);

importsRouter.get(
	"/:id/rows",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator(
		"query",
		z.object({
			status: z
				.enum(["pending", "valid", "invalid", "duplicate", "imported", "failed", "skipped"])
				.optional(),
			page: z.coerce.number().int().min(1).default(1),
			pageSize: z.coerce.number().int().min(1).max(200).default(50),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const { id } = c.req.valid("param");
		const q = c.req.valid("query");
		const result = await withTenant(conf.id, async tx => {
			const parts: any[] = [eq(importRows.jobId, id)];
			if (q.status) parts.push(eq(importRows.status, q.status));
			const data = await tx
				.select()
				.from(importRows)
				.where(and(...parts))
				.orderBy(importRows.rowNumber)
				.limit(q.pageSize)
				.offset((q.page - 1) * q.pageSize);
			return data;
		});
		return c.json({ data: result });
	},
);

importsRouter.post(
	"/",
	requireRole("editor"),
	zValidator("json", importJobCreateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");

		const created = await withTenant(conf.id, async tx => {
			const [f] = await tx.select().from(files).where(eq(files.id, input.fileId)).limit(1);
			if (!f) throw new NotFoundError("file");
			if (f.conferenceId && f.conferenceId !== conf.id) {
				throw new ForbiddenError("file does not belong to this conference");
			}

			const [job] = await tx
				.insert(importJobs)
				.values({
					conferenceId: conf.id,
					targetEntity: input.targetEntity,
					fileId: input.fileId,
					sourceFilename: f.originalFilename ?? f.filename,
					status: "uploaded",
					createdBy: user.id,
					updatedBy: user.id,
				})
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: "import_job",
				entityId: job!.id,
				after: job,
				ip: clientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return job;
		});

		return c.json({ data: created }, 201);
	},
);

importsRouter.post(
	"/:id/mapping",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", importJobMappingSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const input = c.req.valid("json");

		const row = await withTenant(conf.id, async tx => {
			const [job] = await tx
				.select()
				.from(importJobs)
				.where(and(eq(importJobs.id, id), eq(importJobs.conferenceId, conf.id)))
				.limit(1);
			if (!job) throw new NotFoundError("import job");
			if (
				!["uploaded", "mapping", "previewing", "previewed", "with_errors"].includes(
					job.status,
				)
			) {
				throw new BadRequestError(`cannot edit mapping in status ${job.status}`);
			}

			const [updated] = await tx
				.update(importJobs)
				.set({
					columnMapping: input.mapping,
					options: input.options,
					status: "mapping",
					updatedBy: user.id,
					updatedAt: new Date(),
				})
				.where(eq(importJobs.id, id))
				.returning();
			return updated;
		});
		return c.json({ data: row });
	},
);

importsRouter.post(
	"/:id/action",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", importJobActionSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const m = c.get("membership")!;
		const { id } = c.req.valid("param");
		const { action } = c.req.valid("json");

		const dispatch = await withTenant(conf.id, async tx => {
			const [job] = await tx
				.select()
				.from(importJobs)
				.where(and(eq(importJobs.id, id), eq(importJobs.conferenceId, conf.id)))
				.limit(1);
			if (!job) throw new NotFoundError("import job");

			if (action === "preview") {
				if (!["uploaded", "mapping", "previewing"].includes(job.status)) {
					throw new BadRequestError(`cannot preview in status ${job.status}`);
				}
				await tx
					.update(importJobs)
					.set({
						status: "previewing",
						updatedBy: user.id,
						updatedAt: new Date(),
					})
					.where(eq(importJobs.id, id));
				return { jobName: JOB_NAMES.IMPORT_PREVIEW };
			}

			if (action === "start") {
				if (
					!["mapping", "previewing", "previewed", "with_errors"].includes(job.status) ||
					!job.columnMapping
				) {
					throw new BadRequestError("mapping required before start");
				}
				await tx
					.update(importJobs)
					.set({
						status: "importing",
						startedAt: new Date(),
						updatedBy: user.id,
						updatedAt: new Date(),
					})
					.where(eq(importJobs.id, id));
				return { jobName: JOB_NAMES.IMPORT_START };
			}

			if (action === "cancel") {
				if (["completed", "cancelled", "rolled_back"].includes(job.status)) {
					throw new BadRequestError(`cannot cancel ${job.status} job`);
				}
				await tx
					.update(importJobs)
					.set({
						status: "cancelled",
						completedAt: new Date(),
						updatedBy: user.id,
						updatedAt: new Date(),
					})
					.where(eq(importJobs.id, id));
				return null;
			}

			if (action === "rollback") {
				if (m.role !== "admin" && m.role !== "super_admin") {
					throw new ForbiddenError("rollback requires admin");
				}
				if (job.status !== "completed" && job.status !== "with_errors") {
					throw new BadRequestError(`cannot rollback ${job.status} job`);
				}
				await tx
					.update(importJobs)
					.set({
						status: "rolling_back",
						updatedBy: user.id,
						updatedAt: new Date(),
					})
					.where(eq(importJobs.id, id));
				return { jobName: JOB_NAMES.IMPORT_ROLLBACK };
			}

			return null;
		});

		if (dispatch?.jobName) {
			await importsQueue.add(
				dispatch.jobName,
				{ jobId: id, conferenceId: conf.id, userId: user.id },
				defaultJobOptions,
			);
		}

		return c.json({ action, queued: !!dispatch });
	},
);
