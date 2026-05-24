import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { makeCrudRouter } from "@/lib/crud-factory";
import { validateCustomFields } from "@/lib/custom-fields";
import { NotFoundError } from "@/lib/errors";
import { getClientIp } from "@/lib/http";
import { notifyConference } from "@/lib/notify";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { attendees, travelSegments, vehicles } from "@conference/db";
import {
	paginationQuerySchema,
	travelManifestQuerySchema,
	travelSegmentCreateSchema,
	travelSegmentUpdateSchema,
	vehicleCreateSchema,
	vehicleUpdateSchema,
} from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const vehiclesRouter = makeCrudRouter({
	table: vehicles as any,
	entity: "vehicle",
	customFieldEntity: "vehicles",
	createSchema: vehicleCreateSchema,
	updateSchema: vehicleUpdateSchema,
	searchColumns: [vehicles.vehicleCode, vehicles.plateNumber, vehicles.driverName],
	defaultSort: vehicles.vehicleCode,
	sortMap: {
		code: vehicles.vehicleCode,
		createdAt: vehicles.createdAt,
	},
	listQuerySchema: z.object({
		status: z.enum(["available", "in_use", "maintenance", "unavailable"]).optional(),
		assignedCommitteeId: z.string().uuid().optional(),
	}),
	applyFilters: filters => {
		const parts = [];
		if (typeof filters.status === "string")
			parts.push(eq(vehicles.status, filters.status as any));
		if (typeof filters.assignedCommitteeId === "string")
			parts.push(eq(vehicles.assignedCommitteeId, filters.assignedCommitteeId as string));
		return parts;
	},
});

export const travelRouter = new Hono<AppContext>();

travelRouter.get(
	"/",
	requireRole("viewer"),
	zValidator(
		"query",
		paginationQuerySchema.extend({
			direction: z.enum(["arrival", "departure"]).optional(),
			pickupStatus: z
				.enum([
					"not_required",
					"scheduled",
					"en_route",
					"completed",
					"delayed",
					"cancelled",
				])
				.optional(),
			date: z
				.string()
				.regex(/^\d{4}-\d{2}-\d{2}$/)
				.optional(),
			gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
			q: z.string().trim().optional(),
			vehicleId: z.string().uuid().optional(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const q = c.req.valid("query");
		const whereParts = [
			eq(travelSegments.conferenceId, conf.id),
			isNull(travelSegments.deletedAt),
		];
		if (q.direction) whereParts.push(eq(travelSegments.direction, q.direction));
		if (q.pickupStatus) whereParts.push(eq(travelSegments.pickupStatus, q.pickupStatus));
		if (q.vehicleId) whereParts.push(eq(travelSegments.vehicleId, q.vehicleId));
		if (q.date) {
			whereParts.push(
				sql`(${travelSegments.scheduledTime} AT TIME ZONE 'UTC')::date = ${q.date}::date`,
			);
		}
		if (q.q) {
			whereParts.push(
				or(
					ilike(sql`${travelSegments.id}::text`, `%${q.q}%`),
					ilike(travelSegments.serviceNumber, `%${q.q}%`),
					ilike(travelSegments.pnr, `%${q.q}%`),
					ilike(travelSegments.carrier, `%${q.q}%`),
					ilike(attendees.name, `%${q.q}%`),
					ilike(attendees.attendeeCode, `%${q.q}%`),
					ilike(attendees.phone, `%${q.q}%`),
				) as any,
			);
		}

		const result = await withTenant(conf.id, async tx => {
			const baseQuery: any = tx
				.select({
					id: travelSegments.id,
					attendeeId: travelSegments.attendeeId,
					direction: travelSegments.direction,
					travelMode: travelSegments.travelMode,

					carrier: travelSegments.carrier,
					serviceNumber: travelSegments.serviceNumber,
					pnr: travelSegments.pnr,
					seatNumber: travelSegments.seatNumber,
					coachNumber: travelSegments.coachNumber,
					classOfTravel: travelSegments.classOfTravel,

					originCity: travelSegments.originCity,
					originLocation: travelSegments.originLocation,
					originTerminal: travelSegments.originTerminal,
					destinationCity: travelSegments.destinationCity,
					destinationLocation: travelSegments.destinationLocation,
					destinationTerminal: travelSegments.destinationTerminal,

					scheduledTime: travelSegments.scheduledTime,
					actualTime: travelSegments.actualTime,

					pickupRequired: travelSegments.pickupRequired,
					pickupStatus: travelSegments.pickupStatus,
					pickupPoint: travelSegments.pickupPoint,
					dropPoint: travelSegments.dropPoint,
					pickupScheduledAt: travelSegments.pickupScheduledAt,
					pickupCompletedAt: travelSegments.pickupCompletedAt,

					vehicleId: travelSegments.vehicleId,
					driverNameOverride: travelSegments.driverNameOverride,
					driverPhoneOverride: travelSegments.driverPhoneOverride,
					travelGroupCode: travelSegments.travelGroupCode,

					ticketFileId: travelSegments.ticketFileId,
					notes: travelSegments.notes,

					attendeeName: attendees.name,
					attendeeCode: attendees.attendeeCode,
					gender: attendees.gender,
					phone: attendees.phone,

					vehicleCode: vehicles.vehicleCode,
					vehicleType: vehicles.vehicleType,
					plateNumber: vehicles.plateNumber,
					driverName: sql<
						string | null
					>`coalesce(${travelSegments.driverNameOverride}, ${vehicles.driverName})`,
					driverPhone: sql<
						string | null
					>`coalesce(${travelSegments.driverPhoneOverride}, ${vehicles.driverPhone})`,
					vehicleLabel: sql<string | null>`
						case
							when ${vehicles.id} is null then null
							when ${vehicles.vehicleType} is not null
								then trim(${vehicles.vehicleType} || ' ' || coalesce(${vehicles.plateNumber}, ''))
							when ${vehicles.vehicleCode} is not null then ${vehicles.vehicleCode}
							else 'Vehicle'
							end
					`,
				})
				.from(travelSegments)
				.innerJoin(attendees, eq(attendees.id, travelSegments.attendeeId))
				.leftJoin(vehicles, eq(vehicles.id, travelSegments.vehicleId));

			let where = and(...whereParts);
			if (q.gender) where = and(where, eq(attendees.gender, q.gender));

			const data = await baseQuery
				.where(where)
				.orderBy(asc(travelSegments.scheduledTime))
				.limit(q.pageSize)
				.offset((q.page - 1) * q.pageSize);

			const totals = await tx
				.select({ count: sql<number>`count(*)::int` })
				.from(travelSegments)
				.innerJoin(attendees, eq(attendees.id, travelSegments.attendeeId))
				.where(where);

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

travelRouter.get(
	"/manifest",
	requireRole("viewer"),
	zValidator("query", travelManifestQuerySchema),
	async c => {
		const conf = c.get("conference")!;
		const q = c.req.valid("query");

		const whereParts: any[] = [
			eq(travelSegments.conferenceId, conf.id),
			eq(travelSegments.direction, q.direction),
			isNull(travelSegments.deletedAt),
		];
		if (q.travelMode) whereParts.push(eq(travelSegments.travelMode, q.travelMode));
		if (q.pickupStatus) whereParts.push(eq(travelSegments.pickupStatus, q.pickupStatus));
		if (q.date) {
			whereParts.push(
				sql`(${travelSegments.scheduledTime} AT TIME ZONE 'UTC')::date = ${q.date}::date`,
			);
		}

		const result = await withTenant(conf.id, async tx => {
			let baseWhere = and(...whereParts);
			if (q.gender) baseWhere = and(baseWhere, eq(attendees.gender, q.gender));

			return tx
				.select({
					id: travelSegments.id,
					direction: travelSegments.direction,
					travelMode: travelSegments.travelMode,
					carrier: travelSegments.carrier,
					serviceNumber: travelSegments.serviceNumber,
					pnr: travelSegments.pnr,
					seatNumber: travelSegments.seatNumber,
					originCity: travelSegments.originCity,
					originLocation: travelSegments.originLocation,
					destinationCity: travelSegments.destinationCity,
					destinationLocation: travelSegments.destinationLocation,
					scheduledTime: travelSegments.scheduledTime,
					status: travelSegments.status,
					pickupStatus: travelSegments.pickupStatus,
					pickupPoint: travelSegments.pickupPoint,
					dropPoint: travelSegments.dropPoint,
					vehicleId: travelSegments.vehicleId,
					vehicleCode: vehicles.vehicleCode,
					vehiclePlate: vehicles.plateNumber,
					driverName: vehicles.driverName,
					driverPhone: vehicles.driverPhone,
					attendeeId: attendees.id,
					attendeeCode: attendees.attendeeCode,
					attendeeName: attendees.name,
					attendeeGender: attendees.gender,
					attendeePhone: attendees.phone,
					attendeeIsVip: attendees.isVip,
					attendeeProtocolLevel: attendees.protocolLevel,
					attendeePrantha: attendees.prantha,
				})
				.from(travelSegments)
				.innerJoin(attendees, eq(attendees.id, travelSegments.attendeeId))
				.leftJoin(vehicles, eq(vehicles.id, travelSegments.vehicleId))
				.where(baseWhere)
				.orderBy(asc(travelSegments.scheduledTime));
		});

		return c.json({
			data: result,
			direction: q.direction,
			gender: q.gender,
			date: q.date,
			count: result.length,
		});
	},
);

travelRouter.post(
	"/",
	requireRole("editor"),
	zValidator("json", travelSegmentCreateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");

		const created = await withTenant(conf.id, async tx => {
			const [a] = await tx
				.select({ id: attendees.id })
				.from(attendees)
				.where(
					and(
						eq(attendees.id, input.attendeeId),
						eq(attendees.conferenceId, conf.id),
						isNull(attendees.deletedAt),
					),
				)
				.limit(1);
			if (!a) throw new NotFoundError("attendee");

			const customFields = await validateCustomFields({
				tx,
				conferenceId: conf.id,
				entity: "travel_segments",
				payload: input.customFields,
			});

			const [row] = await tx
				.insert(travelSegments)
				.values({
					...input,
					scheduledTime: input.scheduledTime ? new Date(input.scheduledTime) : null,
					actualTime: input.actualTime ? new Date(input.actualTime) : null,
					pickupScheduledAt: input.pickupScheduledAt
						? new Date(input.pickupScheduledAt)
						: null,
					pickupCompletedAt: input.pickupCompletedAt
						? new Date(input.pickupCompletedAt)
						: null,
					customFields,
					conferenceId: conf.id,
					createdBy: user.id,
					updatedBy: user.id,
				} as any)
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: "travel_segment",
				entityId: row!.id,
				after: row,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return row;
		});

		return c.json({ data: created }, 201);
	},
);

travelRouter.patch(
	"/:id",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", travelSegmentUpdateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const input = c.req.valid("json");

		const updated = await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(travelSegments)
				.where(
					and(
						eq(travelSegments.id, id),
						eq(travelSegments.conferenceId, conf.id),
						isNull(travelSegments.deletedAt),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("travel segment");

			let customFields: Record<string, unknown> | undefined;
			if ("customFields" in input) {
				customFields = await validateCustomFields({
					tx,
					conferenceId: conf.id,
					entity: "travel_segments",
					payload: input.customFields as any,
					partial: true,
				});
			}

			const next: any = { ...input, updatedBy: user.id, updatedAt: new Date() };
			if (customFields !== undefined) next.customFields = customFields;
			for (const k of [
				"scheduledTime",
				"actualTime",
				"pickupScheduledAt",
				"pickupCompletedAt",
			] as const) {
				if (k in input && (input as any)[k]) next[k] = new Date((input as any)[k]!);
			}

			const [row] = await tx
				.update(travelSegments)
				.set(next)
				.where(eq(travelSegments.id, id))
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "travel_segment",
				entityId: id,
				before,
				after: row,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			if (before.status !== "arrived" && row!.status === "arrived") {
				await notifyConference(tx, conf.id, {
					type: "travel.arrived",
					entity: "travel_segment",
					id,
					meta: {
						attendeeId: row!.attendeeId,
						direction: row!.direction,
						travelMode: row!.travelMode,
					},
				});
			}

			return row;
		});

		return c.json({ data: updated });
	},
);

travelRouter.delete(
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
				.from(travelSegments)
				.where(and(eq(travelSegments.id, id), eq(travelSegments.conferenceId, conf.id)))
				.limit(1);
			if (!before) throw new NotFoundError("travel segment");
			await tx
				.update(travelSegments)
				.set({ deletedAt: new Date(), deletedBy: user.id })
				.where(eq(travelSegments.id, id));
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "delete",
				entity: "travel_segment",
				entityId: id,
				before,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
		});
		return c.json({ deleted: true });
	},
);

travelRouter.post(
	"/assign-vehicle",
	requireRole("editor"),
	zValidator(
		"json",
		z.object({
			segmentIds: z.array(z.string().uuid()).min(1).max(500),
			vehicleId: z.string().uuid().nullable(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { segmentIds, vehicleId } = c.req.valid("json");

		const n = await withTenant(conf.id, async tx => {
			if (vehicleId) {
				const [v] = await tx
					.select({ id: vehicles.id })
					.from(vehicles)
					.where(
						and(
							eq(vehicles.id, vehicleId),
							eq(vehicles.conferenceId, conf.id),
							isNull(vehicles.deletedAt),
						),
					)
					.limit(1);
				if (!v) throw new NotFoundError("vehicle");
			}

			const updated = await tx
				.update(travelSegments)
				.set({ vehicleId, updatedBy: user.id, updatedAt: new Date() })
				.where(
					and(
						eq(travelSegments.conferenceId, conf.id),
						inArray(travelSegments.id, segmentIds),
					),
				)
				.returning({ id: travelSegments.id });

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "travel_segment.assign_vehicle",
				meta: { count: updated.length, vehicleId, segmentIds },
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			if (vehicleId && updated.length > 0) {
				await notifyConference(tx, conf.id, {
					type: "travel.assigned",
					entity: "travel_segment",
					meta: {
						count: updated.length,
						vehicleId,
						segmentIds: updated.map(r => r.id),
					},
				});
			}
			return updated.length;
		});

		return c.json({ updated: n });
	},
);
