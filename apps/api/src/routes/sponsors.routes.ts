import { makeCrudRouter } from "@/lib/crud-factory";
import { sponsors } from "@conference/db";
import { moneySchema } from "@conference/shared";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const sponsorsRouter = makeCrudRouter({
	table: sponsors as any,
	entity: "sponsor",
	createSchema: z.object({
		name: z.string().min(1).max(255),
		tier: z
			.enum(["title", "platinum", "gold", "silver", "bronze", "partner"])
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
		mouFileId: z.string().uuid().optional(),
		sortOrder: z.number().int().default(0),
		notes: z.string().max(2000).optional(),
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
	searchColumns: [sponsors.id, sponsors.name],
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
