import { z } from "zod";
import { USER_ROLES, type UserRole, } from "@/constants";
import { emailSchema, isoDateSchema, slugSchema, } from "@/schemas/common";

export const signInSchema = z.object({
	email: emailSchema,
	password: z.string().min(8).max(128),
});

export const signUpSchema = signInSchema.extend({
	name: z.string().trim().min(1).max(120),
});

export const inviteUserSchema = z.object({
	email: emailSchema,
	role: z.enum(USER_ROLES as readonly [UserRole, ...UserRole[]]),
});


export const conferenceCreateSchema = z.object({
	slug: slugSchema,
	name: z.string().trim().min(1).max(255),
	shortName: z.string().trim().max(32).optional(),
	description: z.string().max(5000).optional(),
	startDate: isoDateSchema.optional(),
	endDate: isoDateSchema.optional(),
	timezone: z.string().default("Asia/Kolkata"),
	venueName: z.string().max(255).optional(),
	venueAddress: z.string().max(500).optional(),
	venueCity: z.string().max(120).optional(),
	venueState: z.string().max(120).optional(),
	venueCountry: z.string().max(120).optional(),
});

export const conferenceUpdateSchema = conferenceCreateSchema.partial().extend({
	conferenceStatus: z
		.enum(["draft", "active", "concluded", "archived"])
		.optional(),
	publicStatus: z.enum(["draft", "published", "archived"]).optional(),
	currentDay: z.number().int().min(1).max(30).nullable().optional(),
	settings: z.record(z.string(), z.any()).optional(),
	branding: z.record(z.string(), z.string()).optional(),
});

export type ConferenceCreateInput = z.infer<typeof conferenceCreateSchema>;
export type ConferenceUpdateInput = z.infer<typeof conferenceUpdateSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
