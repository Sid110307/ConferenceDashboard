import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { makeCrudRouter } from "@/lib/crud-factory";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import {
	accommodationBlocks,
	accommodationIssues,
	accommodationRooms,
	attendees,
	roomAllocations,
} from "@conference/db";
import {
	accommodationBlockCreateSchema,
	accommodationRoomCreateSchema,
	allocationCheckActionSchema,
	allocationCreateSchema,
} from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

function clientIp(c: any) {
	return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export const blocksRouter = makeCrudRouter({
	table: accommodationBlocks as any,
	entity: "accommodation_block",
	createSchema: accommodationBlockCreateSchema,
	updateSchema: accommodationBlockCreateSchema.partial(),
	searchColumns: [accommodationBlocks.code, accommodationBlocks.name],
	defaultSort: accommodationBlocks.sortOrder,
	sortMap: {
		name: accommodationBlocks.name,
		code: accommodationBlocks.code,
		createdAt: accommodationBlocks.createdAt,
	},
});

export const roomsRouter = makeCrudRouter({
	table: accommodationRooms as any,
	entity: "accommodation_room",
	customFieldEntity: "accommodation_rooms",
	createSchema: accommodationRoomCreateSchema,
	updateSchema: accommodationRoomCreateSchema.partial(),
	searchColumns: [accommodationRooms.roomNumber],
	defaultSort: accommodationRooms.roomNumber,
	sortMap: {
		roomNumber: accommodationRooms.roomNumber,
		floor: accommodationRooms.floor,
		createdAt: accommodationRooms.createdAt,
	},
	listQuerySchema: z.object({
		blockId: z.string().uuid().optional(),
		status: z
			.enum(["available", "reserved", "occupied", "maintenance", "out_of_service"])
			.optional(),
		genderPreference: z.enum(["male", "female", "mixed", "none"]).optional(),
	}),
	applyFilters: filters => {
		const parts = [];
		if (typeof filters.blockId === "string")
			parts.push(eq(accommodationRooms.blockId, filters.blockId as string));
		if (typeof filters.status === "string")
			parts.push(eq(accommodationRooms.status, filters.status as any));
		if (typeof filters.genderPreference === "string")
			parts.push(eq(accommodationRooms.genderPreference, filters.genderPreference as any));
		return parts;
	},
});

export const allocationsRouter = new Hono<AppContext>();

allocationsRouter.get("/", requireRole("viewer"), async c => {
	const conf = c.get("conference")!;
	const url = new URL(c.req.url);
	const roomId = url.searchParams.get("roomId");
	const attendeeId = url.searchParams.get("attendeeId");
	const status = url.searchParams.get("status");

	const rows = await withTenant(conf.id, async tx => {
		const parts: any[] = [
			eq(roomAllocations.conferenceId, conf.id),
			isNull(roomAllocations.deletedAt),
		];
		if (roomId) parts.push(eq(roomAllocations.roomId, roomId));
		if (attendeeId) parts.push(eq(roomAllocations.attendeeId, attendeeId));
		if (status) parts.push(eq(roomAllocations.status, status as any));

		return tx
			.select({
				id: roomAllocations.id,
				roomId: roomAllocations.roomId,
				attendeeId: roomAllocations.attendeeId,
				bedNumber: roomAllocations.bedNumber,
				plannedCheckinDate: roomAllocations.plannedCheckinDate,
				plannedCheckoutDate: roomAllocations.plannedCheckoutDate,
				checkinAt: roomAllocations.checkinAt,
				checkoutAt: roomAllocations.checkoutAt,
				keyIssued: roomAllocations.keyIssued,
				keyReturned: roomAllocations.keyReturned,
				status: roomAllocations.status,
				notes: roomAllocations.notes,
				roomNumber: accommodationRooms.roomNumber,
				roomFloor: accommodationRooms.floor,
				roomCapacity: accommodationRooms.capacity,
				blockId: accommodationRooms.blockId,
				attendeeName: attendees.name,
				attendeeCode: attendees.attendeeCode,
				attendeeGender: attendees.gender,
				attendeePhone: attendees.phone,
				attendeeIsVip: attendees.isVip,
			})
			.from(roomAllocations)
			.innerJoin(accommodationRooms, eq(accommodationRooms.id, roomAllocations.roomId))
			.innerJoin(attendees, eq(attendees.id, roomAllocations.attendeeId))
			.where(and(...parts));
	});

	return c.json({ data: rows });
});

allocationsRouter.post(
	"/",
	requireRole("editor"),
	zValidator("json", allocationCreateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");

		const created = await withTenant(conf.id, async tx => {
			const [room] = await tx
				.select()
				.from(accommodationRooms)
				.where(
					and(
						eq(accommodationRooms.id, input.roomId),
						eq(accommodationRooms.conferenceId, conf.id),
						isNull(accommodationRooms.deletedAt),
					),
				)
				.limit(1);
			if (!room) throw new NotFoundError("room");

			const [att] = await tx
				.select({ id: attendees.id, gender: attendees.gender })
				.from(attendees)
				.where(
					and(
						eq(attendees.id, input.attendeeId),
						eq(attendees.conferenceId, conf.id),
						isNull(attendees.deletedAt),
					),
				)
				.limit(1);
			if (!att) throw new NotFoundError("attendee");

			if ((room.occupiedCount ?? 0) >= room.capacity) {
				throw new BadRequestError("room is at capacity");
			}

			const [existing] = await tx
				.select({ id: roomAllocations.id })
				.from(roomAllocations)
				.where(
					and(
						eq(roomAllocations.attendeeId, input.attendeeId),
						eq(roomAllocations.conferenceId, conf.id),
						sql`${roomAllocations.status} IN ('pending','checked_in')`,
						isNull(roomAllocations.deletedAt),
					),
				)
				.limit(1);
			if (existing) {
				throw new BadRequestError("attendee already has an active allocation");
			}

			const [row] = await tx
				.insert(roomAllocations)
				.values({
					...input,
					conferenceId: conf.id,
					status: "pending",
					createdBy: user.id,
					updatedBy: user.id,
				})
				.returning();

			await tx
				.update(accommodationRooms)
				.set({
					occupiedCount: sql`${accommodationRooms.occupiedCount} + 1`,
					status: sql`CASE
						WHEN ${accommodationRooms.occupiedCount} + 1 >= ${accommodationRooms.capacity}
						  THEN 'occupied'::room_status
						ELSE 'reserved'::room_status END`,
				})
				.where(eq(accommodationRooms.id, room.id));

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: "room_allocation",
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

allocationsRouter.post(
	"/:id/action",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", allocationCheckActionSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");

		const updated = await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(roomAllocations)
				.where(
					and(
						eq(roomAllocations.id, id),
						eq(roomAllocations.conferenceId, conf.id),
						isNull(roomAllocations.deletedAt),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("allocation");

			const now = new Date();
			const setMap = {
				check_in: {
					status: "checked_in" as const,
					checkinAt: before.checkinAt ?? now,
					keyIssued: body.keyIssued ?? true,
					checkedInByUserId: before.checkedInByUserId ?? user.id,
				},
				check_out: {
					status: "checked_out" as const,
					checkoutAt: now,
					keyReturned: body.keyReturned ?? true,
				},
				cancel: { status: "cancelled" as const },
				no_show: { status: "no_show" as const },
			};

			const [row] = await tx
				.update(roomAllocations)
				.set({
					...setMap[body.action],
					notes: body.notes ?? before.notes,
					updatedBy: user.id,
					updatedAt: now,
				})
				.where(eq(roomAllocations.id, id))
				.returning();

			const wasActive = ["pending", "checked_in"].includes(before.status);
			const isActive = ["pending", "checked_in"].includes(row!.status);
			if (wasActive && !isActive) {
				await tx
					.update(accommodationRooms)
					.set({
						occupiedCount: sql`GREATEST(${accommodationRooms.occupiedCount} - 1, 0)`,
						status: sql`CASE
							WHEN GREATEST(${accommodationRooms.occupiedCount} - 1, 0) = 0 THEN 'available'::room_status
							WHEN GREATEST(${accommodationRooms.occupiedCount} - 1, 0) >= ${accommodationRooms.capacity} THEN 'occupied'::room_status
							ELSE 'reserved'::room_status END`,
					})
					.where(eq(accommodationRooms.id, before.roomId));
			}

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: `room_allocation.${body.action}`,
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

export const accommodationIssuesRouter = makeCrudRouter({
	table: accommodationIssues as any,
	entity: "accommodation_issue",
	createSchema: z.object({
		roomId: z.string().uuid(),
		category: z.enum([
			"plumbing",
			"electrical",
			"ac",
			"furniture",
			"cleaning",
			"linen",
			"other",
		]),
		title: z.string().min(1).max(255),
		description: z.string().max(2000).optional(),
		priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
	}),
	updateSchema: z.object({
		status: z.enum(["open", "in_progress", "resolved", "wont_fix"]).optional(),
		description: z.string().max(2000).optional(),
		priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
		resolutionNotes: z.string().max(2000).optional(),
	}),
	searchColumns: [accommodationIssues.title],
	defaultSort: accommodationIssues.createdAt,
	listQuerySchema: z.object({
		status: z.enum(["open", "in_progress", "resolved", "wont_fix"]).optional(),
		roomId: z.string().uuid().optional(),
	}),
	applyFilters: filters => {
		const parts = [];
		if (typeof filters.status === "string")
			parts.push(eq(accommodationIssues.status, filters.status as any));
		if (typeof filters.roomId === "string")
			parts.push(eq(accommodationIssues.roomId, filters.roomId as string));
		return parts;
	},
});
