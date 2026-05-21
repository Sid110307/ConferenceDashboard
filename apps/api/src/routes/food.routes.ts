import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { makeCrudRouter } from "@/lib/crud-factory";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { attendees, foodPlans, mealScans } from "@conference/db";
import { isoDateSchema } from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

function clientIp(c: any) {
	return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export const foodPlansRouter = makeCrudRouter({
	table: foodPlans as any,
	entity: "food_plan",
	createSchema: z.object({
		mealDate: isoDateSchema,
		dayLabel: z.string().max(32).optional(),
		breakfastCount: z.number().int().min(0).default(0),
		lunchCount: z.number().int().min(0).default(0),
		teaCount: z.number().int().min(0).default(0),
		dinnerCount: z.number().int().min(0).default(0),
		snacksCount: z.number().int().min(0).default(0),
		vegCount: z.number().int().min(0).default(0),
		nonvegCount: z.number().int().min(0).default(0),
		veganCount: z.number().int().min(0).default(0),
		jainCount: z.number().int().min(0).default(0),
		specialCount: z.number().int().min(0).default(0),
		venue: z.string().max(255).optional(),
		caterer: z.string().max(255).optional(),
		notes: z.string().max(2000).optional(),
	}),
	updateSchema: z.object({
		dayLabel: z.string().max(32).optional(),
		breakfastCount: z.number().int().min(0).optional(),
		lunchCount: z.number().int().min(0).optional(),
		teaCount: z.number().int().min(0).optional(),
		dinnerCount: z.number().int().min(0).optional(),
		snacksCount: z.number().int().min(0).optional(),
		vegCount: z.number().int().min(0).optional(),
		nonvegCount: z.number().int().min(0).optional(),
		veganCount: z.number().int().min(0).optional(),
		jainCount: z.number().int().min(0).optional(),
		specialCount: z.number().int().min(0).optional(),
		venue: z.string().max(255).optional(),
		caterer: z.string().max(255).optional(),
		notes: z.string().max(2000).optional(),
	}),
	searchColumns: [foodPlans.dayLabel, foodPlans.caterer],
	defaultSort: foodPlans.mealDate,
});

export const mealScansRouter = new Hono<AppContext>();

mealScansRouter.post(
	"/",
	requireRole("editor"),
	zValidator(
		"json",
		z.object({
			attendeeId: z.string().uuid(),
			mealDate: isoDateSchema,
			mealType: z.enum(["breakfast", "lunch", "tea", "dinner", "snacks"]),
			scanLocation: z.string().max(255).optional(),
			scanMethod: z.enum(["qr", "manual", "rfid", "face"]).default("qr"),
			notes: z.string().max(500).optional(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");

		const created = await withTenant(conf.id, async tx => {
			const [att] = await tx
				.select({ id: attendees.id, name: attendees.name })
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

			try {
				const [row] = await tx
					.insert(mealScans)
					.values({
						...input,
						conferenceId: conf.id,
						scannedByUserId: user.id,
						scannedAt: new Date(),
					})
					.returning();

				await recordAudit(tx, {
					conferenceId: conf.id,
					userId: user.id,
					action: "create",
					entity: "meal_scan",
					entityId: row!.id,
					after: row,
					ip: clientIp(c),
					userAgent: c.req.header("user-agent") ?? null,
					requestId: c.get("requestId"),
				});
				return row;
			} catch (err: any) {
				if (err?.code === "23505") {
					throw new BadRequestError("already scanned for this meal");
				}
				throw err;
			}
		});

		return c.json({ data: created }, 201);
	},
);

mealScansRouter.get(
	"/",
	requireRole("viewer"),
	zValidator(
		"query",
		z.object({
			mealDate: isoDateSchema.optional(),
			mealType: z.enum(["breakfast", "lunch", "tea", "dinner", "snacks"]).optional(),
			attendeeId: z.string().uuid().optional(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const q = c.req.valid("query");
		const rows = await withTenant(conf.id, async tx => {
			const parts: any[] = [eq(mealScans.conferenceId, conf.id)];
			if (q.mealDate) parts.push(eq(mealScans.mealDate, q.mealDate));
			if (q.mealType) parts.push(eq(mealScans.mealType, q.mealType));
			if (q.attendeeId) parts.push(eq(mealScans.attendeeId, q.attendeeId));

			return tx
				.select({
					id: mealScans.id,
					attendeeId: mealScans.attendeeId,
					attendeeName: attendees.name,
					attendeeCode: attendees.attendeeCode,
					mealDate: mealScans.mealDate,
					mealType: mealScans.mealType,
					scannedAt: mealScans.scannedAt,
					scanMethod: mealScans.scanMethod,
				})
				.from(mealScans)
				.innerJoin(attendees, eq(attendees.id, mealScans.attendeeId))
				.where(and(...parts))
				.orderBy(desc(mealScans.scannedAt))
				.limit(500);
		});
		return c.json({ data: rows });
	},
);

mealScansRouter.get(
	"/stats",
	requireRole("viewer"),
	zValidator("query", z.object({ mealDate: isoDateSchema.optional() })),
	async c => {
		const conf = c.get("conference")!;
		const { mealDate } = c.req.valid("query");
		const rows = await withTenant(conf.id, async tx => {
			const parts: any[] = [eq(mealScans.conferenceId, conf.id)];
			if (mealDate) parts.push(eq(mealScans.mealDate, mealDate));
			return tx
				.select({
					mealDate: mealScans.mealDate,
					mealType: mealScans.mealType,
					count: sql<number>`count(*)::int`,
				})
				.from(mealScans)
				.where(and(...parts))
				.groupBy(mealScans.mealDate, mealScans.mealType)
				.orderBy(mealScans.mealDate);
		});
		return c.json({ data: rows });
	},
);
