import { z } from "zod";
import { LIMITS } from "@/constants";

export const uuidSchema = z.string().uuid();

export const paginationQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce
		.number()
		.int()
		.min(1)
		.max(LIMITS.PAGE_SIZE_MAX)
		.default(LIMITS.PAGE_SIZE_DEFAULT),
	sort: z.string().optional(),
	order: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export const customFieldsSchema = z.record(z.string(), z.any()).default({});

export const phoneSchema = z
	.string()
	.trim()
	.min(6)
	.max(32)
	.regex(/^[+0-9\s()-]+$/, "invalid phone number");

export const emailSchema = z.string().trim().toLowerCase().email().max(255);

export const isoDateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");
export const isoDatetimeSchema = z.string().datetime({ offset: true });

export const slugSchema = z
	.string()
	.trim()
	.toLowerCase()
	.regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be a valid slug")
	.max(64);

export const moneySchema = z
	.string()
	.regex(/^-?\d+(\.\d{1,2})?$/, "must be a money amount");
