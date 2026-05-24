import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { makeCrudRouter } from "@/lib/crud-factory";
import { NotFoundError } from "@/lib/errors";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { committeeAssignments, committees, staff } from "@conference/db";
import {
	committeeAssignmentCreateSchema,
	committeeCreateSchema,
	committeeUpdateSchema,
	staffCreateSchema,
	staffUpdateSchema,
	staffWithCommitteesQuerySchema,
} from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const committeesRouter = makeCrudRouter({
	table: committees as any,
	entity: "committee",
	createSchema: committeeCreateSchema,
	updateSchema: committeeUpdateSchema,
	searchColumns: [committees.name, committees.slug],
	defaultSort: committees.sortOrder,
	sortMap: {
		name: committees.name,
		sortOrder: committees.sortOrder,
		createdAt: committees.createdAt,
	},
	listQuerySchema: z.object({
		isEnabled: z.coerce.boolean().optional(),
	}),
	applyFilters: filters => {
		const parts = [];
		if (typeof filters.isEnabled === "boolean") {
			parts.push(eq(committees.isEnabled, filters.isEnabled));
		}
		return parts;
	},
	extras: {
		memberCount: sql<number>`(select count(*)::int
		                          from ${committeeAssignments}
		                          where ${committeeAssignments.committeeId} = ${sql.raw(`"committees"."id"`)}
			                        and ${committeeAssignments.conferenceId} = ${sql.raw(`"committees"."conference_id"`)}
			                        and ${committeeAssignments.deletedAt} is null)`,
		leadCount: sql<number>`(select count(*)::int
		                        from ${committeeAssignments}
		                        where ${committeeAssignments.committeeId} = ${sql.raw(`"committees"."id"`)}
		                          and ${committeeAssignments.conferenceId} = ${sql.raw(`"committees"."conference_id"`)}
		                          and ${committeeAssignments.deletedAt} is null
		                          and ${committeeAssignments.isLead} = true)`,
	},
});

export const staffRouter = makeCrudRouter({
	table: staff as any,
	entity: "staff",
	customFieldEntity: "staff",
	createSchema: staffCreateSchema,
	updateSchema: staffUpdateSchema,
	searchColumns: [staff.name, staff.email, staff.phone],
	defaultSort: staff.name,
	sortMap: {
		name: staff.name,
		createdAt: staff.createdAt,
	},
	listQuerySchema: z.object({
		committeeSlug: z.string().optional(),
		gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
		status: z.enum(["active", "inactive", "on_break", "completed"]).optional(),
	}),
	applyFilters: filters => {
		const parts = [];
		if (typeof filters.gender === "string") {
			parts.push(eq(staff.gender, filters.gender as any));
		}
		if (typeof filters.status === "string") {
			parts.push(eq(staff.status, filters.status as any));
		}
		return parts;
	},
	beforeIdRoutes: router => {
		router.get(
			"/_with-committees",
			requireRole("viewer"),
			zValidator("query", staffWithCommitteesQuerySchema),
			async c => {
				const conf = c.get("conference")!;
				const q = c.req.valid("query");
				const baseWhere = [eq(staff.conferenceId, conf.id), isNull(staff.deletedAt)];

				if (q.q) {
					const pattern = `%${q.q}%`;
					baseWhere.push(
						or(
							ilike(staff.name, pattern),
							ilike(staff.email, pattern),
							ilike(staff.phone, pattern),
							ilike(staff.prantha, pattern),
						) as any,
					);
				}
				if (q.committeeSlug) {
					baseWhere.push(sql`exists (
						select 1
						from ${committeeAssignments} ca
						join ${committees} c on c.id = ca.committee_id
						where ca.staff_id = ${staff.id}
						  and ca.conference_id = ${conf.id}
						  and ca.deleted_at is null
						  and c.deleted_at is null
						  and c.slug = ${q.committeeSlug}
					)`);
				}
				if (q.gender) baseWhere.push(eq(staff.gender, q.gender));
				if (q.status) baseWhere.push(eq(staff.status, q.status));

				const offset = (q.page - 1) * q.pageSize;
				const result = await withTenant(conf.id, async tx => {
					const staffRows = await tx
						.select({
							id: staff.id,
							name: staff.name,
							phone: staff.phone,
							email: staff.email,
							gender: staff.gender,
							status: staff.status,
							prantha: staff.prantha,
						})
						.from(staff)
						.where(and(...baseWhere))
						.limit(q.pageSize)
						.offset(offset);

					const totals = await tx
						.select({ count: sql<number>`count(*)::int` })
						.from(staff)
						.where(and(...baseWhere));

					const staffIds = staffRows.map(s => s.id);
					const committeeRows =
						staffIds.length === 0
							? []
							: await tx
									.select({
										staffId: committeeAssignments.staffId,
										id: committees.id,
										slug: committees.slug,
										name: committees.name,
										role: committeeAssignments.roleInCommittee,
										isLead: committeeAssignments.isLead,
									})
									.from(committeeAssignments)
									.innerJoin(
										committees,
										and(
											eq(committees.id, committeeAssignments.committeeId),
											isNull(committees.deletedAt),
										),
									)
									.where(
										and(
											eq(committeeAssignments.conferenceId, conf.id),
											isNull(committeeAssignments.deletedAt),
											inArray(committeeAssignments.staffId, staffIds),
										),
									);

					return { staffRows, committeeRows, total: totals[0]?.count ?? 0 };
				});

				const committeesByStaff = new Map<string, any[]>();
				for (const r of result.committeeRows) {
					if (!committeesByStaff.has(r.staffId)) committeesByStaff.set(r.staffId, []);
					committeesByStaff.get(r.staffId)!.push({
						id: r.id,
						slug: r.slug,
						name: r.name,
						role: r.role,
						isLead: r.isLead,
					});
				}

				const data = result.staffRows.map(s => ({
					id: s.id,
					name: s.name,
					phone: s.phone,
					email: s.email,
					gender: s.gender,
					status: s.status,
					prantha: s.prantha,
					committees: committeesByStaff.get(s.id) ?? [],
				}));
				return c.json({
					data,
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
	},
});

export const assignmentsRouter = new Hono<AppContext>();

assignmentsRouter.get("/", requireRole("viewer"), async c => {
	const conf = c.get("conference")!;
	const url = new URL(c.req.url);
	const committeeId = url.searchParams.get("committeeId");
	const staffId = url.searchParams.get("staffId");

	const rows = await withTenant(conf.id, async tx => {
		const whereParts = [
			eq(committeeAssignments.conferenceId, conf.id),
			isNull(committeeAssignments.deletedAt),
		];
		if (committeeId) whereParts.push(eq(committeeAssignments.committeeId, committeeId));
		if (staffId) whereParts.push(eq(committeeAssignments.staffId, staffId));
		return tx
			.select({
				id: committeeAssignments.id,
				committeeId: committeeAssignments.committeeId,
				staffId: committeeAssignments.staffId,
				roleInCommittee: committeeAssignments.roleInCommittee,
				isLead: committeeAssignments.isLead,
				responsibilities: committeeAssignments.responsibilities,
				shiftStart: committeeAssignments.shiftStart,
				shiftEnd: committeeAssignments.shiftEnd,
				committeeName: committees.name,
				committeeSlug: committees.slug,
				staffName: staff.name,
			})
			.from(committeeAssignments)
			.innerJoin(committees, eq(committees.id, committeeAssignments.committeeId))
			.innerJoin(staff, eq(staff.id, committeeAssignments.staffId))
			.where(and(...whereParts));
	});

	return c.json({ data: rows });
});

assignmentsRouter.patch(
	"/:id",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", committeeAssignmentCreateSchema.partial()),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const input = c.req.valid("json");

		const updated = await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(committeeAssignments)
				.where(
					and(
						eq(committeeAssignments.id, id),
						eq(committeeAssignments.conferenceId, conf.id),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("assignment");

			if (input.committeeId) {
				const [com] = await tx
					.select({ id: committees.id })
					.from(committees)
					.where(
						and(
							eq(committees.id, input.committeeId),
							eq(committees.conferenceId, conf.id),
							isNull(committees.deletedAt),
						),
					)
					.limit(1);
				if (!com) throw new NotFoundError("committee");
			}
			if (input.staffId) {
				const [s] = await tx
					.select({ id: staff.id })
					.from(staff)
					.where(
						and(
							eq(staff.id, input.staffId),
							eq(staff.conferenceId, conf.id),
							isNull(staff.deletedAt),
						),
					)
					.limit(1);
				if (!s) throw new NotFoundError("staff");
			}

			const updateValues = {
				...input,
				...(input.shiftStart !== undefined && {
					shiftStart: input.shiftStart ? new Date(input.shiftStart) : null,
				}),
				...(input.shiftEnd !== undefined && {
					shiftEnd: input.shiftEnd ? new Date(input.shiftEnd) : null,
				}),
				updatedBy: user.id,
				updatedAt: new Date(),
			};

			const [row] = await tx
				.update(committeeAssignments)
				.set(updateValues)
				.where(eq(committeeAssignments.id, id))
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "committee_assignment",
				entityId: id,
				before,
				after: row,
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return row;
		});

		return c.json({ data: updated });
	},
);

assignmentsRouter.post(
	"/",
	requireRole("editor"),
	zValidator("json", committeeAssignmentCreateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");

		const created = await withTenant(conf.id, async tx => {
			const [com] = await tx
				.select({ id: committees.id })
				.from(committees)
				.where(
					and(
						eq(committees.id, input.committeeId),
						eq(committees.conferenceId, conf.id),
						isNull(committees.deletedAt),
					),
				)
				.limit(1);
			if (!com) throw new NotFoundError("committee");
			const [s] = await tx
				.select({ id: staff.id })
				.from(staff)
				.where(
					and(
						eq(staff.id, input.staffId),
						eq(staff.conferenceId, conf.id),
						isNull(staff.deletedAt),
					),
				)
				.limit(1);
			if (!s) throw new NotFoundError("staff");

			const [row] = await tx
				.insert(committeeAssignments)
				.values({
					...input,
					shiftStart: input.shiftStart ? new Date(input.shiftStart) : null,
					shiftEnd: input.shiftEnd ? new Date(input.shiftEnd) : null,
					conferenceId: conf.id,
					createdBy: user.id,
					updatedBy: user.id,
				})
				.onConflictDoUpdate({
					target: [committeeAssignments.committeeId, committeeAssignments.staffId],
					set: {
						roleInCommittee: input.roleInCommittee ?? null,
						isLead: input.isLead ?? false,
						responsibilities: input.responsibilities ?? null,
						shiftStart: input.shiftStart ? new Date(input.shiftStart) : null,
						shiftEnd: input.shiftEnd ? new Date(input.shiftEnd) : null,
						assignmentNotes: input.assignmentNotes ?? null,
						deletedAt: null,
						deletedBy: null,
						updatedBy: user.id,
						updatedAt: new Date(),
					},
				})
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: "committee_assignment",
				entityId: row!.id,
				after: row,
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return row;
		});

		return c.json({ data: created }, 201);
	},
);

assignmentsRouter.delete(
	"/:id",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");

		await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(committeeAssignments)
				.where(
					and(
						eq(committeeAssignments.id, id),
						eq(committeeAssignments.conferenceId, conf.id),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("assignment");

			await tx
				.update(committeeAssignments)
				.set({ deletedAt: new Date(), deletedBy: user.id })
				.where(eq(committeeAssignments.id, id));

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "delete",
				entity: "committee_assignment",
				entityId: id,
				before,
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
		});

		return c.json({ deleted: true });
	},
);
