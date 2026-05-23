import { z } from "zod";

import { GENDERS, type Gender } from "../constants";
import { emailSchema, paginationQuerySchema, phoneSchema, slugSchema, uuidSchema } from "./common";

const genderEnum = z.enum(GENDERS as readonly [Gender, ...Gender[]]);
export const staffListQuerySchema = z.object({
	q: z.string().trim().optional(),
	gender: genderEnum.optional(),
	prantha: z.string().optional(),
	status: z.enum(["active", "inactive"]).optional(),
	committeeId: uuidSchema.optional(),
	isLead: z.coerce.boolean().optional(),
});

export const staffWithCommitteesQuerySchema = paginationQuerySchema.extend({
	q: z.string().trim().optional(),
	committeeSlug: slugSchema.optional(),
	gender: z.enum(GENDERS as readonly [Gender, ...Gender[]]).optional(),
	status: z.enum(["active", "inactive", "on_break", "completed"]).optional(),
});

export const staffWithCommitteesItemSchema = z.object({
	id: uuidSchema,
	name: z.string(),
	phone: phoneSchema.nullable().optional(),
	email: emailSchema.nullable().optional(),
	gender: z
		.enum(GENDERS as readonly [Gender, ...Gender[]])
		.nullable()
		.optional(),
	status: z.enum(["active", "inactive", "on_break", "completed"]).nullable().optional(),
	prantha: z.string().nullable().optional(),
	committees: z.array(
		z.object({
			id: uuidSchema,
			slug: slugSchema,
			name: z.string(),
			role: z.string().nullable().optional(),
			isLead: z.boolean(),
		}),
	),
});

export type StaffWithCommitteesItem = z.infer<typeof staffWithCommitteesItemSchema>;
