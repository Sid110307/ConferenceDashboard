import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { db } from "@/lib/tenancy";
import { requireAuth, requirePlatformAdmin } from "@/middleware/auth";
import { conferences, userConferenceRoles } from "@conference/db";
import {
	conferenceCreateSchema,
	conferenceUpdateSchema,
	paginationQuerySchema,
} from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const conferencesRouter = new Hono<AppContext>();

conferencesRouter.get(
	"/",
	requireAuth,
	zValidator(
		"query",
		paginationQuerySchema.extend({
			q: z.string().trim().optional(),
			status: z.enum(["draft", "active", "concluded", "archived"]).optional(),
		}),
	),
	async c => {
		const user = c.get("user")!;
		const { page, pageSize, q, status, order } = c.req.valid("query");
		const offset = (page - 1) * pageSize;

		const whereParts = [isNull(conferences.deletedAt)];
		if (status) whereParts.push(eq(conferences.conferenceStatus, status));
		if (q) {
			whereParts.push(
				sql`(${conferences.name} ILIKE ${`%${q}%`} OR ${conferences.slug} ILIKE ${`%${q}%`})`,
			);
		}

		if (!user.isPlatformAdmin) {
			whereParts.push(
				sql`EXISTS (
					SELECT 1 FROM ${userConferenceRoles} ucr
					 WHERE ucr.conference_id = ${conferences.id}
					   AND ucr.user_id = ${user.id}
					   AND ucr.is_active = true
				)`,
			);
		}

		const data = await db
			.select()
			.from(conferences)
			.where(and(...whereParts))
			.orderBy(order === "asc" ? conferences.startDate : desc(conferences.startDate))
			.limit(pageSize)
			.offset(offset);

		const totalRow = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(conferences)
			.where(and(...whereParts));
		const total = totalRow[0]?.count ?? 0;

		return c.json({
			data,
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.max(1, Math.ceil(total / pageSize)),
				hasNextPage: page * pageSize < total,
			},
		});
	},
);

conferencesRouter.get(
	"/:slug",
	requireAuth,
	zValidator("param", z.object({ slug: z.string() })),
	async c => {
		const user = c.get("user")!;
		const { slug } = c.req.valid("param");

		const [conf] = await db
			.select()
			.from(conferences)
			.where(and(eq(conferences.slug, slug), isNull(conferences.deletedAt)))
			.limit(1);
		if (!conf) throw new NotFoundError("conference");

		if (!user.isPlatformAdmin) {
			const [m] = await db
				.select({ role: userConferenceRoles.role })
				.from(userConferenceRoles)
				.where(
					and(
						eq(userConferenceRoles.userId, user.id),
						eq(userConferenceRoles.conferenceId, conf.id),
						eq(userConferenceRoles.isActive, true),
					),
				)
				.limit(1);
			if (!m) throw new NotFoundError("conference");
		}

		return c.json({ data: conf });
	},
);

conferencesRouter.post(
	"/",
	requireAuth,
	requirePlatformAdmin,
	zValidator("json", conferenceCreateSchema),
	async c => {
		const user = c.get("user")!;
		const input = c.req.valid("json");

		const created = await db.transaction(async tx => {
			const [existing] = await tx
				.select({ id: conferences.id })
				.from(conferences)
				.where(eq(conferences.slug, input.slug))
				.limit(1);
			if (existing) throw new ConflictError("slug already taken");

			const [conf] = await tx
				.insert(conferences)
				.values({
					...input,
					createdBy: user.id,
					updatedBy: user.id,
				})
				.returning();
			if (!conf) throw new BadRequestError("failed to create");

			await tx.insert(userConferenceRoles).values({
				userId: user.id,
				conferenceId: conf.id,
				role: "super_admin",
				isActive: true,
				acceptedAt: new Date(),
			});

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: "conference",
				entityId: conf.id,
				after: conf,
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return conf;
		});

		return c.json({ data: created }, 201);
	},
);

conferencesRouter.patch(
	"/:slug",
	requireAuth,
	zValidator("param", z.object({ slug: z.string() })),
	zValidator("json", conferenceUpdateSchema),
	async c => {
		const user = c.get("user")!;
		const { slug } = c.req.valid("param");
		const input = c.req.valid("json");

		const updated = await db.transaction(async tx => {
			const [conf] = await tx
				.select()
				.from(conferences)
				.where(and(eq(conferences.slug, slug), isNull(conferences.deletedAt)))
				.limit(1);
			if (!conf) throw new NotFoundError("conference");

			if (!user.isPlatformAdmin) {
				const [m] = await tx
					.select({ role: userConferenceRoles.role })
					.from(userConferenceRoles)
					.where(
						and(
							eq(userConferenceRoles.userId, user.id),
							eq(userConferenceRoles.conferenceId, conf.id),
							eq(userConferenceRoles.isActive, true),
						),
					)
					.limit(1);
				if (!m || (m.role !== "admin" && m.role !== "super_admin")) {
					throw new NotFoundError("conference");
				}
			}

			const [result] = await tx
				.update(conferences)
				.set({
					...input,
					updatedBy: user.id,
					updatedAt: new Date(),
				})
				.where(eq(conferences.id, conf.id))
				.returning();
			if (!result) throw new NotFoundError("conference");

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "conference",
				entityId: conf.id,
				before: conf,
				after: result,
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return result;
		});

		return c.json({ data: updated });
	},
);

conferencesRouter.delete(
	"/:slug",
	requireAuth,
	requirePlatformAdmin,
	zValidator("param", z.object({ slug: z.string() })),
	zValidator("query", z.object({ purge: z.coerce.boolean().optional() })),
	async c => {
		const user = c.get("user")!;
		const { slug } = c.req.valid("param");
		const { purge } = c.req.valid("query");

		const result = await db.transaction(async tx => {
			const [conf] = await tx
				.select()
				.from(conferences)
				.where(eq(conferences.slug, slug))
				.limit(1);
			if (!conf) throw new NotFoundError("conference");

			if (purge) {
				await tx.delete(conferences).where(eq(conferences.id, conf.id));
				await recordAudit(tx, {
					conferenceId: null,
					userId: user.id,
					action: "purge",
					entity: "conference",
					entityId: conf.id,
					before: conf,
					ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
					userAgent: c.req.header("user-agent") ?? null,
					requestId: c.get("requestId"),
				});
			} else {
				await tx
					.update(conferences)
					.set({ deletedAt: new Date(), deletedBy: user.id })
					.where(eq(conferences.id, conf.id));
				await recordAudit(tx, {
					conferenceId: conf.id,
					userId: user.id,
					action: "delete",
					entity: "conference",
					entityId: conf.id,
					before: conf,
					ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
					userAgent: c.req.header("user-agent") ?? null,
					requestId: c.get("requestId"),
				});
			}

			return { id: conf.id, purged: !!purge };
		});

		return c.json({ deleted: true, ...result });
	},
);
