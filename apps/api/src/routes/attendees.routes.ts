import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { validateCustomFields } from "@/lib/custom-fields";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { codes, prefixFromConference } from "@/lib/id";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { attendees } from "@conference/db";
import {
	attendeeBulkActionSchema,
	attendeeCreateSchema,
	attendeeListQuerySchema,
	attendeeUpdateSchema,
	LIMITS,
	paginationQuerySchema,
} from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const attendeesRouter = new Hono<AppContext>();

function clientIp(c: any): string | null {
	return (
		c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? null
	);
}

async function nextAttendeeCode(
	tx: any,
	conf: { id: string; slug: string; shortName: string | null },
): Promise<string> {
	const prefix = prefixFromConference({
		shortName: conf.shortName,
		slug: conf.slug,
	});

	const [row] = await tx
		.select({ n: sql<number>`count(*)::int` })
		.from(attendees)
		.where(eq(attendees.conferenceId, conf.id));
	const seq = (row?.n ?? 0) + 1;

	for (let attempt = 0; attempt < 20; attempt++) {
		const candidate = codes.attendee(prefix, seq + attempt);
		const [existing] = await tx
			.select({ id: attendees.id })
			.from(attendees)
			.where(and(eq(attendees.conferenceId, conf.id), eq(attendees.attendeeCode, candidate)))
			.limit(1);
		if (!existing) return candidate;
	}
	throw new BadRequestError("could not allocate attendee code");
}

attendeesRouter.get(
	"/",
	requireRole("viewer"),
	zValidator("query", paginationQuerySchema.merge(attendeeListQuerySchema)),
	async c => {
		const conf = c.get("conference")!;
		const q = c.req.valid("query");

		const whereParts = [eq(attendees.conferenceId, conf.id), isNull(attendees.deletedAt)];

		if (q.q) {
			const pattern = `%${q.q}%`;
			whereParts.push(
				or(
					ilike(attendees.name, pattern),
					ilike(attendees.email, pattern),
					ilike(attendees.phone, pattern),
					ilike(attendees.attendeeCode, pattern),
					ilike(attendees.institution, pattern),
				) as any,
			);
		}
		if (q.category) whereParts.push(eq(attendees.category, q.category));
		if (q.gender) whereParts.push(eq(attendees.gender, q.gender));
		if (q.prantha) whereParts.push(eq(attendees.prantha, q.prantha));
		if (q.city) whereParts.push(eq(attendees.city, q.city));
		if (q.state) whereParts.push(eq(attendees.state, q.state));
		if (q.registrationStatus)
			whereParts.push(eq(attendees.registrationStatus, q.registrationStatus));
		if (q.checkinStatus) whereParts.push(eq(attendees.checkinStatus, q.checkinStatus));
		if (typeof q.isVip === "boolean") whereParts.push(eq(attendees.isVip, q.isVip));
		if (q.tag) whereParts.push(sql`${q.tag} = ANY(${attendees.tags})`);

		const orderCol =
			q.sort === "name"
				? attendees.name
				: q.sort === "code"
					? attendees.attendeeCode
					: attendees.createdAt;
		const orderFn = q.order === "asc" ? asc : desc;
		const offset = (q.page - 1) * q.pageSize;

		const result = await withTenant(conf.id, async tx => {
			const data = await tx
				.select()
				.from(attendees)
				.where(and(...whereParts))
				.orderBy(orderFn(orderCol))
				.limit(q.pageSize)
				.offset(offset);
			const totals = await tx
				.select({ count: sql<number>`count(*)::int` })
				.from(attendees)
				.where(and(...whereParts));
			return { data, total: totals[0]?.count ?? 0 };
		});

		return c.json({
			data: result.data,
			pagination: {
				page: q.page,
				pageSize: q.pageSize,
				total: result.total,
				totalPages: Math.max(1, Math.ceil(result.total / q.pageSize)),
				hasNextPage: q.page * q.pageSize < result.total,
			},
		});
	},
);

attendeesRouter.get("/stats", requireRole("viewer"), async c => {
	const conf = c.get("conference")!;
	const result = await withTenant(conf.id, async tx => {
		const [row] = await tx
			.select({
				total: sql<number>`count(*)::int`,
				registered: sql<number>`count(*) FILTER (WHERE registration_status = 'registered')::int`,
				confirmed: sql<number>`count(*) FILTER (WHERE registration_status = 'confirmed')::int`,
				checkedIn: sql<number>`count(*) FILTER (WHERE checkin_status = 'checked_in')::int`,
				vip: sql<number>`count(*) FILTER (WHERE is_vip = true)::int`,
				male: sql<number>`count(*) FILTER (WHERE gender = 'male')::int`,
				female: sql<number>`count(*) FILTER (WHERE gender = 'female')::int`,
				students: sql<number>`count(*) FILTER (WHERE category = 'student')::int`,
				faculty: sql<number>`count(*) FILTER (WHERE category = 'faculty')::int`,
				speakers: sql<number>`count(*) FILTER (WHERE category = 'speaker')::int`,
				badgePrinted: sql<number>`count(*) FILTER (WHERE badge_printed = true)::int`,
				kitCollected: sql<number>`count(*) FILTER (WHERE kit_collected = true)::int`,
			})
			.from(attendees)
			.where(and(eq(attendees.conferenceId, conf.id), isNull(attendees.deletedAt)));
		return row;
	});
	return c.json({ data: result });
});

attendeesRouter.get(
	"/distinct/:field",
	requireRole("viewer"),
	zValidator(
		"param",
		z.object({
			field: z.enum(["prantha", "city", "state", "institution"]),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const { field } = c.req.valid("param");
		const col =
			field === "prantha"
				? attendees.prantha
				: field === "city"
					? attendees.city
					: field === "state"
						? attendees.state
						: attendees.institution;
		const rows = await withTenant(conf.id, async tx =>
			tx
				.selectDistinct({ value: col })
				.from(attendees)
				.where(
					and(
						eq(attendees.conferenceId, conf.id),
						isNull(attendees.deletedAt),
						sql`${col} IS NOT NULL`,
					),
				)
				.orderBy(asc(col)),
		);
		return c.json({ data: rows.map(r => r.value).filter(Boolean) });
	},
);

attendeesRouter.get(
	"/:id",
	requireRole("viewer"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const { id } = c.req.valid("param");
		const row = await withTenant(conf.id, async tx => {
			const [r] = await tx
				.select()
				.from(attendees)
				.where(
					and(
						eq(attendees.id, id),
						eq(attendees.conferenceId, conf.id),
						isNull(attendees.deletedAt),
					),
				)
				.limit(1);
			return r;
		});
		if (!row) throw new NotFoundError("attendee");
		return c.json({ data: row });
	},
);

attendeesRouter.post(
	"/",
	requireRole("editor"),
	zValidator("json", attendeeCreateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");

		const created = await withTenant(conf.id, async tx => {
			if (input.email) {
				const [dup] = await tx
					.select({ id: attendees.id })
					.from(attendees)
					.where(
						and(
							eq(attendees.conferenceId, conf.id),
							eq(attendees.email, input.email),
							isNull(attendees.deletedAt),
						),
					)
					.limit(1);
				if (dup) throw new ConflictError("attendee with this email exists");
			}

			const customFields = await validateCustomFields({
				tx,
				conferenceId: conf.id,
				entity: "attendees",
				payload: input.customFields,
			});

			const code = await nextAttendeeCode(tx, {
				id: conf.id,
				slug: conf.slug,
				shortName: conf.shortName,
			});

			const [row] = await tx
				.insert(attendees)
				.values({
					...input,
					customFields,
					attendeeCode: code,
					conferenceId: conf.id,
					createdBy: user.id,
					updatedBy: user.id,
				})
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: "attendee",
				entityId: row!.id,
				after: row,
				ip: clientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return row;
		});

		return c.json({ data: created }, 201);
	},
);

attendeesRouter.patch(
	"/:id",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", attendeeUpdateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const input = c.req.valid("json");

		const updated = await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(attendees)
				.where(
					and(
						eq(attendees.id, id),
						eq(attendees.conferenceId, conf.id),
						isNull(attendees.deletedAt),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("attendee");

			let customFields: Record<string, unknown> | undefined;
			if ("customFields" in input) {
				customFields = await validateCustomFields({
					tx,
					conferenceId: conf.id,
					entity: "attendees",
					payload: input.customFields,
					partial: true,
				});
			}

			const [row] = await tx
				.update(attendees)
				.set({
					...input,
					...(customFields !== undefined ? { customFields } : {}),
					updatedBy: user.id,
					updatedAt: new Date(),
				})
				.where(and(eq(attendees.id, id), eq(attendees.conferenceId, conf.id)))
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "attendee",
				entityId: id,
				before,
				after: row,
				ip: clientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return row;
		});

		return c.json({ data: updated });
	},
);

attendeesRouter.delete(
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
			throw new BadRequestError("purge requires super_admin");
		}

		await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(attendees)
				.where(and(eq(attendees.id, id), eq(attendees.conferenceId, conf.id)))
				.limit(1);
			if (!before) throw new NotFoundError("attendee");

			if (purge) {
				await tx
					.delete(attendees)
					.where(and(eq(attendees.id, id), eq(attendees.conferenceId, conf.id)));
				await recordAudit(tx, {
					conferenceId: conf.id,
					userId: user.id,
					action: "purge",
					entity: "attendee",
					entityId: id,
					before,
					ip: clientIp(c),
					userAgent: c.req.header("user-agent") ?? null,
					requestId: c.get("requestId"),
				});
			} else {
				await tx
					.update(attendees)
					.set({ deletedAt: new Date(), deletedBy: user.id })
					.where(and(eq(attendees.id, id), eq(attendees.conferenceId, conf.id)));
				await recordAudit(tx, {
					conferenceId: conf.id,
					userId: user.id,
					action: "delete",
					entity: "attendee",
					entityId: id,
					before,
					ip: clientIp(c),
					userAgent: c.req.header("user-agent") ?? null,
					requestId: c.get("requestId"),
				});
			}
		});

		return c.json({ deleted: true, purged: !!purge });
	},
);

attendeesRouter.post(
	"/:id/restore",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(attendees)
				.where(and(eq(attendees.id, id), eq(attendees.conferenceId, conf.id)))
				.limit(1);
			if (!before) throw new NotFoundError("attendee");
			if (!before.deletedAt) throw new BadRequestError("not deleted");
			await tx
				.update(attendees)
				.set({ deletedAt: null, deletedBy: null, updatedBy: user.id })
				.where(eq(attendees.id, id));
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "restore",
				entity: "attendee",
				entityId: id,
				before,
				ip: clientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
		});
		return c.json({ restored: true });
	},
);

attendeesRouter.post(
	"/:id/check-in",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator(
		"json",
		z
			.object({
				printBadge: z.boolean().optional(),
				kitCollected: z.boolean().optional(),
			})
			.optional(),
	),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const input = c.req.valid("json") ?? {};

		const row = await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(attendees)
				.where(
					and(
						eq(attendees.id, id),
						eq(attendees.conferenceId, conf.id),
						isNull(attendees.deletedAt),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("attendee");

			const [updated] = await tx
				.update(attendees)
				.set({
					checkinStatus: "checked_in",
					checkedInAt: before.checkedInAt ?? new Date(),
					checkedInByUserId: before.checkedInByUserId ?? user.id,
					badgePrinted: input.printBadge ?? before.badgePrinted,
					kitCollected: input.kitCollected ?? before.kitCollected,
					updatedBy: user.id,
					updatedAt: new Date(),
				})
				.where(eq(attendees.id, id))
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "attendee.check_in",
				entityId: id,
				before,
				after: updated,
				ip: clientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return updated;
		});

		return c.json({ data: row });
	},
);

attendeesRouter.post(
	"/:id/check-out",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");

		const row = await withTenant(conf.id, async tx => {
			const [updated] = await tx
				.update(attendees)
				.set({
					checkinStatus: "checked_out",
					checkedOutAt: new Date(),
					updatedBy: user.id,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(attendees.id, id),
						eq(attendees.conferenceId, conf.id),
						isNull(attendees.deletedAt),
					),
				)
				.returning();
			if (!updated) throw new NotFoundError("attendee");

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "attendee.check_out",
				entityId: id,
				after: updated,
				ip: clientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return updated;
		});

		return c.json({ data: row });
	},
);

attendeesRouter.post(
	"/bulk-action",
	requireRole("editor"),
	zValidator("json", attendeeBulkActionSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { ids, action } = c.req.valid("json");
		if (ids.length > LIMITS.MAX_AUDIENCE_PER_CAMPAIGN) {
			throw new BadRequestError("too many ids");
		}

		const setMap: Record<typeof action, any> = {
			check_in: {
				checkinStatus: "checked_in",
				checkedInAt: new Date(),
				checkedInByUserId: user.id,
			},
			check_out: { checkinStatus: "checked_out", checkedOutAt: new Date() },
			confirm: { registrationStatus: "confirmed" },
			cancel: { registrationStatus: "cancelled" },
			mark_badge_printed: { badgePrinted: true },
			mark_kit_collected: { kitCollected: true },
			delete: { deletedAt: new Date(), deletedBy: user.id },
			restore: { deletedAt: null, deletedBy: null },
		};

		const result = await withTenant(conf.id, async tx => {
			const updated = await tx
				.update(attendees)
				.set({
					...setMap[action],
					updatedBy: user.id,
					updatedAt: new Date(),
				})
				.where(and(eq(attendees.conferenceId, conf.id), inArray(attendees.id, ids)))
				.returning({ id: attendees.id });

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action:
					action === "delete" ? "delete" : action === "restore" ? "restore" : "update",
				entity: `attendee.bulk_${action}`,
				meta: { count: updated.length, action, ids },
				ip: clientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return updated.length;
		});

		return c.json({ updated: result });
	},
);
