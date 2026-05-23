import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { makeCrudRouter } from "@/lib/crud-factory";
import { NotFoundError } from "@/lib/errors";
import { codes } from "@/lib/id";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { financeItems, helpdeskIssues, sponsors, vipChecklist, vipGuests } from "@conference/db";
import { zValidator } from "@hono/zod-validator";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

function clientIp(c: any) {
	return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

const helpdeskCreate = z.object({
	attendeeId: z.string().uuid().optional(),
	reportedByName: z.string().max(255).optional(),
	reporterType: z.enum(["attendee", "staff", "guest", "vip", "anonymous"]).default("attendee"),
	category: z.enum([
		"transport",
		"accommodation",
		"food",
		"badge",
		"medical",
		"safety",
		"technical",
		"av",
		"general",
		"other",
	]),
	title: z.string().min(1).max(255),
	description: z.string().max(5000).optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
	assignedToStaffId: z.string().uuid().optional(),
	assignedCommitteeId: z.string().uuid().optional(),
});

const helpdeskUpdate = z.object({
	status: z.enum(["open", "in_progress", "resolved", "closed", "wont_fix"]).optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
	assignedToStaffId: z.string().uuid().nullable().optional(),
	assignedCommitteeId: z.string().uuid().nullable().optional(),
	resolutionNotes: z.string().max(5000).optional(),
	description: z.string().max(5000).optional(),
});

export const helpdeskRouter = new Hono<AppContext>();

const helpdeskCrud = makeCrudRouter({
	table: helpdeskIssues as any,
	entity: "helpdesk_issue",
	createSchema: helpdeskCreate,
	updateSchema: helpdeskUpdate,
	searchColumns: [helpdeskIssues.title, helpdeskIssues.issueCode],
	defaultSort: helpdeskIssues.createdAt,
	listQuerySchema: z.object({
		status: z.enum(["open", "in_progress", "resolved", "closed", "wont_fix"]).optional(),
		priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
		assignedCommitteeId: z.string().uuid().optional(),
	}),
	applyFilters: filters => {
		const parts = [];
		if (typeof filters.status === "string")
			parts.push(eq(helpdeskIssues.status, filters.status as any));
		if (typeof filters.priority === "string")
			parts.push(eq(helpdeskIssues.priority, filters.priority as any));
		if (typeof filters.assignedCommitteeId === "string")
			parts.push(
				eq(helpdeskIssues.assignedCommitteeId, filters.assignedCommitteeId as string),
			);
		return parts;
	},
});

helpdeskRouter.route("/", helpdeskCrud);

helpdeskRouter.post("/", requireRole("editor"), zValidator("json", helpdeskCreate), async c => {
	const conf = c.get("conference")!;
	const user = c.get("user")!;
	const input = c.req.valid("json");

	const row = await withTenant(conf.id, async tx => {
		const [{ n }] = await tx
			.select({ n: sql<number>`count(*)::int` })
			.from(helpdeskIssues)
			.where(eq(helpdeskIssues.conferenceId, conf.id));
		const issueCode = codes.issue((n ?? 0) + 1);

		const [created] = await tx
			.insert(helpdeskIssues)
			.values({
				...input,
				issueCode,
				conferenceId: conf.id,
				reportedByUserId: user.id,
				createdBy: user.id,
				updatedBy: user.id,
			} as any)
			.returning();

		await recordAudit(tx, {
			conferenceId: conf.id,
			userId: user.id,
			action: "create",
			entity: "helpdesk_issue",
			entityId: created!.id,
			after: created,
			ip: clientIp(c),
			userAgent: c.req.header("user-agent") ?? null,
			requestId: c.get("requestId"),
		});
		return created;
	});

	return c.json({ data: row }, 201);
});

helpdeskRouter.post(
	"/:id/transition",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator(
		"json",
		z.object({
			to: z.enum(["open", "in_progress", "resolved", "closed", "wont_fix"]),
			resolutionNotes: z.string().max(5000).optional(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const { to, resolutionNotes } = c.req.valid("json");

		const row = await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(helpdeskIssues)
				.where(and(eq(helpdeskIssues.id, id), eq(helpdeskIssues.conferenceId, conf.id)))
				.limit(1);
			if (!before) throw new NotFoundError("issue");
			const resolvedAt = to === "resolved" || to === "closed" ? new Date() : null;
			const [updated] = await tx
				.update(helpdeskIssues)
				.set({
					status: to,
					resolutionNotes: resolutionNotes ?? before.resolutionNotes,
					resolvedAt: resolvedAt ?? before.resolvedAt,
					updatedBy: user.id,
					updatedAt: new Date(),
				})
				.where(eq(helpdeskIssues.id, id))
				.returning();
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "helpdesk_issue.transition",
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

export const vipRouter = makeCrudRouter({
	table: vipGuests as any,
	entity: "vip_guest",
	customFieldEntity: "vip_guests",
	createSchema: z.object({
		attendeeId: z.string().uuid().optional(),
		name: z.string().min(1).max(255),
		salutation: z.string().max(16).optional(),
		designation: z.string().max(255).optional(),
		institution: z.string().max(255).optional(),
		protocolLevel: z.enum(["a_plus", "a", "b", "c"]).default("b"),
		assistantName: z.string().max(255).optional(),
		assistantPhone: z.string().max(32).optional(),
		assignedLiaisonStaffId: z.string().uuid().optional(),
		notes: z.string().max(5000).optional(),
		customFields: z.record(z.string(), z.any()).default({}),
	}),
	updateSchema: z
		.object({
			attendeeId: z.string().uuid().nullable(),
			name: z.string().min(1).max(255),
			salutation: z.string().max(16),
			designation: z.string().max(255),
			institution: z.string().max(255),
			protocolLevel: z.enum(["a_plus", "a", "b", "c"]),
			assistantName: z.string().max(255),
			assistantPhone: z.string().max(32),
			assignedLiaisonStaffId: z.string().uuid().nullable(),
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
	zValidator(
		"json",
		z.object({
			isDone: z.boolean().optional(),
			note: z.string().max(2000).optional(),
		}),
	),
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

export const financeItemsRouter = makeCrudRouter({
	table: financeItems as any,
	entity: "finance_item",
	customFieldEntity: "finance_items",
	createSchema: z.object({
		itemName: z.string().min(1).max(255),
		itemType: z.enum(["income", "expense"]),
		category: z.enum([
			"registration",
			"sponsorship",
			"venue_av",
			"food",
			"travel",
			"accommodation",
			"publication",
			"marketing",
			"awards",
			"misc",
		]),
		budgetAmount: z.string().regex(/^-?\d+(\.\d{1,2})?$/),
		actualAmount: z
			.string()
			.regex(/^-?\d+(\.\d{1,2})?$/)
			.optional(),
		paymentStatus: z
			.enum(["pending", "partial", "paid", "received", "overdue"])
			.default("pending"),
		vendorOrSource: z.string().max(255).optional(),
		invoiceNumber: z.string().max(64).optional(),
		dueDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.optional(),
		paidDate: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/)
			.optional(),
		notes: z.string().max(2000).optional(),
		customFields: z.record(z.string(), z.any()).default({}),
	}),
	updateSchema: z.object({}).passthrough(),
	searchColumns: [financeItems.itemName, financeItems.vendorOrSource],
	defaultSort: financeItems.createdAt,
	listQuerySchema: z.object({
		itemType: z.enum(["income", "expense"]).optional(),
		category: z.string().optional(),
		paymentStatus: z.string().optional(),
	}),
	applyFilters: filters => {
		const parts = [];
		if (typeof filters.itemType === "string")
			parts.push(eq(financeItems.itemType, filters.itemType as any));
		if (typeof filters.category === "string")
			parts.push(eq(financeItems.category, filters.category as any));
		if (typeof filters.paymentStatus === "string")
			parts.push(eq(financeItems.paymentStatus, filters.paymentStatus as any));
		return parts;
	},
	writeRole: "admin",
	deleteRole: "admin",
});

export const sponsorsRouter = makeCrudRouter({
	table: sponsors as any,
	entity: "sponsor",
	createSchema: z.object({
		name: z.string().min(1).max(255),
		tier: z
			.enum(["title", "platinum", "gold", "silver", "bronze", "partner", "media", "in_kind"])
			.default("partner"),
		contributionAmount: z
			.string()
			.regex(/^-?\d+(\.\d{1,2})?$/)
			.optional(),
		website: z.string().url().optional(),
		logoFileId: z.string().uuid().optional(),
		contactName: z.string().max(255).optional(),
		contactEmail: z.string().email().optional(),
		contactPhone: z.string().max(32).optional(),
		mouSigned: z.boolean().default(false),
		mouFileId: z.string().uuid().optional(),
		sortOrder: z.number().int().default(0),
		notes: z.string().max(2000).optional(),
	}),
	updateSchema: z.object({}).passthrough(),
	searchColumns: [sponsors.name],
	defaultSort: sponsors.sortOrder,
	listQuerySchema: z.object({
		tier: z.string().optional(),
	}),
	applyFilters: filters => {
		const parts = [];
		if (typeof filters.tier === "string") parts.push(eq(sponsors.tier, filters.tier as any));
		return parts;
	},
	writeRole: "admin",
});

export const financeSummaryRouter = new Hono<AppContext>();
financeSummaryRouter.get("/summary", requireRole("viewer"), async c => {
	const conf = c.get("conference")!;
	const result = await withTenant(conf.id, async tx => {
		const [row] = await tx
			.select({
				totalBudget: sql<string>`COALESCE(SUM(budget_amount), 0)::text`,
				totalActual: sql<string>`COALESCE(SUM(actual_amount), 0)::text`,
				incomeBudget: sql<string>`COALESCE(SUM(budget_amount) FILTER (WHERE item_type = 'income'), 0)::text`,
				incomeActual: sql<string>`COALESCE(SUM(actual_amount) FILTER (WHERE item_type = 'income'), 0)::text`,
				expenseBudget: sql<string>`COALESCE(SUM(budget_amount) FILTER (WHERE item_type = 'expense'), 0)::text`,
				expenseActual: sql<string>`COALESCE(SUM(actual_amount) FILTER (WHERE item_type = 'expense'), 0)::text`,
				count: sql<number>`count(*)::int`,
			})
			.from(financeItems)
			.where(and(eq(financeItems.conferenceId, conf.id), isNull(financeItems.deletedAt)));
		return row;
	});
	return c.json({ data: result });
});
