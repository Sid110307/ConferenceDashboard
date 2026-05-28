import { makeCrudRouter } from "@/lib/crud-factory";
import { sponsors } from "@conference/db";
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
			name: z.string().min(1).max(255).optional(),
			tier: z.enum(["title", "platinum", "gold", "silver", "bronze", "partner"]).optional(),
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
			sortOrder: z.number().int().optional(),
			notes: z.string().max(2000).optional(),
		})
		.partial(),
	searchColumns: [sponsors.contactName, sponsors.name],
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
