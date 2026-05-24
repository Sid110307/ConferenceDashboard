import { makeCrudRouter } from "@/lib/crud-factory";
import { announcements } from "@conference/db";
import { z } from "zod";

const priorities = ["low", "medium", "high", "urgent"] as const;

export const announcementsRouter = makeCrudRouter({
	table: announcements as any,
	entity: "announcement",
	searchColumns: [announcements.title, announcements.message],
	defaultSort: announcements.sortOrder,
	createSchema: z.object({
		title: z.string().min(1).max(255),
		message: z.string().min(1).max(5000),
		priority: z.enum(priorities).default("medium"),
		visibleFrom: z.string().datetime({ offset: true }).optional(),
		visibleUntil: z.string().datetime({ offset: true }).optional(),
		isPublic: z.boolean().default(true),
		isPinned: z.boolean().default(false),
		sortOrder: z.number().int().default(0),
	}),
	updateSchema: z
		.object({
			title: z.string().min(1).max(255),
			message: z.string().min(1).max(5000),
			priority: z.enum(priorities),
			visibleFrom: z.string().datetime({ offset: true }).nullable(),
			visibleUntil: z.string().datetime({ offset: true }).nullable(),
			isPublic: z.boolean(),
			isPinned: z.boolean(),
			sortOrder: z.number().int(),
		})
		.partial(),
});
