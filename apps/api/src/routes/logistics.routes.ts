import { makeCrudRouter } from "@/lib/crud-factory";
import { logisticsItems } from "@conference/db";
import { z } from "zod";

const categories = [
	"kit",
	"printing",
	"av",
	"transport",
	"food",
	"venue",
	"certificate",
	"misc",
] as const;
const statuses = ["pending", "ordered", "received", "issued", "shortage", "cancelled"] as const;

export const logisticsRouter = makeCrudRouter({
	table: logisticsItems as any,
	entity: "logistics_item",
	searchColumns: [logisticsItems.itemName, logisticsItems.vendorName],
	defaultSort: logisticsItems.createdAt,
	createSchema: z.object({
		itemName: z.string().min(1).max(255),
		category: z.enum(categories).default("misc"),
		totalQuantity: z.number().int().min(0).default(0),
		issuedQuantity: z.number().int().min(0).default(0),
		vendorName: z.string().max(255).optional(),
		vendorContact: z.string().max(255).optional(),
		unitCost: z
			.string()
			.regex(/^-?\d+(\.\d{1,2})?$/)
			.optional(),
		currency: z.string().max(8).default("INR"),
		status: z.enum(statuses).default("pending"),
		notes: z.string().max(5000).optional(),
	}),
	updateSchema: z
		.object({
			itemName: z.string().min(1).max(255),
			category: z.enum(categories),
			totalQuantity: z.number().int().min(0),
			issuedQuantity: z.number().int().min(0),
			vendorName: z.string().max(255),
			vendorContact: z.string().max(255),
			unitCost: z
				.string()
				.regex(/^-?\d+(\.\d{1,2})?$/)
				.nullable(),
			currency: z.string().max(8),
			status: z.enum(statuses),
			notes: z.string().max(5000),
		})
		.partial(),
});
