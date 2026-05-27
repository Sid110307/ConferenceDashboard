import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { env } from "@/lib/env";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { getClientIp } from "@/lib/http";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { files } from "@conference/db";
import {
	deleteObject,
	headObject as objectExists,
	getSignedDownloadUrl as presignDownloadUrl,
	getSignedUploadUrl as presignUploadUrl,
	storageKey,
} from "@conference/infra";
import { LIMITS } from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { createId } from "@paralleldrive/cuid2";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

const ALLOWED_MIME = new Set([
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/svg+xml",
	"application/pdf",
	"application/json",
	"text/csv",
	"text/plain",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const PURPOSES = [
	"avatar",
	"speaker_photo",
	"sponsor_logo",
	"conference_logo",
	"banner",
	"document",
	"mou",
	"import_source",
	"report_output",
	"attendee_doc",
	"misc",
] as const;

export const filesRouter = new Hono<AppContext>();

filesRouter.post(
	"/presign",
	requireRole("editor"),
	zValidator(
		"json",
		z.object({
			filename: z.string().min(1).max(255),
			contentType: z.string().min(1).max(120),
			size: z.number().int().min(1).max(LIMITS.MAX_FILE_BYTES),
			purpose: z.enum(PURPOSES).default("misc"),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");

		if (!ALLOWED_MIME.has(input.contentType)) {
			throw new BadRequestError(`Unsupported content type ${input.contentType}`);
		}

		const fileId = createId();
		const key = storageKey({
			conferenceId: conf.id,
			purpose: input.purpose,
			fileId,
			filename: input.filename,
		});

		const uploadUrl = await presignUploadUrl(key, input.contentType, 60 * 10);
		const fileRow = await withTenant(conf.id, async tx => {
			const [row] = await tx
				.insert(files)
				.values({
					conferenceId: conf.id,
					purpose: input.purpose,
					filename: input.filename,
					mimeType: input.contentType,
					sizeBytes: input.size,
					storageBucket: env.S3_BUCKET,
					storageKey: key,
					uploadedByUserId: user.id,
				})
				.returning();
			return row;
		});

		return c.json({
			fileId: fileRow!.id,
			uploadUrl,
			key,
			expiresIn: 60 * 10,
		});
	},
);

filesRouter.post(
	"/:id/commit",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");

		const row = await withTenant(conf.id, async tx => {
			const [f] = await tx
				.select()
				.from(files)
				.where(and(eq(files.id, id), eq(files.conferenceId, conf.id)))
				.limit(1);
			if (!f) throw new NotFoundError("file");

			const exists = await objectExists(f.storageKey);
			if (!exists) {
				throw new BadRequestError("Object not present in storage yet");
			}

			const [updated] = await tx
				.update(files)
				.set({ publicUrl: `/${f.storageKey}` })
				.where(eq(files.id, id))
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: "file",
				entityId: id,
				after: updated,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return updated;
		});

		return c.json({ data: row });
	},
);

filesRouter.get(
	"/:id/download",
	requireRole("viewer"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const { id } = c.req.valid("param");
		const f = await withTenant(conf.id, async tx => {
			const [r] = await tx
				.select()
				.from(files)
				.where(and(eq(files.id, id), eq(files.conferenceId, conf.id)))
				.limit(1);
			return r;
		});
		if (!f) throw new NotFoundError("file");
		const url = await presignDownloadUrl(f.storageKey, 60 * 15);
		return c.json({
			url,
			filename: f.filename,
			contentType: f.mimeType,
			sizeBytes: f.sizeBytes,
		});
	},
);

filesRouter.delete(
	"/:id",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("query", z.object({ purge: z.coerce.boolean().optional() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const m = c.get("membership")!;
		const { id } = c.req.valid("param");
		const { purge } = c.req.valid("query");
		if (purge && m.role !== "super_admin") {
			throw new BadRequestError("Purge requires super_admin");
		}
		await withTenant(conf.id, async tx => {
			const [f] = await tx
				.select()
				.from(files)
				.where(and(eq(files.id, id), eq(files.conferenceId, conf.id)))
				.limit(1);
			if (!f) throw new NotFoundError("file");

			await tx.update(files).set({ deletedAt: new Date() }).where(eq(files.id, id));

			if (purge) {
				await deleteObject(f.storageKey);
				await tx.delete(files).where(eq(files.id, id));
			}

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: purge ? "purge" : "delete",
				entity: "file",
				entityId: id,
				before: f,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
		});
		return c.json({ deleted: true, purged: !!purge });
	},
);
