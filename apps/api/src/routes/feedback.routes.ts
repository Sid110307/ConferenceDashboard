import { makeCrudRouter } from "@/lib/crud-factory";
import { feedback } from "@conference/db";
import { z } from "zod";

export const feedbackRouter = makeCrudRouter({
	table: feedback as any,
	entity: "feedback",
	searchColumns: [feedback.comments],
	defaultSort: feedback.submittedAt,
	createSchema: z.object({
		attendeeId: z.string().uuid().optional(),
		sessionId: z.string().uuid().optional(),
		rating: z.number().int().min(1).max(5).optional(),
		comments: z.string().max(5000).optional(),
		isPublic: z.boolean().default(false),
	}),
	updateSchema: z
		.object({
			attendeeId: z.string().uuid().nullable(),
			sessionId: z.string().uuid().nullable(),
			rating: z.number().int().min(1).max(5).nullable(),
			comments: z.string().max(5000).nullable(),
			isPublic: z.boolean(),
		})
		.partial(),
});
