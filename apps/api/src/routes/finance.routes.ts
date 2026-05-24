import type { AppContext } from "@/lib/context";
import { makeCrudRouter } from "@/lib/crud-factory";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { financeItems } from "@conference/db";
import { moneySchema } from "@conference/shared";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

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
			"accommodation",
			"food",
			"transport",
			"printing",
			"venue_av",
			"vip_event",
			"logistics",
			"honorarium",
			"misc",
		]),
		budgetAmount: z.string().regex(/^-?\d+(\.\d{1,2})?$/),
		actualAmount: z
			.string()
			.regex(/^-?\d+(\.\d{1,2})?$/)
			.optional(),
		paymentStatus: z
			.enum(["pending", "partial", "paid", "received", "cancelled", "refunded"])
			.default("pending"),
		vendorOrSource: z.string().max(255).optional(),
		invoiceNumber: z.string().max(64).optional(),
		paidAt: z.string().datetime({ offset: true }).optional(),
		notes: z.string().max(2000).optional(),
		customFields: z.record(z.string(), z.any()).default({}),
	}),
	updateSchema: z
		.object({
			itemName: z.string().min(1).max(255),
			itemType: z.enum(["income", "expense"]),
			category: z.enum([
				"registration",
				"sponsorship",
				"accommodation",
				"food",
				"transport",
				"printing",
				"venue_av",
				"vip_event",
				"logistics",
				"honorarium",
				"misc",
			]),
			budgetAmount: moneySchema,
			actualAmount: moneySchema.optional(),
			paymentStatus: z
				.enum(["pending", "partial", "paid", "received", "cancelled", "refunded"])
				.optional(),
			vendorOrSource: z.string().max(255).optional(),
			invoiceNumber: z.string().max(64).optional(),
			paidAt: z.string().datetime({ offset: true }).nullable().optional(),
			notes: z.string().max(2000).optional(),
			customFields: z.record(z.string(), z.any()).optional(),
		})
		.partial(),
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
