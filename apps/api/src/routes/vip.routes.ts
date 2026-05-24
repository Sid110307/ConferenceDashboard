import type { AppContext } from "@/lib/context";
import { makeCrudRouter } from "@/lib/crud-factory";
import { NotFoundError } from "@/lib/errors";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { vipChecklist, vipGuests } from "@conference/db";
import { zValidator } from "@hono/zod-validator";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const vipRouter = makeCrudRouter({
	table: vipGuests as any,
	entity: "vip_guest",
	customFieldEntity: "vip_guests",
	createSchema: z.object({
		attendeeId: z.string().uuid().optional(),
		name: z.string().min(1).max(255),
		designation: z.string().max(255).optional(),
		institution: z.string().max(255).optional(),
		protocolLevel: z.enum(["a_plus", "a", "b", "c"]).default("b"),
		notes: z.string().max(5000).optional(),
		customFields: z.record(z.string(), z.any()).default({}),
	}),
	updateSchema: z
		.object({
			attendeeId: z.string().uuid().nullable(),
			name: z.string().min(1).max(255),
			designation: z.string().max(255),
			institution: z.string().max(255),
			protocolLevel: z.enum(["a_plus", "a", "b", "c"]),
			notes: z.string().max(5000),
			customFields: z.record(z.string(), z.any()),
		})
		.partial(),
	searchColumns: [vipGuests.name, vipGuests.designation],
	defaultSort: vipGuests.name,
});

export const vipChecklistRouter = new Hono<AppContext>();

vipChecklistRouter.get(
	"/:vipId",
	requireRole("viewer"),
	zValidator("param", z.object({ vipId: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const { vipId } = c.req.valid("param");
		const rows = await withTenant(conf.id, async tx =>
			tx
				.select()
				.from(vipChecklist)
				.where(
					and(eq(vipChecklist.vipGuestId, vipId), eq(vipChecklist.conferenceId, conf.id)),
				),
		);
		return c.json({ data: rows });
	},
);

vipChecklistRouter.post(
	"/:vipId",
	requireRole("editor"),
	zValidator("param", z.object({ vipId: z.string().uuid() })),
	zValidator(
		"json",
		z.object({
			item: z.string().min(1).max(255),
			description: z.string().max(2000).optional(),
			sortOrder: z.number().int().default(0),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const { vipId } = c.req.valid("param");
		const input = c.req.valid("json");
		const [row] = await withTenant(conf.id, async tx =>
			tx
				.insert(vipChecklist)
				.values({
					conferenceId: conf.id,
					vipGuestId: vipId,
					...input,
				})
				.returning(),
		);
		return c.json({ data: row }, 201);
	},
);

vipChecklistRouter.patch(
	"/:vipId/:itemId",
	requireRole("editor"),
	zValidator("param", z.object({ vipId: z.string().uuid(), itemId: z.string().uuid() })),
	zValidator("json", z.object({ isDone: z.boolean().optional() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { vipId, itemId } = c.req.valid("param");
		const input = c.req.valid("json");
		const [row] = await withTenant(conf.id, async tx =>
			tx
				.update(vipChecklist)
				.set({
					...input,
					completedAt:
						input.isDone === true
							? new Date()
							: input.isDone === false
								? null
								: undefined,
					assignedStaffId: input.isDone === true ? user.id : null,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(vipChecklist.id, itemId),
						eq(vipChecklist.vipGuestId, vipId),
						eq(vipChecklist.conferenceId, conf.id),
					),
				)
				.returning(),
		);
		if (!row) throw new NotFoundError("checklist item");
		return c.json({ data: row });
	},
);
